// app/api/sales/void/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, logAudit } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin'])
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth

  const { sale_id, reason } = await req.json()

  if (!sale_id || !reason) {
    return NextResponse.json({ error: 'sale_id and reason required' }, { status: 400 })
  }

  // Fetch original sale
  const { data: originalSale } = await supabase
    .from('sales')
    .select('*, details:sales_details(*)')
    .eq('id', sale_id)
    .single()

  if (!originalSale) {
    return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
  }

  if (originalSale.status === 'void') {
    return NextResponse.json({ error: 'Sale already voided' }, { status: 409 })
  }

  if (originalSale.status !== 'success') {
    return NextResponse.json({ error: 'Only successful sales can be voided' }, { status: 422 })
  }

  if (originalSale.transaction_type !== 'sale') {
    return NextResponse.json({ error: 'Cannot void a void/return transaction' }, { status: 422 })
  }

  // Generate void invoice number
  const { data: invoiceData } = await supabase.rpc('generate_invoice_number' as never)
  const voidInvoiceNumber = `VOID-${invoiceData}`

  // Create VOID transaction (append-only - DO NOT edit original)
  const { data: voidSale, error: voidError } = await supabase
    .from('sales')
    .insert({
      invoice_number: voidInvoiceNumber,
      cashier_id: user.id,
      customer_name: originalSale.customer_name,
      customer_phone: originalSale.customer_phone,
      subtotal: -originalSale.subtotal,
      discount_amount: -originalSale.discount_amount,
      discount_percent: originalSale.discount_percent,
      tax_amount: -originalSale.tax_amount,
      total: -originalSale.total,
      payment_method: originalSale.payment_method,
      status: 'void',
      notes: `VOID of ${originalSale.invoice_number}: ${reason}`,
      original_sale_id: sale_id,
      transaction_type: 'void',
    })
    .select()
    .single()

  if (voidError || !voidSale) {
    return NextResponse.json({ error: 'Failed to create void transaction' }, { status: 500 })
  }

  // Reverse stock (return items to inventory)
  for (const detail of (originalSale.details ?? [])) {
    try {
      await supabase.rpc('update_stock_atomic' as never, {
        p_product_id: detail.product_id,
        p_qty_change: detail.qty, // positive = return to stock
        p_movement_type: 'void_return',
        p_reference_type: 'void',
        p_reference_id: voidSale.id,
        p_performed_by: user.id,
        p_notes: `Void: ${voidInvoiceNumber}`,
      } as never)
    } catch (stockErr) {
      console.error('Stock reversal error:', stockErr)
    }
  }

  // Mark original sale as void
  await supabase
    .from('sales')
    .update({ status: 'void' })
    .eq('id', sale_id)

  // Refund payment if applicable
  await supabase
    .from('payments')
    .update({ status: 'refunded' })
    .eq('sale_id', sale_id)

  await logAudit(supabase, {
    user_id: user.id,
    action: 'void_sale',
    table_name: 'sales',
    record_id: sale_id,
    old_values: { status: 'success' },
    new_values: { status: 'void', void_invoice: voidInvoiceNumber, reason },
  })

  return NextResponse.json({ void_sale: voidSale, original_sale_id: sale_id })
}