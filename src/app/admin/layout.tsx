import Link from 'next/link'
import Image from 'next/image'
import styles from './admin.module.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
          <div className={styles.sidebarLabel}>Laporan</div>
          <Link href="/admin" className={styles.sidebarBtn}>
            <span className={styles.sidebarIcon}>📊</span> Dashboard
          </Link>
          
          <div className={styles.sidebarLabel}>Inventaris</div>
          <Link href="/admin/inventory" className={styles.sidebarBtn}>
            <span className={styles.sidebarIcon}>📦</span> Produk & Stok
          </Link>

          <div className={styles.sidebarLabel}>Manajemen</div>
          <Link href="/admin/users" className={styles.sidebarBtn}>
            <span className={styles.sidebarIcon}>👥</span> Pengguna
          </Link>
        </aside>

        {/* Content */}
        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  )
}
