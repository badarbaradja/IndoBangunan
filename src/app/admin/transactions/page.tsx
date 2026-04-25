'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import { Sale } from '@/types/database'
import styles from '../admin.module.css'

export default function TransactionsPage() {
  const [sales, setSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [supabase] = useState(() => createBrowserClient())

  const fetchSales = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        invoice_number,
        created_at,
        customer_name,
        total,
        status,
        users(full_name),
        payments(payment_method)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSales(data)
    }
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  const getStatusClass = (status: string) => {
    if (status === 'success') return styles.statusSuccess
    if (status === 'pending') return styles.statusPending
    if (status === 'void') return styles.statusVoid
    return styles.statusDefault
  }

  return (
    <div className="fade-in">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Riwayat Transaksi</h1>
        <p className={styles.pageSub}>Daftar seluruh transaksi yang masuk ke dalam sistem.</p>
      </div>

      <div className={styles.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Tanggal</th>
                <th>Kasir / Pelanggan</th>
                <th>Metode</th>
                <th>Total</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Memuat data...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Tidak ada data transaksi.</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{sale.invoice_number}</td>
                    <td>{new Date(sale.created_at).toLocaleString('id-ID')}</td>
                    <td>
                      <div>{sale.customer_name || 'Walk-in'}</div>
                      <small style={{ color: 'var(--text3)' }}>{sale.users?.full_name || 'Guest'}</small>
                    </td>
                    <td style={{ textTransform: 'uppercase' }}>
                      {sale.payments?.[0]?.payment_method || '-'}
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatRupiah(sale.total)}</td>
                    <td>
                      <span className={`${styles.statusPill} ${getStatusClass(sale.status)}`}>
                        {sale.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {/* Tombol Void akan diimplementasikan di tahap selanjutnya */}
                      <button disabled className={styles.secondaryBtn} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Detail</button>
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
