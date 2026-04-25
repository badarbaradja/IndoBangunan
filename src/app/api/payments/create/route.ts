// app/api/payments/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin', 'cashier'])
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth
  const { sale_id, amount_paid, idempotency_key } = await req.json()

  if (!sale_id) {
    return NextResponse.json({ error: 'sale_id required' }, { status: 400 })
  }

  // Fetch sale
  const { data: sale } = await supabase
    .from('sales')
    .select('*')
    .eq('id', sale_id)
    .single()

  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
  if (sale.status !== 'pending') {
    return NextResponse.json({ error: 'Sale is not pending' }, { status: 409 })
  }

  // Check for existing payment (idempotency - prevent double click)
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('*')
    .eq('sale_id', sale_id)
    .eq('status', 'pending')
    .single()

  if (existingPayment?.gateway_payment_url) {
    // Return existing pending payment (double-click protection)
    return NextResponse.json({ payment: existingPayment }, { status: 200 })
  }

  if (sale.payment_method === 'cash') {
    // Cash payment - validate amount_paid
    if (!amount_paid || amount_paid < sale.total) {
      return NextResponse.json(
        { error: `Insufficient cash. Required: ${sale.total}, Received: ${amount_paid}` },
        { status: 422 }
      )
    }

    // Update existing pending payment or create new one
    if (existingPayment) {
      const { data: payment } = await supabase
        .from('payments')
        .update({
          amount_paid,
          change_amount: amount_paid - sale.total,
          status: 'success',
          processed_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id)
        .select()
        .single()

      await supabase.from('sales').update({ status: 'success' }).eq('id', sale_id)
      await supabase.rpc('process_sale_stock', { p_sale_id: sale_id } as never)

      return NextResponse.json({ payment })
    }
  }

  // For QRIS/Transfer: initiate gateway
  if (sale.payment_method === 'qris' || sale.payment_method === 'transfer') {
    const gatewayResult = await initiateGatewayPayment(sale)

    const { data: payment } = await supabase
      .from('payments')
      .update({
        gateway_provider: gatewayResult.provider,
        gateway_order_id: gatewayResult.order_id,
        gateway_transaction_id: gatewayResult.transaction_id,
        gateway_payment_url: gatewayResult.payment_url,
        gateway_qr_string: gatewayResult.qr_string,
        idempotency_key: idempotency_key ?? existingPayment?.idempotency_key,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .eq('id', existingPayment!.id)
      .select()
      .single()

    return NextResponse.json({ payment })
  }

  return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 })
}

// Gateway integration
async function initiateGatewayPayment(sale: {
  id: string
  invoice_number: string
  total: number
  customer_name: string | null
  payment_method: string
}) {
  // Use Midtrans in production
  const serverKey = process.env.MIDTRANS_SERVER_KEY!
  const isProduction = process.env.NODE_ENV === 'production'
  const baseUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1'

  const orderId = `${sale.invoice_number}-${Date.now()}`

  const payload = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(sale.total),
    },
    customer_details: {
      first_name: sale.customer_name ?? 'Customer',
    },
    payment_type: sale.payment_method === 'qris' ? 'qris' : 'bank_transfer',
    ...(sale.payment_method === 'qris' && {
      qris: { acquirer: 'gopay' },
    }),
    ...(sale.payment_method === 'transfer' && {
      bank_transfer: { bank: 'bni' }, // default
    }),
  }

  const response = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json() as {
    token?: string
    redirect_url?: string
    qr_string?: string
    transaction_id?: string
  }

  return {
    provider: 'midtrans',
    order_id: orderId,
    transaction_id: data.transaction_id ?? null,
    payment_url: data.redirect_url ?? null,
    qr_string: data.qr_string ?? null,
  }
}