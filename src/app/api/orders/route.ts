import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCartItems } from '@/lib/auth'

function generateInvoiceFallback(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
  return `INV-${dateStr}-${rand}`
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { items, payment_method, customer_name, customer_phone } = body

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 })
  }
  if (!payment_method) {
    return NextResponse.json({ error: 'Metode pembayaran wajib dipilih' }, { status: 400 })
  }

  // Get a system user (owner/admin) to assign as cashier for self-service
  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single()

  // Validasi item dan harga dari backend
  const validation = await validateCartItems(supabase, items)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 })
  }

  const { validatedItems, subtotal } = validation
  const total = subtotal!

  let invoiceNumber: string
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('generate_invoice_number' as never)
    if (rpcError || !rpcData) throw new Error('RPC failed')
    invoiceNumber = String(rpcData)
  } catch {
    invoiceNumber = generateInvoiceFallback()
  }

  // Insert Sale (PENDING)
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      invoice_number: invoiceNumber,
      cashier_id: adminUser?.id || '00000000-0000-0000-0000-000000000000', // Fallback
      customer_name: customer_name ?? null,
      customer_phone: customer_phone ?? null,
      subtotal: total,
      discount_amount: 0,
      discount_percent: 0,
      tax_amount: 0,
      total,
      payment_method,
      status: 'pending',
      notes: 'Self-Service Order',
      transaction_type: 'sale',
    })
    .select()
    .single()

  if (saleError || !sale) {
    console.error('Sale creation error:', saleError)
    return NextResponse.json({ error: 'Gagal membuat transaksi' }, { status: 500 })
  }

  // Insert Details
  const { error: detailsError } = await supabase.from('sales_details').insert(
    validatedItems!.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      unit: item.unit,
      qty: item.qty,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount,
      line_total: item.line_total,
    }))
  )

  if (detailsError) {
    await supabase.from('sales').update({ status: 'void' }).eq('id', sale.id)
    return NextResponse.json({ error: 'Gagal menyimpan detail transaksi' }, { status: 500 })
  }

  // Create pending payment
  const { data: paymentData } = await supabase
    .from('payments')
    .insert({
      sale_id: sale.id,
      payment_method,
      amount: total,
      status: 'pending',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  return NextResponse.json({ 
    sale_id: sale.id,
    invoice_number: invoiceNumber, 
    total,
    payment: paymentData
  }, { status: 201 })
}
