'use client'
import { useEffect, useState } from 'react'
import styles from './admin.module.css'

export default function AdminDashboard() {
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }))
  }, [])

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSub}>{dateStr}</p>
      </div>

      <div className={`${styles.grid} ${styles.grid4}`}>
        {/* Stat Cards - Mock Data for Demo */}
        <div className={styles.card}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Pendapatan Hari Ini</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>Rp 12.450.000</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--green-500)', marginTop: '4px' }}>▲ 8% vs kemarin</div>
        </div>

        <div className={styles.card}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Transaksi Hari Ini</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>24</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--green-500)', marginTop: '4px' }}>▲ 3 vs kemarin</div>
        </div>

        <div className={styles.card}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Produk Stok Rendah</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--yellow-500)' }}>5</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: '4px' }}>Perlu restock segera</div>
        </div>

        <div className={styles.card}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Avg. Transaksi</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>Rp 518.750</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--green-500)', marginTop: '4px' }}>▲ 12% vs kemarin</div>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>Transaksi Terbaru</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Kasir</th>
              <th>Total</th>
              <th>Metode</th>
              <th>Status</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontFamily: 'monospace' }}>INV-20250115-00001</td>
              <td>Budi S.</td>
              <td>Rp 285.000</td>
              <td>Tunai</td>
              <td><span className={`${styles.statusPill} ${styles.statusSuccess}`}>Success</span></td>
              <td>09:14</td>
            </tr>
            <tr>
              <td style={{ fontFamily: 'monospace' }}>INV-20250115-00002</td>
              <td>Rina K.</td>
              <td>Rp 68.000</td>
              <td>QRIS</td>
              <td><span className={`${styles.statusPill} ${styles.statusSuccess}`}>Success</span></td>
              <td>09:31</td>
            </tr>
            <tr>
              <td style={{ fontFamily: 'monospace' }}>INV-20250115-00004</td>
              <td>Kiosk</td>
              <td>Rp 380.000</td>
              <td>QRIS</td>
              <td><span className={`${styles.statusPill} ${styles.statusPending}`}>Pending</span></td>
              <td>10:22</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
