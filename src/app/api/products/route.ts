import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, logAudit } from '@/lib/auth'

export async function POST(req: NextRequest) {
  // 1. Auth check: Hanya owner dan admin yang bisa tambah produk
  const auth = await requireAuth(req, ['owner', 'admin'])
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // 2. Parse & validasi body
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 })
  }

  // 3. Validasi field wajib
  if (!body.sku || !body.name || !body.unit || body.selling_price === undefined || body.stock === undefined) {
    return NextResponse.json({ error: 'SKU, Nama, Satuan, Harga Jual, dan Stok wajib diisi' }, { status: 400 })
  }

  // 4. Business logic - Insert produk
  const newProduct = {
    sku: body.sku,
    barcode: body.barcode || null,
    name: body.name,
    category_id: body.category_id || null,
    unit: body.unit,
    cost_price: Number(body.cost_price) || 0,
    selling_price: Number(body.selling_price),
    wholesale_price: body.wholesale_price ? Number(body.wholesale_price) : null,
    min_wholesale_qty: Number(body.min_wholesale_qty) || 0,
    stock: Number(body.stock),
    stock_minimum: Number(body.stock_minimum) || 0,
    allow_negative_stock: Boolean(body.allow_negative_stock),
    negative_stock_limit: Number(body.negative_stock_limit) || 0,
    is_active: true,
    created_by: user.id
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert(newProduct)
    .select()
    .single()

  if (error) {
    console.error('Error insert product:', error)
    // Cek constraint error (misal SKU duplikat)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'SKU atau Barcode sudah digunakan' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Gagal menambahkan produk ke database' }, { status: 500 })
  }

  // 5. Audit log
  await logAudit(supabase, {
    user_id: user.id,
    action: 'CREATE_PRODUCT',
    table_name: 'products',
    record_id: product.id,
    new_values: product
  })

  // 6. Return response
  return NextResponse.json({ data: product }, { status: 201 })
}

export async function GET(req: NextRequest) {
  // Endpoint public, tidak perlu requireAuth
  // Untuk fetch data tanpa RLS atau kita pakai admin client agar bypass jika RLS terlalu ketat?
  // Karena PRD minta ini endpoint public, kita pakai createServiceClient
  const { createServiceClient } = await import('@/lib/supabase/server')
  const supabase = createServiceClient()

  // Ambil produk yang aktif DAN (stok > 0 ATAU izinkan stok negatif)
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(name)
    `)
    .eq('is_active', true)
    .or('stock.gt.0,allow_negative_stock.eq.true')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching public products:', error)
    return NextResponse.json({ error: 'Gagal mengambil data produk' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200 })
}