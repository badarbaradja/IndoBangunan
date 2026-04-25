// app/api/sales/sync/route.ts
// Handles offline transaction sync when device comes back online

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { CreateSaleRequest } from '@/types/database'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin', 'cashier'])
  if (auth instanceof NextResponse) return auth

  const { supabase } = auth
  const { sales }: { sales: CreateSaleRequest[] } = await req.json()

  if (!Array.isArray(sales) || sales.length === 0) {
    return NextResponse.json({ error: 'No sales to sync' }, { status: 400 })
  }

  if (sales.length > 50) {
    return NextResponse.json({ error: 'Max 50 sales per sync batch' }, { status: 400 })
  }

  const results: Array<{
    offline_id: string
    status: 'synced' | 'already_synced' | 'failed'
    sale_id?: string
    error?: string
  }> = []

  for (const sale of sales) {
    if (!sale.offline_id) {
      results.push({ offline_id: 'unknown', status: 'failed', error: 'Missing offline_id' })
      continue
    }

    // Check idempotency - already synced?
    const { data: existing } = await supabase
      .from('sales')
      .select('id')
      .eq('offline_id', sale.offline_id)
      .single()

    if (existing) {
      results.push({ offline_id: sale.offline_id, status: 'already_synced', sale_id: existing.id })
      continue
    }

    // Replay the sale through standard create logic
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.get('Authorization') ?? '',
        },
        body: JSON.stringify({
          ...sale,
          is_offline_created: true,
        }),
      })

      if (response.ok) {
        const data = await response.json() as { sale?: { id: string } }
        results.push({
          offline_id: sale.offline_id,
          status: 'synced',
          sale_id: data.sale?.id,
        })
      } else {
        const err = await response.json() as { error?: string }
        results.push({
          offline_id: sale.offline_id,
          status: 'failed',
          error: err.error ?? 'Unknown error',
        })
      }
    } catch (err) {
      results.push({
        offline_id: sale.offline_id,
        status: 'failed',
        error: String(err),
      })
    }
  }

  const synced = results.filter(r => r.status === 'synced').length
  const failed = results.filter(r => r.status === 'failed').length

  return NextResponse.json({
    results,
    summary: { total: sales.length, synced, already_synced: results.length - synced - failed, failed },
  })
}