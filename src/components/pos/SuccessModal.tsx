'use client'

import { useEffect, useState, useCallback } from 'react'
import styles from './SuccessModal.module.css'

interface SuccessModalProps {
  invoiceNumber: string
  /** Dipanggil saat user tutup modal — parent akan show ReceiptPrinter */
  onClose: () => void
  /** Auto-trigger print tanpa harus tekan tombol */
  onPrint: () => void
}

const AUTO_CLOSE_SECONDS = 60

export default function SuccessModal({ invoiceNumber, onClose, onPrint }: SuccessModalProps) {
  const [countdown, setCountdown] = useState(AUTO_CLOSE_SECONDS)
  const [printed, setPrinted] = useState(false)

  // Auto-trigger print saat modal muncul (1 detik delay agar render selesai)
  useEffect(() => {
    const t = setTimeout(() => {
      onPrint()
      setPrinted(true)
    }, 800)
    return () => clearTimeout(t)
  }, [onPrint])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Countdown & auto-close
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleClose()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [handleClose])

  const handlePrintAgain = () => {
    onPrint()
    setPrinted(true)
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} bounce-in`}>

        {/* ── Icon ── */}
        <div className={styles.successIcon}>🎉</div>

        {/* ── Title ── */}
        <h2 className={styles.title}>Pesanan Berhasil!</h2>

        {/* ── Invoice ── */}
        <div className={styles.invoiceCard}>
          <p className={styles.invoiceLabel}>Nomor Pesanan</p>
          <div className={styles.invoiceNumber}>{invoiceNumber}</div>
          <p className={styles.invoiceHint}>Tunjukkan / sebutkan nomor ini ke Kasir</p>
        </div>

        {/* ── Instruksi Cash ── */}
        <div className={`${styles.instructionBox} ${styles.instructionCash}`}>
          <div className={styles.instrIcon}>🧾</div>
          <div className={styles.instrText}>
            <strong>Langkah selanjutnya:</strong>
            <ol className={styles.steps}>
              <li>Ambil <strong>struk cetak</strong> dari mesin ini</li>
              <li>Pergi ke loket <strong>Kasir</strong></li>
              <li>Serahkan struk &amp; lakukan <strong>pembayaran tunai</strong></li>
              <li>Ambil barang Anda 🎁</li>
            </ol>
          </div>
        </div>

        {/* ── Print status ── */}
        {printed && (
          <div className={styles.printedBadge}>
            ✅ Struk sedang dicetak...
          </div>
        )}

        {/* ── Actions ── */}
        <div className={styles.actionRow}>
          <button
            onClick={handlePrintAgain}
            className={styles.printBtn}
            id="success-print-btn"
          >
            🖨️ Cetak Ulang Struk
          </button>
          <button
            onClick={handleClose}
            className={styles.closeBtn}
            id="success-modal-close"
          >
            Selesai &amp; Pesanan Baru
          </button>
        </div>

        {/* ── Countdown bar ── */}
        <div className={styles.countdownWrap}>
          <div
            className={styles.countdownBar}
            style={{ width: `${(countdown / AUTO_CLOSE_SECONDS) * 100}%` }}
          />
          <small className={styles.autoCloseNote}>
            Layar tertutup otomatis dalam {countdown} detik
          </small>
        </div>

      </div>
    </div>
  )
}
