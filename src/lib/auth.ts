// src/lib/auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from './supabase/server'
import { User, UserRole, AuditLogInsert } from '@/types/database'

export interface AuthContext {
  user: User
  supabase: ReturnType<typeof createServiceClient>
}

export async function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[]
): Promise<AuthContext | NextResponse> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized - missing Bearer token' }, { status: 401 })
  }

  const token = authHeader.slice(7)
  const supabase = createServiceClient()

  const { data: { user: authUser }, error } = await supabase.auth.getUser(token)

  if (error || !authUser) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User profile not found. Pastikan user sudah terdaftar di tabel users.' }, { status: 403 })
  }

  const typedProfile = profile as User

  if (!typedProfile.is_active) {
    return NextResponse.json({ error: 'User account is inactive' }, { status: 403 })
  }

  if (allowedRoles && !allowedRoles.includes(typedProfile.role)) {
    return NextResponse.json(
      { error: `Access denied. Required: ${allowedRoles.join(', ')}. Your role: ${typedProfile.role}` },
      { status: 403 }
    )
  }

  return { user: typedProfile, supabase }
}

export async function logAudit(
  supabase: ReturnType<typeof createServiceClient>,
  params: AuditLogInsert
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: params.user_id ?? null,
      action: params.action,
      table_name: params.table_name ?? null,
      record_id: params.record_id ?? null,
      old_values: params.old_values ?? null,
      new_values: params.new_values ?? null,
      ip_address: params.ip_address ?? null,
    })
  } catch (err) {
    console.error('Audit log failed (non-fatal):', err)
  }
}

export async function validateCartItems(
  supabase: ReturnType<typeof createServiceClient>,
  items: Array<{ product_id: string; qty: number; discount_amount?: number }>
): Promise<{
  valid: boolean
  error?: string
  validatedItems?: Array<{
    product_id: string
    product_name: string
    product_sku: string
    unit: string
    qty: number
    unit_price: number
    discount_amount: number
    line_total: number
    stock: number
  }>
  subtotal?: number
}> {
  if (!items || items.length === 0) {
    return { valid: false, error: 'No items provided' }
  }

  const productIds = items.map((i) => i.product_id)

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, sku, unit, selling_price, wholesale_price, min_wholesale_qty, stock, allow_negative_stock, negative_stock_limit, is_active')
    .in('id', productIds)
    .eq('is_active', true)

  if (error) {
    console.error('validateCartItems DB error:', error)
    return { valid: false, error: 'Failed to fetch products from database' }
  }

  // Gunakan explicit type assertion untuk produk yang di-fetch
  type FetchedProduct = {
    id: string
    name: string
    sku: string
    unit: string
    selling_price: number
    wholesale_price: number | null
    min_wholesale_qty: number
    stock: number
    allow_negative_stock: boolean
    negative_stock_limit: number
    is_active: boolean
  }

  const productList = (products ?? []) as FetchedProduct[]
  const productMap = new Map(productList.map((p) => [p.id, p]))
  const validatedItems = []
  let subtotal = 0

  for (const item of items) {
    const product = productMap.get(item.product_id)

    if (!product) {
      return { valid: false, error: `Produk tidak ditemukan atau tidak aktif: ${item.product_id}` }
    }

    if (item.qty <= 0) {
      return { valid: false, error: `Jumlah tidak valid untuk: ${product.name}` }
    }

    let unitPrice: number = product.selling_price
    if (product.wholesale_price && product.min_wholesale_qty && item.qty >= product.min_wholesale_qty) {
      unitPrice = product.wholesale_price
    }

    const discountAmount = item.discount_amount ?? 0
    if (discountAmount < 0 || discountAmount > unitPrice * item.qty) {
      return { valid: false, error: `Diskon tidak valid untuk ${product.name}` }
    }

    const lineTotal = unitPrice * item.qty - discountAmount
    subtotal += lineTotal

    validatedItems.push({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      unit: product.unit,
      qty: item.qty,
      unit_price: unitPrice,
      discount_amount: discountAmount,
      line_total: lineTotal,
      stock: product.stock,
    })
  }

  return { valid: true, validatedItems, subtotal }
}