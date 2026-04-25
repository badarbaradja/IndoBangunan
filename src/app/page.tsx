import Link from 'next/link'
import Image from 'next/image'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.home}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <Image src="/logo.jpeg" alt="IndoBangunan Logo" width={200} height={40} style={{ objectFit: 'contain' }} />
        </div>
        <nav className={styles.nav}>
          <Link href="/pos" className={styles.navLink}>Self-Order</Link>
          <Link href="/admin" className={styles.navLinkAdmin}>Admin Panel</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>✨ Belanja Sendiri, Mudah & Cepat</div>
        <h1 className={styles.heroTitle}>
          Toko Bangunan<br />
          <span className={styles.heroGradient}>Self-Service</span><br />
          Modern
        </h1>
        <p className={styles.heroDesc}>
          Pilih produk, tentukan jumlah, bayar — semuanya bisa kamu lakukan sendiri.
          Pesananmu akan langsung diproses oleh tim kami.
        </p>
        <div className={styles.heroCta}>
          <Link href="/pos" className={styles.ctaPrimary}>
            <span>🛒</span>
            Mulai Pesan Sekarang
          </Link>
          <Link href="/admin" className={styles.ctaSecondary}>
            <span>⚙️</span>
            Masuk Admin
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          {[
            { icon: '📦', value: '1000+', label: 'Produk Tersedia' },
            { icon: '⚡', value: '< 2 Menit', label: 'Proses Checkout' },
            { icon: '✅', value: '100%', label: 'Harga Transparan' },
          ].map((s) => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statIcon}>{s.icon}</span>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howSection}>
        <div className={styles.sectionLabel}>Cara Kerja</div>
        <h2 className={styles.sectionTitle}>Semudah 3 Langkah</h2>
        <div className={styles.steps}>
          {[
            { num: '01', icon: '🔍', title: 'Pilih Produk', desc: 'Cari dan pilih produk yang kamu butuhkan dari katalog lengkap kami' },
            { num: '02', icon: '🛒', title: 'Masukkan ke Keranjang', desc: 'Tambahkan ke keranjang dan sesuaikan jumlah sesuai kebutuhan' },
            { num: '03', icon: '📋', title: 'Ambil Pesanan', desc: 'Setelah checkout, tim kami akan menyiapkan dan menyerahkan pesananmu' },
          ].map((step) => (
            <div key={step.num} className={styles.stepCard}>
              <div className={styles.stepNum}>{step.num}</div>
              <div className={styles.stepIcon}>{step.icon}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <h2>Siap Berbelanja?</h2>
        <p>Mulai pengalaman berbelanja material bangunan yang modern dan efisien.</p>
        <Link href="/pos" className={styles.ctaPrimary}>
          🚀 Buka Self-Order Sekarang
        </Link>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.logo}>
          <Image src="/logo.jpeg" alt="IndoBangunan Logo" width={160} height={32} style={{ objectFit: 'contain' }} />
        </div>
        <p className={styles.footerText}>© 2025 IndoBangunan. Semua hak dilindungi.</p>
      </footer>
    </main>
  )
}
