'use client'

import { useEffect, useState, useCallback } from 'react'
import styles from '../admin.module.css'

interface SaleRow {
  id: string
  invoice_number: string
  created_at: string
  customer_name: string | null
  total: number
  status: string
  payment_method: string
  cashier_name?: string
}

function exportToCSV(data: SaleRow[], filename: string) {
  const headers = ['Invoice', 'Tanggal', 'Pelanggan', 'Kasir', 'Metode', 'Total', 'Status']
  const rows = data.map(s => [
    s.invoice_number,
    new Date(s.created_at).toLocaleString('id-ID'),
    s.customer_name || 'Walk-in',
    s.cashier_name || '-',
    s.payment_method.toUpperCase(),
    String(s.total),
    s.status.toUpperCase()
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [sales, setSales] = useState<SaleRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1) // First of current month
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [isExporting, setIsExporting] = useState(false)

  const fetchSales = useCallback(async () => {
    setIsLoading(true)
    try {
      const session = JSON.parse(localStorage.getItem('sb-auth-token') || '{}')
      const token = session?.access_token

      if (!token) {
        // Try to get session from supabase directly
        const { createBrowserClient } = await import('@/lib/supabase/server')
        const supabase = createBrowserClient()
        const { data: { session: s } } = await supabase.auth.getSession()
        if (!s) {
          setIsLoading(false)
          return
        }

        const from = new Date(dateFrom).toISOString()
        const to = new Date(dateTo + 'T23:59:59').toISOString()

        const { data, error } = await supabase
          .from('sales')
          .select('id, invoice_number, created_at, customer_name, total, status, payment_method, cashier:users!cashier_id(full_name)')
          .eq('status', 'success')
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: false })

        if (!error && data) {
          const formatted = data.map((s: any) => ({
            ...s,
            cashier_name: s.cashier?.full_name || 'Guest'
          }))
          setSales(formatted)
        }
        setIsLoading(false)
        return
      }
    } catch {
      // Fall through to direct fetch
    }

    // Direct approach via browser client
    try {
      const { createBrowserClient } = await import('@/lib/supabase/server')
      const supabase = createBrowserClient()

      const from = new Date(dateFrom).toISOString()
      const to = new Date(dateTo + 'T23:59:59').toISOString()

      const { data, error } = await supabase
        .from('sales')
        .select('id, invoice_number, created_at, customer_name, total, status, payment_method, cashier:users!cashier_id(full_name)')
        .eq('status', 'success')
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const formatted = (data as any[]).map(s => ({
          ...s,
          cashier_name: s.cashier?.full_name || 'Guest'
        }))
        setSales(formatted)
      }
    } catch (err) {
      console.error('Error fetching sales:', err)
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const totalPendapatan = sales.reduce((s, r) => s + Number(r.total), 0)

  const formatRupiah = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  const handleExportCSV = () => {
    setIsExporting(true)
    exportToCSV(
      sales,
      `laporan-transaksi-${dateFrom}_${dateTo}.csv`
    )
    setTimeout(() => setIsExporting(false), 1000)
  }

  return (
    <div className="fade-in">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Laporan Transaksi</h1>
        <p className={styles.pageSub}>Filter dan export data penjualan ke CSV.</p>
      </div>

      {/* Filter + Export Bar */}
      <div className={styles.tableCard} style={{ marginTop: 0 }}>
        <div style={{ padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Dari Tanggal
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.9rem' }}
            />
          </div>
          <button
            onClick={fetchSales}
            style={{
              padding: '9px 20px',
              background: 'var(--brand-600)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            🔍 Filter
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isExporting || sales.length === 0}
            style={{
              padding: '9px 20px',
              background: isExporting ? 'var(--gray-400)' : 'var(--green-500)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: sales.length === 0 ? 'not-allowed' : 'pointer',
              opacity: sales.length === 0 ? 0.6 : 1
            }}
          >
            {isExporting ? '⏳ Mengexport...' : '📊 Export CSV'}
          </button>
        </div>

        {/* Summary Row */}
        {!isLoading && (
          <div style={{
            padding: '16px 24px',
            background: 'var(--brand-50, #eff6ff)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: 32
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 600 }}>Total Transaksi</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{sales.length}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 600 }}>Total Pendapatan</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--green-600, #16a34a)' }}>{formatRupiah(totalPendapatan)}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text2)', fontWeight: 600 }}>Rata-rata Transaksi</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{sales.length > 0 ? formatRupiah(totalPendapatan / sales.length) : '-'}</div>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Tanggal</th>
                <th>Pelanggan</th>
                <th>Kasir</th>
                <th>Metode</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Memuat data...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                    Tidak ada data transaksi di rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sale.invoice_number}</td>
                    <td>{new Date(sale.created_at).toLocaleString('id-ID')}</td>
                    <td>{sale.customer_name || 'Walk-in'}</td>
                    <td style={{ color: 'var(--text2)' }}>{sale.cashier_name || '-'}</td>
                    <td style={{ textTransform: 'uppercase', fontWeight: 600 }}>{sale.payment_method}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green-600, #16a34a)' }}>{formatRupiah(Number(sale.total))}</td>
                    <td>
                      <span className={`${styles.statusPill} ${styles.statusSuccess}`}>
                        {sale.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
