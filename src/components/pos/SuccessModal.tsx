'use client'

import { useEffect } from 'react'
import styles from './SuccessModal.module.css'

interface SuccessModalProps {
  invoiceNumber: string
  onClose: () => void
}

export default function SuccessModal({ invoiceNumber, onClose }: SuccessModalProps) {
  useEffect(() => {
    // Auto close setelah 30 detik sesuai PRD
    const timer = setTimeout(() => {
      onClose()
    }, 30000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} bounce-in`}>
        <div className={styles.successIcon}>✅</div>
        
        <h2 className={styles.title}>Pesanan Berhasil Dibuat!</h2>
        
        <div className={styles.invoiceCard}>
          <p className={styles.invoiceLabel}>Nomor Tagihan Anda</p>
          <div className={styles.invoiceNumber}>{invoiceNumber}</div>
        </div>
        
        <p className={styles.instructions}>
          Silakan tunjukkan nomor ini ke kasir atau gunakan untuk referensi pembayaran Anda.
        </p>

        <button onClick={onClose} className={styles.closeBtn}>
          Tutup & Kembali
        </button>
        
        <small className={styles.autoCloseNote}>
          Layar ini akan tertutup otomatis dalam 30 detik
        </small>
      </div>
    </div>
  )
}
