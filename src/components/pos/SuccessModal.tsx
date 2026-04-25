'use client'
import { useEffect } from 'react'
import styles from './SuccessModal.module.css'

interface Props {
  invoice: string
  total: number
  onClose: () => void
}

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function SuccessModal({ invoice, total, onClose }: Props) {
  // Auto-close after 30s
  useEffect(() => {
    const timer = setTimeout(onClose, 30_000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={styles.backdrop}>
      <div className={`${styles.modal} bounce-in`}>
        {/* Success Animation */}
        <div className={styles.successRing}>
          <div className={styles.checkmark}>✓</div>
        </div>

        <h2 className={styles.title}>Pesanan Berhasil!</h2>
        <p className={styles.subtitle}>
          Pesananmu sudah diterima. Silakan tunjukkan nomor pesanan ini ke kasir untuk pengambilan barang.
        </p>

        {/* Invoice Number — Big, Prominent */}
        <div className={styles.invoiceCard}>
          <div className={styles.invoiceLabel}>Nomor Pesanan</div>
          <div className={styles.invoiceNum}>{invoice}</div>
          <div className={styles.invoiceHint}>📋 Simpan / screenshot nomor ini</div>
        </div>

        {/* Order Info */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>💰</span>
            <span className={styles.infoLabel}>Total Pembayaran</span>
            <span className={styles.infoVal}>{formatRp(total)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoIcon}>⏱️</span>
            <span className={styles.infoLabel}>Status</span>
            <span className={styles.infoBadge}>Menunggu Pengambilan</span>
          </div>
        </div>

        {/* Steps for pickup */}
        <div className={styles.pickupSteps}>
          <div className={styles.pickupTitle}>Langkah Selanjutnya:</div>
          {[
            { n: '1', t: 'Pergi ke kasir', d: 'Tunjukkan nomor pesanan di atas' },
            { n: '2', t: 'Lakukan pembayaran', d: 'Bayar sesuai metode yang dipilih' },
            { n: '3', t: 'Ambil barang', d: 'Tim kami akan menyiapkan pesananmu' },
          ].map((s) => (
            <div key={s.n} className={styles.pickupStep}>
              <div className={styles.pickupStepNum}>{s.n}</div>
              <div>
                <div className={styles.pickupStepTitle}>{s.t}</div>
                <div className={styles.pickupStepDesc}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <button className={`${styles.doneBtn} ripple-btn`} onClick={onClose} id="success-done">
          🏠 Pesanan Baru
        </button>
        <p className={styles.autoClose}>Halaman akan otomatis kembali dalam 30 detik</p>
      </div>
    </div>
  )
}
