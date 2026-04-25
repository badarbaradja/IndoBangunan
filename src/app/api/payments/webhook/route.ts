// app/api/payments/webhook/route.ts
// CRITICAL: This is the ONLY trusted source of payment confirmation
// DO NOT trust any frontend payment confirmation

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// Midtrans webhook verification
function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
  serverKey: string
): boolean {
  const hash = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex')
  return hash === signatureKey
}

// Xendit webhook verification
function verifyXenditCallback(
  callbackToken: string,
  xenditWebhookToken: string
): boolean {
  return callbackToken === xenditWebhookToken
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const rawBody = await req.text()
  let payload: Record<string, unknown>

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Detect gateway provider ────────────────────────────────────
  const provider = detectProvider(req, payload)

  if (provider === 'midtrans') {
    return handleMidtrans(supabase, payload, req)
  } else if (provider === 'xendit') {
    return handleXendit(supabase, payload, req)
  }

  return NextResponse.json({ error: 'Unknown payment provider' }, { status: 400 })
}

function detectProvider(req: NextRequest, payload: Record<string, unknown>): string | null {
  if (payload.signature_key) return 'midtrans'
  if (req.headers.get('x-callback-token')) return 'xendit'
  return null
}

async function handleMidtrans(
  supabase: ReturnType<typeof createServiceClient>,
  payload: Record<string, unknown>,
  req: NextRequest
) {
  const { order_id, transaction_id, transaction_status, gross_amount, signature_key, status_code } = payload as {
    order_id: string
    transaction_id: string
    transaction_status: string
    gross_amount: string
    signature_key: string
    status_code: string
  }

  // Verify signature
  const serverKey = process.env.MIDTRANS_SERVER_KEY!
  if (!verifyMidtransSignature(order_id, status_code, gross_amount, signature_key, serverKey)) {
    console.error('Midtrans signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Find payment by gateway_order_id
  const { data: payment } = await supabase
    .from('payments')
    .select('*, sale:sales(*)')
    .eq('gateway_order_id', order_id)
    .single()

  if (!payment) {
    console.error('Payment not found for order:', order_id)
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  // ── IDEMPOTENCY: already processed? ──────────────────────────
  if (payment.processed_at) {
    console.log('Duplicate webhook, already processed:', order_id)
    return NextResponse.json({ message: 'Already processed' }, { status: 200 })
  }

  // Map Midtrans status to our status
  const isFinalSuccess = ['capture', 'settlement'].includes(transaction_status)
  const isFailed = ['deny', 'cancel', 'expire', 'failure'].includes(transaction_status)

  if (isFinalSuccess) {
    await processPaymentSuccess(supabase, payment.id, payment.sale_id, {
      gateway_transaction_id: transaction_id,
      gateway_raw_response: payload,
      webhook_received_at: new Date().toISOString(),
    })
  } else if (isFailed) {
    await supabase.from('payments').update({
      status: 'failed',
      gateway_transaction_id: transaction_id,
      gateway_raw_response: payload,
      webhook_received_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    }).eq('id', payment.id)

    await supabase.from('sales').update({ status: 'void' }).eq('id', payment.sale_id)
  }

  return NextResponse.json({ message: 'OK' }, { status: 200 })
}

async function handleXendit(
  supabase: ReturnType<typeof createServiceClient>,
  payload: Record<string, unknown>,
  req: NextRequest
) {
  const callbackToken = req.headers.get('x-callback-token') ?? ''
  const xenditToken = process.env.XENDIT_WEBHOOK_TOKEN!

  if (!verifyXenditCallback(callbackToken, xenditToken)) {
    return NextResponse.json({ error: 'Invalid callback token' }, { status: 401 })
  }

  const { id: xenditId, external_id, status, amount } = payload as {
    id: string
    external_id: string
    status: string
    amount: number
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('*, sale:sales(*)')
    .eq('gateway_order_id', external_id)
    .single()

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  // Idempotency check
  if (payment.processed_at) {
    return NextResponse.json({ message: 'Already processed' }, { status: 200 })
  }

  if (status === 'PAID' || status === 'SETTLED') {
    // Validate amount matches (prevent partial payment fraud)
    if (Math.abs(amount - payment.amount) > 1) {
      console.error(`Amount mismatch: expected ${payment.amount}, got ${amount}`)
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 422 })
    }

    await processPaymentSuccess(supabase, payment.id, payment.sale_id, {
      gateway_transaction_id: xenditId,
      gateway_raw_response: payload,
      webhook_received_at: new Date().toISOString(),
    })
  } else if (['EXPIRED', 'FAILED'].includes(status)) {
    await supabase.from('payments').update({
      status: 'failed',
      gateway_raw_response: payload,
      processed_at: new Date().toISOString(),
    }).eq('id', payment.id)

    await supabase.from('sales').update({ status: 'void' }).eq('id', payment.sale_id)
  }

  return NextResponse.json({ message: 'OK' })
}

// ── Core: Process successful payment ──────────────────────────────
async function processPaymentSuccess(
  supabase: ReturnType<typeof createServiceClient>,
  paymentId: string,
  saleId: string,
  updates: {
    gateway_transaction_id?: string
    gateway_raw_response?: Record<string, unknown>
    webhook_received_at?: string
  }
) {
  // Update payment to SUCCESS
  await supabase.from('payments').update({
    status: 'success',
    ...updates,
    processed_at: new Date().toISOString(),
  }).eq('id', paymentId)

  // Update sale to SUCCESS
  await supabase.from('sales').update({ status: 'success' }).eq('id', saleId)

  // Deduct stock (atomic with race-condition protection)
  try {
    await supabase.rpc('process_sale_stock', { p_sale_id: saleId } as never)
  } catch (err) {
    console.error('CRITICAL: Payment succeeded but stock update failed for sale:', saleId, err)
    // TODO: Alert system - this needs manual resolution
    // Log to audit for traceability
    await supabase.from('audit_logs').insert({
      action: 'stock_update_failed_after_payment',
      table_name: 'sales',
      record_id: saleId as unknown as string,
      new_values: { error: String(err), payment_id: paymentId },
    })
  }
}