import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      order_id, 
      status_code, 
      gross_amount, 
      signature_key, 
      transaction_status 
    } = body

    const serverKey = process.env.MIDTRANS_SERVER_KEY

    if (!serverKey) {
      console.error('Webhook error: MIDTRANS_SERVER_KEY not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 1. Verifikasi Signature Key (Keamanan)
    const hashData = `${order_id}${status_code}${gross_amount}${serverKey}`
    const expectedSignature = crypto.createHash('sha512').update(hashData).digest('hex')

    if (signature_key !== expectedSignature) {
      console.error('Webhook error: Invalid signature')
      return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // 2. Ambil data payment berdasarkan gateway_order_id
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, sale_id, processed_at, status')
      .eq('gateway_order_id', order_id)
      .single()

    if (paymentError || !payment) {
      console.error('Webhook error: Payment record not found for order_id:', order_id)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Idempotency check: Cegah pemrosesan ganda
    if (payment.processed_at && payment.status === 'success') {
      console.log(`Webhook info: Payment ${order_id} already processed.`)
      return NextResponse.json({ status: 'already_processed' }, { status: 200 })
    }

    // 3. Eksekusi Berdasarkan Status Midtrans
    const isSuccess = transaction_status === 'settlement' || transaction_status === 'capture'
    const isFailed = transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire'

    if (isSuccess) {
      // a. Update status pembayaran menjadi success
      await supabase
        .from('payments')
        .update({
          status: 'success',
          processed_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      // b. Update status pesanan (sales) menjadi success
      await supabase
        .from('sales')
        .update({ status: 'success' })
        .eq('id', payment.sale_id)

      // c. WAJIB: Potong stok barang karena pembayaran telah lunas
      const { error: rpcError } = await supabase.rpc('process_sale_stock', { p_sale_id: payment.sale_id })
      if (rpcError) {
        console.error('Webhook RPC Error (process_sale_stock):', rpcError)
        // Jangan return error agar Midtrans tetap menerima 200, log error ditangani manual
      }

      console.log(`Webhook success: Order ${order_id} settled and stock deducted.`)
      
    } else if (isFailed) {
      // Jika pembayaran dibatalkan atau kedaluwarsa
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id)

      await supabase
        .from('sales')
        .update({ status: 'void' })
        .eq('id', payment.sale_id)

      console.log(`Webhook info: Order ${order_id} failed/expired. Marked as void.`)
    } else {
      // Status 'pending' dikirim Midtrans saat customer memilih metode pembayaran tapi belum bayar.
      // Kita abaikan karena dari awal sudah diset 'pending' di database kita.
      console.log(`Webhook info: Order ${order_id} status updated to ${transaction_status}.`)
    }

    // Wajib respons 200 OK ke Midtrans agar tidak melakukan retry terus menerus
    return NextResponse.json({ status: 'ok' }, { status: 200 })

  } catch (err) {
    console.error('Webhook parsing error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}