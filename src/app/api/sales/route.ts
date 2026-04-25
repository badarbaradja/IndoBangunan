// src/app/api/sales/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, logAudit, validateCartItems } from '@/lib/auth'
import { CreateSaleRequest } from '@/types/database'

/**
 * Fallback invoice number jika RPC belum dibuat di Supabase
 */
function generateInvoiceFallback(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
  return `INV-${dateStr}-${rand}`
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin', 'cashier'])
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth

  let body: CreateSaleRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { items, payment_method, customer_name, customer_phone, notes, offline_id, is_offline_created } = body

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 })
  }
  if (!payment_method) {
    return NextResponse.json({ error: 'Metode pembayaran wajib dipilih' }, { status: 400 })
  }

  // ── Idempotency untuk offline sync ──────────────────────────────
  if (offline_id) {
    const { data: existing } = await supabase
      .from('sales')
      .select('id, invoice_number')
      .eq('offline_id', offline_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { message: 'Already synced', sale_id: existing.id, invoice_number: existing.invoice_number },
        { status: 200 }
      )
    }
  }

  // ── Validasi harga di backend (TIDAK percaya frontend) ────────────
  const validation = await validateCartItems(supabase, items)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 })
  }

  const { validatedItems, subtotal } = validation

  // ── Validasi diskon ───────────────────────────────────────────────
  const discountAmount = Math.max(0, body.discount_amount ?? 0)
  const discountPercent = Math.max(0, Math.min(100, body.discount_percent ?? 0))

  let appliedDiscount = discountAmount
  if (discountPercent > 0) {
    appliedDiscount = (subtotal! * discountPercent) / 100
  }

  // Kasir max diskon 10%, owner/admin bebas
  const maxDiscountPercent = user.role === 'cashier' ? 10 : 100
  if (appliedDiscount > subtotal! * (maxDiscountPercent / 100)) {
    return NextResponse.json(
      { error: `Kasir tidak bisa memberikan diskon lebih dari ${maxDiscountPercent}%` },
      { status: 403 }
    )
  }

  const taxRate = 0 // Set 0.11 untuk PPN 11%
  const taxAmount = (subtotal! - appliedDiscount) * taxRate
  const total = subtotal! - appliedDiscount + taxAmount

  // ── Generate nomor invoice ───────────────────────────────────────
  let invoiceNumber: string
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('generate_invoice_number' as never)
    if (rpcError || !rpcData) throw new Error('RPC failed')
    invoiceNumber = String(rpcData)
  } catch {
    // Fallback jika RPC belum dijalankan di Supabase
    invoiceNumber = generateInvoiceFallback()
  }

  // ── Buat transaksi dengan status PENDING ──────────────────────────
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      invoice_number: invoiceNumber,
      cashier_id: user.id,
      customer_name: customer_name ?? null,
      customer_phone: customer_phone ?? null,
      subtotal: subtotal!,
      discount_amount: appliedDiscount,
      discount_percent: discountPercent,
      tax_amount: taxAmount,
      total,
      payment_method,
      status: 'pending',
      notes: notes ?? null,
      offline_id: offline_id ?? null,
      is_offline_created: is_offline_created ?? false,
      synced_at: is_offline_created ? new Date().toISOString() : null,
      transaction_type: 'sale',
    })
    .select()
    .single()

  if (saleError || !sale) {
    console.error('Sale creation error:', saleError)
    return NextResponse.json({ error: 'Gagal membuat transaksi', detail: saleError?.message }, { status: 500 })
  }

  // ── Insert detail item ────────────────────────────────────────────
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
    // Rollback: void sale yang baru dibuat
    await supabase.from('sales').update({ status: 'void' }).eq('id', sale.id)
    console.error('Sale details error:', detailsError)
    return NextResponse.json({ error: 'Gagal menyimpan detail transaksi', detail: detailsError.message }, { status: 500 })
  }

  // ── Tunai: langsung SUCCESS ───────────────────────────────────────
  let payment = null
  if (payment_method === 'cash') {
    const amountPaid = body.discount_amount ?? total

    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        sale_id: sale.id,
        payment_method: 'cash',
        amount: total,
        amount_paid: amountPaid,
        change_amount: Math.max(0, amountPaid - total),
        status: 'success',
        processed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment insert error:', paymentError)
    }

    payment = paymentData

    await supabase.from('sales').update({ status: 'success' }).eq('id', sale.id)

    // Kurangi stok (atomic, aman dari race condition)
    try {
      await supabase.rpc('process_sale_stock', { p_sale_id: sale.id } as never)
    } catch (stockError) {
      console.error('Stock update error (non-fatal):', stockError)
      await logAudit(supabase, {
        user_id: user.id,
        action: 'stock_update_failed',
        table_name: 'sales',
        record_id: sale.id,
        new_values: { error: String(stockError), invoice: invoiceNumber },
      })
    }
  } else {
    // QRIS / Transfer: buat payment PENDING, tunggu webhook
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

    payment = paymentData
  }

  await logAudit(supabase, {
    user_id: user.id,
    action: 'create_sale',
    table_name: 'sales',
    record_id: sale.id,
    new_values: { invoice_number: invoiceNumber, total, payment_method, item_count: items.length },
  })

  return NextResponse.json({ sale, payment }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin', 'cashier'])
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth
  const { searchParams } = new URL(req.url)

  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const offset = (page - 1) * limit
  const status = searchParams.get('status')
  const date_from = searchParams.get('date_from')
  const date_to = searchParams.get('date_to')

  let query = supabase
    .from('sales')
    .select('*, cashier:users(full_name, role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Kasir hanya bisa lihat transaksi sendiri
  if (user.role === 'cashier') {
    query = query.eq('cashier_id', user.id)
  }

  if (status) query = query.eq('status', status)
  if (date_from) query = query.gte('created_at', date_from)
  if (date_to) query = query.lte('created_at', date_to)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data transaksi', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ sales: data, total: count, page, limit })
}