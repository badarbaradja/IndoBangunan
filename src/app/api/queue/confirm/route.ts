// src/app/api/queue/confirm/route.ts
// API untuk Kasir konfirmasi pesanan Cash dari Kiosk
// Menggunakan atomic RPC confirm_cash_payment untuk keamanan data

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, logAudit } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin', 'cashier'])
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth

  let body: { sale_id: string; amount_paid?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sale_id, amount_paid } = body

  if (!sale_id) {
    return NextResponse.json({ error: 'sale_id diperlukan' }, { status: 400 })
  }

  try {
    // ── Coba gunakan atomic RPC (jika sudah dijalankan dari sql/003) ──
    const { data: rpcResult, error: rpcError } = await supabase.rpc('confirm_cash_payment', {
      p_sale_id:     sale_id,
      p_amount_paid: amount_paid ?? null,
      p_cashier_id:  user.id,
    })

    if (rpcError) {
      // RPC belum ada di DB — fallback ke manual steps
      console.warn('[Queue Confirm] RPC tidak tersedia, fallback ke manual:', rpcError.message)
      return await confirmManual(supabase, sale_id, amount_paid, user)
    }

    const result = rpcResult as {
      success: boolean
      invoice_number: string
      total: number
      amount_paid: number
      change_amount: number
    }

    // Audit log
    await logAudit(supabase, {
      user_id: user.id,
      action: 'confirm_cash_payment',
      table_name: 'sales',
      record_id: sale_id,
      new_values: {
        invoice_number: result.invoice_number,
        confirmed_by: user.id,
        amount_paid: result.amount_paid,
        change_amount: result.change_amount,
      },
    })

    return NextResponse.json({
      success: true,
      invoice_number: result.invoice_number,
      change_amount: result.change_amount,
      message: 'Pembayaran dikonfirmasi. Stok berhasil diperbarui.',
    })

  } catch (err: unknown) {
    console.error('[Queue Confirm] Unexpected error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}

// ── Fallback jika RPC belum disetup di Supabase ──────────────
async function confirmManual(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createBrowserClient>,
  sale_id: string,
  amount_paid: number | undefined,
  user: { id: string; role: string }
) {
  // 1. Verifikasi sale
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('id, invoice_number, total, status, payment_method')
    .eq('id', sale_id)
    .single()

  if (saleError || !sale) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  const saleTyped = sale as {
    id: string; invoice_number: string; total: number
    status: string; payment_method: string
  }

  if (saleTyped.status !== 'pending') {
    return NextResponse.json(
      { error: `Pesanan sudah berstatus '${saleTyped.status}'` },
      { status: 409 }
    )
  }

  const paid   = amount_paid ?? saleTyped.total
  const change = Math.max(0, paid - saleTyped.total)

  // 2. Update sale → success
  await supabase.from('sales')
    .update({ status: 'success', updated_at: new Date().toISOString() })
    .eq('id', sale_id)

  // 3. Update payment → success
  await supabase.from('payments')
    .update({
      status: 'success',
      amount_paid: paid,
      change_amount: change,
      processed_at: new Date().toISOString(),
    })
    .eq('sale_id', sale_id)
    .eq('status', 'pending')

  // 4. Potong stok
  const { error: rpcStockError } = await supabase
    .rpc('process_sale_stock', { p_sale_id: sale_id })
  if (rpcStockError) {
    console.error('[Queue Confirm Fallback] process_sale_stock error:', rpcStockError)
  }

  await import('@/lib/auth').then(({ logAudit }) =>
    logAudit(supabase, {
      user_id: user.id,
      action: 'confirm_cash_payment_manual',
      table_name: 'sales',
      record_id: sale_id,
      new_values: { invoice_number: saleTyped.invoice_number, amount_paid: paid, change },
    })
  )

  return NextResponse.json({
    success: true,
    invoice_number: saleTyped.invoice_number,
    change_amount: change,
    message: 'Pembayaran dikonfirmasi (manual fallback).',
  })
}
