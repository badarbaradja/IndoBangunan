import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin'])
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  try {
    // 1. Dapatkan range waktu hari ini
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()
    
    // 2. Fetch data sales hari ini (sukses)
    const { data: salesToday, error: salesError } = await supabase
      .from('sales')
      .select('total')
      .eq('status', 'success')
      .gte('created_at', todayIso)

    if (salesError) throw salesError

    const totalPendapatan = salesToday?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0
    const jumlahTransaksi = salesToday?.length || 0
    const rataRataTransaksi = jumlahTransaksi > 0 ? totalPendapatan / jumlahTransaksi : 0

    // 3. Fetch produk stok rendah
    // Catatan: kita tidak bisa nge-query `stock <= stock_minimum` langsung dengan mudah kecuali menggunakan rpc atau raw sql,
    // Atau ambil semua produk dan hitung di memori (kurang ideal untuk scale, tapi cukup untuk MVP)
    // Sebagai alternatif, kita bisa buat RPC atau ambil field yang diperlukan saja:
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('stock, stock_minimum')
      .eq('is_active', true)
      
    if (productsError) throw productsError

    const jumlahStokRendah = products?.filter(p => p.stock <= p.stock_minimum).length || 0

    // 4. Fetch 5 transaksi terbaru (ambil metode pembayaran dari tabel payments juga jika bisa, tapi kita sederhanakan dengan fetch payments terpisah atau join)
    // Karena Supabase foreign key dari payments ke sales, kita join sales dengan payments dan users
    const { data: recentSales, error: recentError } = await supabase
      .from('sales')
      .select(`
        id, 
        invoice_number, 
        created_at, 
        total, 
        status, 
        customer_name,
        cashier_id,
        users(full_name),
        payments(payment_method)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) throw recentError

    const formattedRecentSales = recentSales?.map(sale => {
      // Pembayaran bisa lebih dari 1, kita ambil yang pertama atau mapping
      const paymentMethod = sale.payments && sale.payments.length > 0 ? sale.payments[0].payment_method : 'cash'
      const kasirName = (sale as unknown as { users?: { full_name?: string } }).users?.full_name || 'Kiosk (Guest)'

      return {
        id: sale.id,
        invoice_number: sale.invoice_number,
        created_at: sale.created_at,
        total: sale.total,
        status: sale.status,
        customer_name: sale.customer_name,
        kasir: kasirName,
        payment_method: paymentMethod
      }
    })

    // 5. Response
    return NextResponse.json({
      data: {
        metrics: {
          total_pendapatan: totalPendapatan,
          jumlah_transaksi: jumlahTransaksi,
          rata_rata_transaksi: rataRataTransaksi,
          stok_rendah: jumlahStokRendah
        },
        recent_transactions: formattedRecentSales
      }
    }, { status: 200 })

  } catch (err: unknown) {
    console.error('API Reports Error:', err)
    return NextResponse.json({ error: 'Gagal memuat laporan dashboard' }, { status: 500 })
  }
}