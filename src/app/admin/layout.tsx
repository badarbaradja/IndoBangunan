'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import styles from './admin.module.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className="skeleton" style={{ width: 200, height: 40, marginBottom: 16 }}></div>
        <p>Memuat dashboard...</p>
      </div>
    )
  }

  if (!user) {
    return null // Prevent flash before redirect
  }

  return (
    <div className={styles.adminLayout}>
      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <Image src="/logo.jpeg" alt="IndoBangunan Logo" width={160} height={32} style={{ objectFit: 'contain' }} />
          <span>Admin</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="/pos" className={styles.navLink}>Kasir (POS)</Link>
          <Link href="/admin" className={`${styles.navLink} ${styles.active}`}>Dashboard</Link>
        </div>
        <div className={styles.navRight}>
          <span className={styles.adminBadge}>Admin Mode</span>
        </div>
      </nav>

      <div className={styles.mainContent}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarMenu}>
            <div className={styles.sidebarLabel}>Laporan</div>
            <Link href="/admin" className={`${styles.sidebarBtn} ${pathname === '/admin' ? styles.sidebarBtnActive : ''}`}>
              <span className={styles.sidebarIcon}>📊</span> Dashboard
            </Link>
            <Link href="/admin/transactions" className={`${styles.sidebarBtn} ${pathname === '/admin/transactions' ? styles.sidebarBtnActive : ''}`}>
              <span className={styles.sidebarIcon}>💰</span> Transaksi
            </Link>
            <Link href="/admin/queue" className={`${styles.sidebarBtn} ${pathname === '/admin/queue' ? styles.sidebarBtnActive : ''}`}>
              <span className={styles.sidebarIcon}>🧾</span> Antrean Kasir
            </Link>
            <Link href="/admin/reports" className={`${styles.sidebarBtn} ${pathname === '/admin/reports' ? styles.sidebarBtnActive : ''}`}>
              <span className={styles.sidebarIcon}>📈</span> Laporan & Export
            </Link>
            
            <div className={styles.sidebarLabel}>Inventaris</div>
            <Link href="/admin/inventory" className={`${styles.sidebarBtn} ${pathname === '/admin/inventory' ? styles.sidebarBtnActive : ''}`}>
              <span className={styles.sidebarIcon}>📦</span> Produk & Stok
            </Link>
            <Link href="/admin/stock-movements" className={`${styles.sidebarBtn} ${pathname === '/admin/stock-movements' ? styles.sidebarBtnActive : ''}`}>
              <span className={styles.sidebarIcon}>🔄</span> Mutasi Stok
            </Link>
            <Link href="/admin/low-stock" className={`${styles.sidebarBtn} ${pathname === '/admin/low-stock' ? styles.sidebarBtnActive : ''}`}>
              <span className={styles.sidebarIcon}>⚠️</span> Stok Rendah
            </Link>

            <div className={styles.sidebarLabel}>Sistem</div>
            <Link href="/admin/users" className={`${styles.sidebarBtn} ${pathname === '/admin/users' ? styles.sidebarBtnActive : ''}`}>
              <span className={styles.sidebarIcon}>👥</span> Pengguna
            </Link>
            <Link href="/admin/audit-logs" className={`${styles.sidebarBtn} ${pathname === '/admin/audit-logs' ? styles.sidebarBtnActive : ''}`}>
              <span className={styles.sidebarIcon}>📝</span> Audit Log
            </Link>
          </div>

          <div className={styles.sidebarFooter}>
            <button onClick={signOut} className={styles.logoutBtn}>
              <span className={styles.sidebarIcon}>🚪</span> Keluar
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  )
}
