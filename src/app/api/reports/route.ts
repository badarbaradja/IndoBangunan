// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin'])
  if (auth instanceof NextResponse) return auth

  const { supabase } = auth
  const { searchParams } = new URL(req.url)

  const type = searchParams.get('type') ?? 'summary'
  const date_from = searchParams.get('date_from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
  const date_to = searchParams.get('date_to') ?? new Date().toISOString()

  if (type === 'summary') {
    const { data: salesData, error } = await supabase
      .from('sales')
      .select('total, status, payment_method, created_at')
      .eq('transaction_type', 'sale')
      .eq('status', 'success')
      .gte('created_at', date_from)
      .lte('created_at', date_to)
      .order('created_at')

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil data laporan', detail: error.message }, { status: 500 })
    }

    const totalRevenue = (salesData ?? []).reduce((s, r) => s + r.total, 0)
    const totalTransactions = salesData?.length ?? 0

    // Group by date
    const byDate: Record<string, { date: string; revenue: number; count: number }> = {}
    for (const sale of salesData ?? []) {
      const date = sale.created_at.slice(0, 10)
      if (!byDate[date]) byDate[date] = { date, revenue: 0, count: 0 }
      byDate[date].revenue += sale.total
      byDate[date].count++
    }

    // Payment method breakdown
    const byPayment: Record<string, number> = {}
    for (const sale of salesData ?? []) {
      byPayment[sale.payment_method] = (byPayment[sale.payment_method] ?? 0) + sale.total
    }

    return NextResponse.json({
      summary: {
        total_revenue: totalRevenue,
        total_transactions: totalTransactions,
        average_transaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      },
      by_date: Object.values(byDate),
      by_payment_method: byPayment,
      total_revenue: totalRevenue,
      total_transactions: totalTransactions,
      average_transaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
    })
  }

  if (type === 'top_products') {
    const { data, error } = await supabase
      .from('sales_details')
      .select('product_id, product_name, product_sku, qty, line_total, sale:sales!inner(status, created_at)')
      .eq('sale.status', 'success')
      .gte('sale.created_at', date_from)
      .lte('sale.created_at', date_to)

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil top produk', detail: error.message }, { status: 500 })
    }

    const productMap: Record<string, { product_id: string; name: string; sku: string; total_qty: number; total_revenue: number }> = {}
    for (const detail of data ?? []) {
      if (!productMap[detail.product_id]) {
        productMap[detail.product_id] = {
          product_id: detail.product_id,
          name: detail.product_name,
          sku: detail.product_sku,
          total_qty: 0,
          total_revenue: 0,
        }
      }
      productMap[detail.product_id].total_qty += detail.qty
      productMap[detail.product_id].total_revenue += detail.line_total
    }

    return NextResponse.json({
      top_products: Object.values(productMap)
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 20),
    })
  }

  if (type === 'low_stock') {
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name, unit, stock, stock_minimum, category:categories(name)')
      .eq('is_active', true)
      .order('stock')
      .limit(50)

    if (error) {
      return NextResponse.json({ error: 'Gagal mengambil data stok rendah' }, { status: 500 })
    }

    const lowStock = (data ?? []).filter((p) => p.stock <= p.stock_minimum)
    return NextResponse.json({ low_stock_products: lowStock, count: lowStock.length })
  }

  return NextResponse.json({ error: 'Unknown report type. Valid: summary, top_products, low_stock' }, { status: 400 })
}