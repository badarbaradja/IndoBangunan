'use client'
import { useState } from 'react'
import styles from './CheckoutModal.module.css'
import type { CartItem } from '@/types/pos'

interface Props {
  cart: CartItem[]
  total: number
  onClose: () => void
  onSuccess: (invoice: string, total: number) => void
}

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Tunai', icon: '💵', desc: 'Bayar langsung ke kasir' },
  { id: 'qris', label: 'QRIS', icon: '📱', desc: 'Scan QR code untuk bayar' },
  { id: 'transfer', label: 'Transfer', icon: '🏦', desc: 'Transfer bank / e-wallet' },
]

export default function CheckoutModal({ cart, total, onClose, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'review'>('form')

  const cartCount = cart.reduce((s, c) => s + c.qty, 0)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      // Guest checkout — kita kirim langsung tanpa auth
      // Untuk demo: kita buat invoice lokal jika belum ada backend auth
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name || null,
          customer_phone: phone || null,
          items: cart.map((c) => ({ product_id: c.product_id, qty: c.qty })),
          payment_method: payMethod,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Terjadi kesalahan, coba lagi.')
        return
      }
      onSuccess(data.invoice_number, data.total)
    } catch {
      setError('Koneksi gagal. Pastikan internet tersambung.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className={`${styles.modal} slide-up`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>🧾</div>
            <div>
              <h2 className={styles.title}>Checkout</h2>
              <p className={styles.subtitle}>{cartCount} item · {formatRp(total)}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} disabled={loading}>✕</button>
        </div>

        {/* Step Indicator */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${step === 'form' ? styles.stepActive : styles.stepDone}`}>
            <div className={styles.stepNum}>{step === 'review' ? '✓' : '1'}</div>
            <span>Info & Pembayaran</span>
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step === 'review' ? styles.stepActive : ''}`}>
            <div className={styles.stepNum}>2</div>
            <span>Konfirmasi</span>
          </div>
        </div>

        <div className={styles.body}>
          {step === 'form' ? (
            <>
              {/* Optional customer info */}
              <div className={styles.section}>
                <div className={styles.sectionLabel}>👤 Informasi Pembeli (Opsional)</div>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nama</label>
                    <input
                      id="checkout-name"
                      type="text"
                      className={styles.input}
                      placeholder="Nama kamu (opsional)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>No. Telepon</label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      className={styles.input}
                      placeholder="08xx-xxxx-xxxx (opsional)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className={styles.section}>
                <div className={styles.sectionLabel}>💳 Metode Pembayaran</div>
                <div className={styles.paymentOptions}>
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      className={`${styles.paymentOption} ${payMethod === m.id ? styles.paymentOptionActive : ''}`}
                      onClick={() => setPayMethod(m.id)}
                      id={`pay-${m.id}`}
                    >
                      <span className={styles.payIcon}>{m.icon}</span>
                      <div>
                        <div className={styles.payLabel}>{m.label}</div>
                        <div className={styles.payDesc}>{m.desc}</div>
                      </div>
                      {payMethod === m.id && <div className={styles.payCheck}>✓</div>}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={`${styles.nextBtn} ripple-btn`}
                onClick={() => setStep('review')}
                id="checkout-next"
              >
                Lanjut ke Konfirmasi →
              </button>
            </>
          ) : (
            <>
              {/* Order Review */}
              <div className={styles.section}>
                <div className={styles.sectionLabel}>📋 Ringkasan Pesanan</div>
                <div className={styles.orderItems}>
                  {cart.map((item) => (
                    <div key={item.product_id} className={styles.orderItem}>
                      <span className={styles.orderItemName}>{item.product_name}</span>
                      <span className={styles.orderItemQty}>{item.qty} {item.unit}</span>
                      <span className={styles.orderItemTotal}>{formatRp(item.unit_price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className={styles.summaryCard}>
                {name && (
                  <div className={styles.summaryRow}>
                    <span>Nama</span><span>{name}</span>
                  </div>
                )}
                <div className={styles.summaryRow}>
                  <span>Metode Bayar</span>
                  <span>{PAYMENT_METHODS.find(m => m.id === payMethod)?.label}</span>
                </div>
                <div className={styles.summaryRowTotal}>
                  <span>Total</span>
                  <span className={styles.totalAmt}>{formatRp(total)}</span>
                </div>
              </div>

              {error && (
                <div className={styles.errorBox}>⚠️ {error}</div>
              )}

              <div className={styles.btnRow}>
                <button className={styles.backBtn} onClick={() => setStep('form')} disabled={loading}>
                  ← Kembali
                </button>
                <button
                  className={`${styles.confirmBtn} ripple-btn`}
                  onClick={handleSubmit}
                  disabled={loading}
                  id="confirm-order"
                >
                  {loading ? (
                    <span className={styles.spinner} />
                  ) : (
                    <><span>✅</span> Konfirmasi Pesanan</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
