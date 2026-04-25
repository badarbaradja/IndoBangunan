'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import { useAuth } from '@/hooks/useAuth'
import styles from './admin.module.css'

interface DashboardMetrics {
  total_pendapatan: number
  jumlah_transaksi: number
  rata_rata_transaksi: number
  stok_rendah: number
}

interface RecentTransaction {
  id: string
  invoice_number: string
  created_at: string
  total_amount: number
  status: string
  customer_name: string
  kasir: string
  payment_method: string
}

export default function AdminDashboard() {
  const { user, role } = useAuth()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient()

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch('/api/reports', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        const json = await res.json()
        
        if (res.ok && json.data) {
          setMetrics(json.data.metrics)
          setRecentTransactions(json.data.recent_transactions)
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [supabase])

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'success': return styles.statusSuccess
      case 'pending': return styles.statusPending
      case 'void': return styles.statusVoid
      default: return styles.statusDefault
    }
  }

  return (
    <div className="fade-in">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          Selamat datang, {user?.user_metadata?.full_name || 'Admin'} 👋
        </h1>
        <p className={styles.pageSub}>Ringkasan aktivitas dan performa toko Anda hari ini.</p>
      </div>

      {isLoading ? (
        <div className={styles.grid4}>
          {[1,2,3,4].map(i => (
            <div key={i} className={styles.card}>
              <div className="skeleton" style={{ height: 20, width: '50%', marginBottom: 16 }}></div>
              <div className="skeleton" style={{ height: 36, width: '80%' }}></div>
            </div>
          ))}
        </div>
      ) : metrics && (
        <div className={`${styles.grid} ${styles.grid4}`}>
          <div className={`${styles.card} ${styles.statCard}`}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              💰
            </div>
            <div>
              <div className={styles.statLabel}>Pendapatan Hari Ini</div>
              <div className={styles.statValue}>{formatRupiah(metrics.total_pendapatan)}</div>
            </div>
          </div>
          
          <div className={`${styles.card} ${styles.statCard}`}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              🛒
            </div>
            <div>
              <div className={styles.statLabel}>Total Transaksi</div>
              <div className={styles.statValue}>{metrics.jumlah_transaksi}</div>
            </div>
          </div>

          <div className={`${styles.card} ${styles.statCard}`}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
              📈
            </div>
            <div>
              <div className={styles.statLabel}>Rata-Rata Transaksi</div>
              <div className={styles.statValue}>{formatRupiah(metrics.rata_rata_transaksi)}</div>
            </div>
          </div>

          <div className={`${styles.card} ${styles.statCard}`}>
            <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              ⚠️
            </div>
            <div>
              <div className={styles.statLabel}>Produk Stok Rendah</div>
              <div className={styles.statValue} style={metrics.stok_rendah > 0 ? { color: '#ef4444' } : {}}>
                {metrics.stok_rendah} <span style={{fontSize:'0.9rem', fontWeight:500, color:'#6b7280'}}>item</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          Transaksi Terbaru
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Waktu</th>
                <th>Kasir / Pelanggan</th>
                <th>Metode</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                    <div className="skeleton" style={{ height: 20, width: '100%', marginBottom: 12 }}></div>
                    <div className="skeleton" style={{ height: 20, width: '100%' }}></div>
                  </td>
                </tr>
              ) : recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
                    Belum ada transaksi hari ini.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tx.invoice_number}</td>
                    <td style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>{formatDate(tx.created_at)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tx.customer_name || 'Walk-in'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Kasir: {tx.kasir}</div>
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 600 }}>
                      {tx.payment_method}
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatRupiah(tx.total_amount)}</td>
                    <td>
                      <span className={`${styles.statusPill} ${getStatusBadgeClass(tx.status)}`}>
                        {tx.status.toUpperCase()}
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
