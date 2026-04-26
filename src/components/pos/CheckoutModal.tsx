'use client'

import { useState } from 'react'
import { POSCartItem } from '@/types/pos'
import styles from './CheckoutModal.module.css'

type PaymentMethod = 'cash' | 'qris' | 'transfer'

interface CheckoutModalProps {
  cart: POSCartItem[]
  onClose: () => void
  // onSuccess HANYA dipanggil untuk Cash — QRIS/Transfer redirect langsung ke Midtrans
  onSuccess: (invoiceNumber: string) => void
}

const PAYMENT_OPTIONS: {
  value: PaymentMethod
  icon: string
  label: string
  sublabel: string
  color: string
}[] = [
  { value: 'cash', icon: '💵', label: 'Tunai', sublabel: 'Bayar di Kasir', color: '#22c55e' },
  { value: 'qris', icon: '📱', label: 'QRIS', sublabel: 'Scan Barcode Sekarang', color: '#6366f1' },
  { value: 'transfer', icon: '🏦', label: 'Transfer', sublabel: 'Virtual Account Bank', color: '#0ea5e9' },
]

export default function CheckoutModal({ cart, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false) // saat redirect ke Midtrans
  const [errorMsg, setErrorMsg] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0)

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

  const selectedOption = PAYMENT_OPTIONS.find(o => o.value === paymentMethod)!

  // ── Step 1 → Step 2 (konfirmasi) ─────────────────────────
  const handleNext = () => {
    setErrorMsg('')
    setStep(2)
  }

  // ── Submit ke API ─────────────────────────────────────────
  const handleSubmit = async () => {
    setIsLoading(true)
    setErrorMsg('')

    try {
      const payload = {
        items: cart.map(item => ({ product_id: item.product.id, qty: item.qty })),
        customer_name: 'Pelanggan Walk-in', // hardcoded — kiosk tidak tanya nama
        payment_method: paymentMethod,
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json() as {
        error?: string
        data?: { sale_id: string; invoice_number: string; gateway_payment_url: string | null }
      }

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan')
      }

      const { invoice_number, gateway_payment_url } = data.data!

      // ── QRIS / Transfer: WAJIB redirect ke Midtrans ──────────────────────
      // JANGAN panggil onSuccess() di sini. SuccessModal HANYA untuk Cash.
      if (paymentMethod === 'qris' || paymentMethod === 'transfer') {
        if (gateway_payment_url) {
          // Aktifkan overlay lalu alihkan halaman ke Midtrans Snap
          setIsRedirecting(true)
          window.location.href = gateway_payment_url
          return // page sudah beralih — kode di bawah tidak akan tereksekusi
        }
        // Midtrans mengembalikan respons tanpa redirect_url (server key salah / error)
        setIsLoading(false)
        setErrorMsg(
          '⚠️ Gagal mendapatkan URL pembayaran dari Midtrans. ' +
          'Periksa MIDTRANS_SERVER_KEY di .env.local atau hubungi kasir.'
        )
        return // STOP — jangan panggil onSuccess
      }

      // ── Cash: tampilkan SuccessModal (HANYA untuk cash) ──────────────────
      onSuccess(invoice_number)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
      setErrorMsg(message)
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* ── Redirect Overlay (QRIS/Transfer sedang diarahkan ke Midtrans) ── */}
      {isRedirecting && (
        <div className={styles.redirectOverlay}>
          <div className={styles.redirectCard}>
            <div className={styles.redirectSpinner}>📱</div>
            <h3 className={styles.redirectTitle}>Mengarahkan ke Halaman Pembayaran...</h3>
            <p className={styles.redirectSub}>
              Anda akan segera diarahkan ke halaman QRIS / Transfer Bank.<br />
              <strong>Jangan tutup layar ini.</strong>
            </p>
            <div className={styles.redirectDots}>
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}

      <div className={`${styles.modalContent} bounce-in`}>

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            {step === 2 && (
              <button onClick={() => setStep(1)} className={styles.backBtn} disabled={isLoading}>
                ← Kembali
              </button>
            )}
          </div>
          <h2 className={styles.headerTitle}>
            {step === 1 ? 'Pilih Cara Bayar' : 'Konfirmasi Pesanan'}
          </h2>
          <button onClick={onClose} className={styles.closeBtn} disabled={isLoading}>✕</button>
        </div>

        {/* ── Error ── */}
        {errorMsg && <div className={styles.errorAlert}>⚠️ {errorMsg}</div>}

        {/* ── Body ── */}
        <div className={styles.modalBody}>

          {/* Step 1: Pilih Metode Bayar */}
          {step === 1 && (
            <div className={styles.step1}>
              <p className={styles.stepHint}>Ketuk metode pembayaran yang Anda inginkan</p>
              <div className={styles.paymentMethods}>
                {PAYMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`${styles.paymentCard} ${paymentMethod === opt.value ? styles.paymentActive : ''}`}
                    style={paymentMethod === opt.value ? { '--active-color': opt.color } as React.CSSProperties : {}}
                  >
                    <span className={styles.paymentIcon}>{opt.icon}</span>
                    <span className={styles.paymentName}>{opt.label}</span>
                    <small className={styles.paymentSub}>{opt.sublabel}</small>
                    {paymentMethod === opt.value && (
                      <span className={styles.checkMark}>✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Ringkasan total di step 1 */}
              <div className={styles.miniSummary}>
                <span>{cart.length} item</span>
                <span className={styles.miniTotal}>{formatRupiah(totalAmount)}</span>
              </div>
            </div>
          )}

          {/* Step 2: Konfirmasi */}
          {step === 2 && (
            <div className={styles.step2}>
              {/* Daftar item */}
              <div className={styles.summaryList}>
                {cart.map(item => (
                  <div key={item.product.id} className={styles.summaryItem}>
                    <div className={styles.summaryItemInfo}>
                      <span className={styles.summaryQty}>{item.qty}×</span>
                      <span className={styles.summaryName}>{item.product.name}</span>
                    </div>
                    <span className={styles.summaryPrice}>{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className={styles.summaryTotal}>
                <span>Total Pembayaran</span>
                <span className={styles.totalAmount}>{formatRupiah(totalAmount)}</span>
              </div>

              {/* Metode terpilih */}
              <div
                className={styles.selectedPayment}
                style={{ '--active-color': selectedOption.color } as React.CSSProperties}
              >
                <span className={styles.selectedIcon}>{selectedOption.icon}</span>
                <div>
                  <div className={styles.selectedLabel}>{selectedOption.label}</div>
                  <div className={styles.selectedSub}>{selectedOption.sublabel}</div>
                </div>
              </div>

              {/* Info kontekstual */}
              {paymentMethod === 'cash' && (
                <div className={styles.infoBox}>
                  💡 Setelah tekan <strong>"Proses Pesanan"</strong>, Anda akan mendapat nomor pesanan.
                  Sebutkan nomor ini ke kasir dan lakukan pembayaran tunai di sana.
                </div>
              )}
              {(paymentMethod === 'qris' || paymentMethod === 'transfer') && (
                <div className={styles.infoBox} style={{ borderColor: '#6366f1' }}>
                  📱 Setelah tekan <strong>"Proses Pesanan"</strong>, Anda akan diarahkan langsung ke
                  halaman pembayaran digital. Selesaikan scan / transfer di layar ini.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.modalFooter}>
          {step === 1 ? (
            <button onClick={handleNext} className={styles.primaryBtn} id="checkout-next-btn">
              Lanjut — {formatRupiah(totalAmount)} →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className={styles.primaryBtn}
              disabled={isLoading || isRedirecting}
              id="checkout-confirm-btn"
            >
              {isLoading || isRedirecting
                ? '⏳ Memproses...'
                : paymentMethod === 'cash'
                  ? '✅ Proses Pesanan'
                  : '📱 Proses & Bayar Sekarang'}
            </button>
          )}
        </div>

      </div>
    </>
  )
}
