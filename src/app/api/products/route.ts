// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, logAudit } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * GET /api/products
 * Publik untuk POS (read-only produk aktif).
 * Tidak perlu auth — kasir butuh akses produk sebelum login penuh.
 * Tapi harga TIDAK bisa dimanipulasi dari sini karena ini read-only.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const search = searchParams.get('search') ?? ''
  const category_id = searchParams.get('category_id')
  const low_stock = searchParams.get('low_stock') === 'true'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = (page - 1) * limit

  // Gunakan service client (GET produk tidak perlu auth user)
  const supabase = createServiceClient()

  let query = supabase
    .from('products')
    .select('*, category:categories(name)', { count: 'exact' })
    .eq('is_active', true)
    .order('name')

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.eq.${search}`)
  }

  if (category_id) {
    query = query.eq('category_id', category_id)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    console.error('GET /api/products error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data produk', detail: error.message },
      { status: 500 }
    )
  }

  const productsWithAlerts = (data ?? []).map((p) => ({
    ...p,
    is_low_stock: p.stock <= p.stock_minimum,
    is_out_of_stock: p.stock <= 0,
  }))

  const result = low_stock
    ? productsWithAlerts.filter((p) => p.is_low_stock)
    : productsWithAlerts

  return NextResponse.json({
    products: result,
    total: low_stock ? result.length : (count ?? 0),
    page,
    limit,
  })
}

/**
 * POST /api/products
 * Butuh auth: owner, admin, atau warehouse
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin', 'warehouse'])
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validasi field wajib
  const required = ['sku', 'name', 'selling_price', 'unit']
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Field '${field}' wajib diisi` }, { status: 400 })
    }
  }

  const sellingPrice = Number(body.selling_price)
  if (isNaN(sellingPrice) || sellingPrice <= 0) {
    return NextResponse.json({ error: 'Harga jual harus lebih dari 0' }, { status: 422 })
  }

  // Cek duplikat SKU
  const { data: existing, error: skuError } = await supabase
    .from('products')
    .select('id')
    .eq('sku', String(body.sku))
    .maybeSingle()

  if (skuError) {
    return NextResponse.json({ error: 'Gagal memvalidasi SKU' }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ error: `SKU '${body.sku}' sudah digunakan` }, { status: 409 })
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      sku: String(body.sku),
      barcode: body.barcode ? String(body.barcode) : null,
      name: String(body.name),
      description: body.description ? String(body.description) : null,
      category_id: body.category_id ? String(body.category_id) : null,
      unit: String(body.unit),
      cost_price: Number(body.cost_price ?? 0),
      selling_price: sellingPrice,
      wholesale_price: body.wholesale_price ? Number(body.wholesale_price) : null,
      min_wholesale_qty: Number(body.min_wholesale_qty ?? 0),
      stock: Number(body.initial_stock ?? 0),
      stock_minimum: Number(body.stock_minimum ?? 0),
      stock_maximum: body.stock_maximum ? Number(body.stock_maximum) : null,
      allow_negative_stock: Boolean(body.allow_negative_stock ?? false),
      negative_stock_limit: Number(body.negative_stock_limit ?? -10),
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !product) {
    console.error('POST /api/products error:', error)
    return NextResponse.json({ error: 'Gagal membuat produk', detail: error?.message }, { status: 500 })
  }

  // Catat stok awal sebagai movement
  const initialStock = Number(body.initial_stock ?? 0)
  if (initialStock > 0) {
    const { error: rpcError } = await supabase.rpc('update_stock_atomic', {
      p_product_id: product.id,
      p_qty_change: initialStock,
      p_movement_type: 'adjustment',
      p_reference_type: 'initial_stock',
      p_reference_id: product.id,
      p_performed_by: user.id,
      p_notes: 'Stok awal saat produk dibuat',
    })
    if (rpcError) {
      console.error('Initial stock movement error:', rpcError)
    }
  }

  await logAudit(supabase, {
    user_id: user.id,
    action: 'create_product',
    table_name: 'products',
    record_id: product.id,
    new_values: { sku: product.sku, name: product.name, selling_price: product.selling_price },
  })

  return NextResponse.json({ product }, { status: 201 })
}

/**
 * PUT /api/products
 * Update produk — tidak boleh edit stock langsung (harus via stock movement)
 */
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin'])
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Product id wajib ada' }, { status: 400 })

  const { data: oldProduct } = await supabase
    .from('products')
    .select('*')
    .eq('id', String(id))
    .single()

  if (!oldProduct) {
    return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
  }

  // KRITIS: jangan izinkan edit stok langsung melalui endpoint ini
  delete updates.stock
  delete updates.id
  delete updates.created_by
  delete updates.created_at

  const { data: product, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', String(id))
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Update gagal', detail: error.message }, { status: 500 })
  }

  await logAudit(supabase, {
    user_id: user.id,
    action: 'update_product',
    table_name: 'products',
    record_id: String(id),
    old_values: oldProduct as Record<string, unknown>,
    new_values: updates,
  })

  return NextResponse.json({ product })
}