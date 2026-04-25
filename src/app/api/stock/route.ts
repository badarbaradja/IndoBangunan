// src/app/api/stock/movement/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, logAudit } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin', 'warehouse'])
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth

  let body: { product_id?: string; qty_change?: number; notes?: string; type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { product_id, qty_change, notes, type } = body

  if (!product_id) return NextResponse.json({ error: 'product_id wajib ada' }, { status: 400 })
  if (qty_change === undefined || qty_change === 0) {
    return NextResponse.json({ error: 'qty_change harus ada dan tidak nol' }, { status: 400 })
  }
  if (!notes || notes.trim().length < 5) {
    return NextResponse.json({ error: 'Keterangan wajib ada (min. 5 karakter)' }, { status: 400 })
  }
  if (type !== 'adjustment') {
    return NextResponse.json({ error: 'Hanya tipe adjustment yang diizinkan melalui endpoint ini' }, { status: 400 })
  }

  // Warehouse max 100 unit per adjustment
  if (user.role === 'warehouse' && Math.abs(qty_change) > 100) {
    return NextResponse.json(
      { error: 'Warehouse hanya bisa adjustment maksimal 100 unit sekaligus' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase.rpc('update_stock_atomic', {
    p_product_id: product_id,
    p_qty_change: qty_change,
    p_movement_type: 'adjustment',
    p_reference_type: 'manual_adjustment',
    p_reference_id: product_id,
    p_performed_by: user.id,
    p_notes: notes.trim(),
  } as never)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 })
  }

  await logAudit(supabase, {
    user_id: user.id,
    action: 'stock_adjustment',
    table_name: 'stock_movements',
    new_values: { product_id, qty_change, notes },
  })

  return NextResponse.json({ result: data }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin', 'warehouse'])
  if (auth instanceof NextResponse) return auth

  const { supabase } = auth
  const { searchParams } = new URL(req.url)

  const product_id = searchParams.get('product_id')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = (page - 1) * limit

  let query = supabase
    .from('stock_movements')
    .select('*, product:products(name, sku), performer:users(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (product_id) query = query.eq('product_id', product_id)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data mutasi stok', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ movements: data, total: count, page, limit })
}