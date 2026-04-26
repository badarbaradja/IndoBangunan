import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCartItems } from '@/lib/auth'
import { SaleInsert, SaleDetailInsert, PaymentInsert } from '@/types/database'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, customer_name, customer_phone, payment_method } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Keranjang belanja kosong' }, { status: 400 })
    }

    if (!['cash', 'qris', 'transfer'].includes(payment_method)) {
      return NextResponse.json({ error: 'Metode pembayaran tidak valid' }, { status: 400 })
    }

    // Endpoint public — gunakan Service Client untuk bypass RLS (Guest Order)
    const supabaseAdmin = createServiceClient()

    // 1. Validasi Harga & Hitung Total Server-Side (MUTLAK PRD 4.2)
    const validation = await validateCartItems(supabaseAdmin, items)
    if (!validation.valid || !validation.validatedItems) {
      console.error('[API ORDER] Validasi item gagal:', validation.error)
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const totalAmount = validation.subtotal ?? 0

    // 2. Generate Invoice Number via RPC
    const { data: invoiceNum, error: rpcError } = await supabaseAdmin.rpc('generate_invoice_number')
    if (rpcError || !invoiceNum) {
      console.error('[API ORDER] Error RPC generate_invoice_number:', JSON.stringify(rpcError, null, 2))
      return NextResponse.json({ error: 'Gagal membuat nomor tagihan' }, { status: 500 })
    }

    // 3. Cari Default Cashier ID menggunakan logika maybeSingle() yang aman
    let defaultCashierId: string | null = null

    // a. Coba cari cashier dulu
    const { data: cashierUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'cashier')
      .limit(1)
      .maybeSingle()

    let resolvedUser = cashierUser

    // b. Jika tidak ada, cari owner atau admin
    if (!resolvedUser) {
      const { data: fallbackUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('role', ['owner', 'admin'])
        .limit(1)
        .maybeSingle()
      resolvedUser = fallbackUser
    }

    // c. Validasi akhir
    if (!resolvedUser) {
      console.error('[API ORDER] Fatal Error: Tidak ada satupun user di database untuk fallback.')
      return NextResponse.json({ error: 'Sistem belum siap (Tidak ada user untuk penanggung jawab)' }, { status: 500 })
    }

    defaultCashierId = (resolvedUser as { id: string }).id

    // 4. Insert ke tabel sales
    const saleInsert: SaleInsert = {
      invoice_number: invoiceNum,
      cashier_id: defaultCashierId,
      customer_name: customer_name || 'Pelanggan Walk-in',
      customer_phone: customer_phone || null,
      payment_method: payment_method,
      total: totalAmount,
      subtotal: totalAmount,
      discount_amount: 0,
      tax_amount: 0,
      status: 'pending',
      transaction_type: 'sale',
    }

    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert(saleInsert)
      .select()
      .single()

    if (saleError || !sale) {
      console.error('[API ORDER] Gagal INSERT ke tabel sales. Detail:', JSON.stringify(saleError, null, 2))
      return NextResponse.json({ error: 'Gagal membuat pesanan (Sales)' }, { status: 500 })
    }

    // 5. Insert ke sales_details
    const saleDetails: SaleDetailInsert[] = validation.validatedItems.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      unit: item.unit,
      qty: item.qty,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount || 0,
      line_total: item.line_total,
    }))

    const { error: detailsError } = await supabaseAdmin.from('sales_details').insert(saleDetails)
    if (detailsError) {
      console.error('[API ORDER] Gagal INSERT ke tabel sales_details. Detail:', JSON.stringify(detailsError, null, 2))
      await supabaseAdmin.from('sales').update({ status: 'void' }).eq('id', sale.id) // Rollback
      return NextResponse.json({ error: 'Gagal menyimpan detail pesanan' }, { status: 500 })
    }

    // 6. Flow Pembayaran
    let gatewayPaymentUrl: string | null = null

    if (payment_method === 'cash') {
      // ── CASH: Tetap PENDING sampai Kasir konfirmasi di halaman Queue ──
      // Stok belum dipotong. Kasir perlu tekan "Terima Pembayaran" di /admin/queue
      const cashPayment: PaymentInsert = {
        sale_id: sale.id,
        amount: totalAmount,
        payment_method: 'cash',
        status: 'pending', // Berubah jadi 'success' saat kasir konfirmasi
      }

      const { error: paymentError } = await supabaseAdmin.from('payments').insert(cashPayment)
      if (paymentError) {
        console.error('[API ORDER] Gagal merekam pembayaran cash pending:', JSON.stringify(paymentError, null, 2))
      }
      // Status sale tetap 'pending' — TIDAK diubah ke 'success' di sini
    } else {
      // Flow Midtrans
      const serverKey = process.env.MIDTRANS_SERVER_KEY
      if (serverKey) {
        const authString = Buffer.from(`${serverKey}:`).toString('base64')
        // Midtrans WAJIB integer — bulatkan semua nilai harga
        const midtransOrderId = `${invoiceNum}-${Date.now()}` // unik, cegah duplikasi
        const payload = {
          transaction_details: {
            order_id: midtransOrderId,
            gross_amount: Math.round(totalAmount) // integer, bukan desimal
          },
          customer_details: {
            first_name: customer_name || 'Pelanggan Walk-in',
            phone: customer_phone || '00000000000'
          },
          item_details: validation.validatedItems.map(item => ({
            id: item.product_id,
            price: Math.round(item.unit_price), // integer, bukan desimal
            quantity: item.qty,
            name: item.product_name.substring(0, 50)
          }))
        }

        const midtransRes = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`
          },
          body: JSON.stringify(payload)
        })

        const midtransData = await midtransRes.json() as { redirect_url?: string }
        if (midtransRes.ok && midtransData.redirect_url) {
          gatewayPaymentUrl = midtransData.redirect_url
        } else {
          console.error('==== ALASAN MIDTRANS MENOLAK ====')
          console.error(JSON.stringify(midtransData, null, 2))
          console.error('=================================')
        }
      }

      const pendingPayment: PaymentInsert = {
        sale_id: sale.id,
        amount: totalAmount,
        payment_method: payment_method,
        status: 'pending',
        gateway_provider: 'midtrans',
        gateway_order_id: invoiceNum,
        gateway_payment_url: gatewayPaymentUrl,
      }

      const { error: pendingPaymentError } = await supabaseAdmin.from('payments').insert(pendingPayment)

      if (pendingPaymentError) {
        console.error('[API ORDER] Gagal INSERT payments (Pending):', JSON.stringify(pendingPaymentError, null, 2))
      }
    }

    // 7. Selesai
    return NextResponse.json({
      data: {
        sale_id: sale.id,
        invoice_number: invoiceNum,
        gateway_payment_url: gatewayPaymentUrl
      }
    }, { status: 201 })

  } catch (err) {
    console.error('Order API error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}