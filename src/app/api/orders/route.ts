import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCartItems } from '@/lib/auth'

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

    // Endpoint public, gunakan Service Client
    const supabase = createServiceClient()

    // 1. Validasi Harga & Hitung Total Server-Side (MUTLAK PRD 4.2)
    const validation = await validateCartItems(supabase, items)
    if (!validation.valid || !validation.validatedItems) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const totalAmount = validation.subtotal ?? 0

    // 2. Generate Invoice Number via RPC
    const { data: invoiceNum, error: rpcError } = await supabase.rpc('generate_invoice_number')
    if (rpcError || !invoiceNum) {
      console.error('Error generating invoice number:', rpcError)
      return NextResponse.json({ error: 'Gagal membuat nomor tagihan' }, { status: 500 })
    }

    // 3. Insert ke tabel sales (status awal: pending)
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        invoice_number: invoiceNum,
        customer_name: customer_name || 'Pelanggan Walk-in',
        customer_phone: customer_phone || null,
        total_amount: totalAmount,
        status: 'pending'
      })
      .select()
      .single()

    if (saleError) {
      console.error('Error insert sale:', saleError)
      return NextResponse.json({ error: 'Gagal membuat pesanan' }, { status: 500 })
    }

    // 4. Insert ke sales_details
    const saleDetails = validation.validatedItems.map(item => ({
      sale_id: sale.id,
      product_id: item.product_id,
      qty: item.qty,
      unit_price: item.unit_price,
      subtotal: item.line_total
    }))

    const { error: detailsError } = await supabase.from('sales_details').insert(saleDetails)
    if (detailsError) {
      console.error('Error insert sales details:', detailsError)
      // Attempt rollback best-effort
      await supabase.from('sales').delete().eq('id', sale.id)
      return NextResponse.json({ error: 'Gagal menyimpan detail pesanan' }, { status: 500 })
    }

    // 5. Flow Pembayaran (PRD 4.3)
    let gatewayPaymentUrl = null

    if (payment_method === 'cash') {
      // Pembayaran cash di kasir -> asumsikan sukses (karena ini order public, tapi kita akan ubah status sukses untuk testing cash)
      // Sesuai PRD: Jika 'cash', update sales.status = 'success', insert payment 'success', dan potong stok.
      await supabase.from('sales').update({ status: 'success' }).eq('id', sale.id)
      
      await supabase.from('payments').insert({
        sale_id: sale.id,
        amount: totalAmount,
        payment_method: 'cash',
        status: 'success',
        processed_at: new Date().toISOString()
      })

      // Memotong stok karena pembayaran sukses
      const { error: rpcStockError } = await supabase.rpc('process_sale_stock', { p_sale_id: sale.id })
      if (rpcStockError) {
         console.error('Error memotong stok:', rpcStockError)
         // Tetap biarkan berjalan, error di log
      }
    } else {
      // Pembayaran QRIS/Transfer -> integrasi Midtrans Snap API
      const serverKey = process.env.MIDTRANS_SERVER_KEY
      
      if (serverKey) {
        const authString = Buffer.from(`${serverKey}:`).toString('base64')
        const payload = {
          transaction_details: {
            order_id: invoiceNum,
            gross_amount: totalAmount
          },
          customer_details: {
            first_name: customer_name || 'Pelanggan Walk-in',
            phone: customer_phone || '00000000000'
          },
          item_details: validation.validatedItems.map(item => ({
            id: item.product_id,
            price: item.unit_price,
            quantity: item.qty,
            name: item.product_name.substring(0, 50) // Midtrans batasi 50 karakter
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

        const midtransData = await midtransRes.json()

        if (midtransRes.ok && midtransData.redirect_url) {
          gatewayPaymentUrl = midtransData.redirect_url
        } else {
          console.error('Midtrans API error:', midtransData)
        }
      } else {
        console.warn('MIDTRANS_SERVER_KEY is missing, skipping gateway integration')
      }

      await supabase.from('payments').insert({
        sale_id: sale.id,
        amount: totalAmount,
        payment_method: payment_method,
        status: 'pending',
        gateway_provider: 'midtrans',
        gateway_order_id: invoiceNum,
        gateway_payment_url: gatewayPaymentUrl
      })
    }

    // 6. Return Data
    return NextResponse.json({ 
      data: {
        sale_id: sale.id,
        invoice_number: invoiceNum,
        gateway_payment_url: gatewayPaymentUrl
      }
    }, { status: 201 })

  } catch (err) {
    console.error('Order API error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem yang tidak terduga' }, { status: 500 })
  }
}
