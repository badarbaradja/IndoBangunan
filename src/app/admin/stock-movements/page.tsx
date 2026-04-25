'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import styles from '../admin.module.css'

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [supabase] = useState(() => createBrowserClient())

  const fetchMovements = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        id,
        type,
        qty_change,
        qty_before,
        qty_after,
        notes,
        created_at,
        products(name, sku),
        users(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100) // Batasi agar tidak terlalu berat

    if (!error && data) {
      setMovements(data)
    }
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  const getTypeBadge = (type: string) => {
    if (type.includes('in')) return <span className={`${styles.statusPill} ${styles.statusSuccess}`}>Masuk</span>
    if (type.includes('out')) return <span className={`${styles.statusPill} ${styles.statusVoid}`}>Keluar</span>
    return <span className={`${styles.statusPill} ${styles.statusPending}`}>Penyesuaian</span>
  }

  return (
    <div className="fade-in">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Mutasi Stok</h1>
        <p className={styles.pageSub}>Riwayat riil perubahan stok produk keluar masuk sistem.</p>
      </div>

      <div className={styles.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Produk</th>
                <th>Tipe Mutasi</th>
                <th>Perubahan</th>
                <th>Stok Akhir</th>
                <th>Keterangan</th>
                <th>Oleh</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Memuat mutasi stok...</td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Belum ada mutasi stok.</td>
                </tr>
              ) : (
                movements.map((mov) => (
                  <tr key={mov.id}>
                    <td>{new Date(mov.created_at).toLocaleString('id-ID')}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{mov.products?.name}</div>
                      <small style={{ color: 'var(--text3)' }}>{mov.products?.sku}</small>
                    </td>
                    <td>{getTypeBadge(mov.type)}</td>
                    <td style={{ fontWeight: 700, color: mov.qty_change > 0 ? 'var(--green-600)' : 'var(--red-600)' }}>
                      {mov.qty_change > 0 ? `+${mov.qty_change}` : mov.qty_change}
                    </td>
                    <td style={{ fontWeight: 600 }}>{mov.qty_after}</td>
                    <td>{mov.notes || '-'}</td>
                    <td>{mov.users?.full_name || 'System'}</td>
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
