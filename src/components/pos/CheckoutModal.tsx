'use client'

import { useState } from 'react'
import { POSCartItem } from '@/types/pos'
import styles from './CheckoutModal.module.css'

interface CheckoutModalProps {
  cart: POSCartItem[]
  onClose: () => void
  onSuccess: (invoiceNumber: string) => void
}

export default function CheckoutModal({ cart, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    payment_method: 'cash'
  })

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0)

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
  }

  const handleNext = () => {
    if (!formData.payment_method) {
      setErrorMsg('Pilih metode pembayaran terlebih dahulu')
      return
    }
    setErrorMsg('')
    setStep(2)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setErrorMsg('')

    try {
      const payload = {
        items: cart.map(item => ({ product_id: item.product.id, qty: item.qty })),
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        payment_method: formData.payment_method
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses pesanan')
      }

      // Jika ada payment url dari Midtrans, redirect pelanggan
      if (data.data.gateway_payment_url) {
        window.open(data.data.gateway_payment_url, '_blank')
      }

      onSuccess(data.data.invoice_number)
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem')
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} bounce-in`}>
        <div className={styles.modalHeader}>
          <h2>{step === 1 ? 'Informasi Pesanan' : 'Konfirmasi Pesanan'}</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

        <div className={styles.modalBody}>
          {step === 1 && (
            <div className={styles.step1}>
              <div className={styles.inputGroup}>
                <label>Nama Anda (Opsional)</label>
                <input 
                  type="text" 
                  value={formData.customer_name} 
                  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                  placeholder="Misal: Bapak Budi" 
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Nomor Telepon (Opsional)</label>
                <input 
                  type="tel" 
                  value={formData.customer_phone} 
                  onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                  placeholder="0812xxxxxx" 
                />
              </div>

              <div className={styles.paymentSection}>
                <label className={styles.sectionLabel}>Metode Pembayaran *</label>
                <div className={styles.paymentMethods}>
                  <label className={`${styles.paymentCard} ${formData.payment_method === 'cash' ? styles.paymentActive : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="cash"
                      checked={formData.payment_method === 'cash'}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    />
                    <div className={styles.paymentInfo}>
                      <span className={styles.paymentIcon}>💵</span>
                      <span className={styles.paymentName}>Tunai / Cash</span>
                      <small>Bayar di Kasir</small>
                    </div>
                  </label>
                  
                  <label className={`${styles.paymentCard} ${formData.payment_method === 'qris' ? styles.paymentActive : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="qris"
                      checked={formData.payment_method === 'qris'}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    />
                    <div className={styles.paymentInfo}>
                      <span className={styles.paymentIcon}>📱</span>
                      <span className={styles.paymentName}>QRIS</span>
                      <small>Scan Barcode</small>
                    </div>
                  </label>

                  <label className={`${styles.paymentCard} ${formData.payment_method === 'transfer' ? styles.paymentActive : ''}`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="transfer"
                      checked={formData.payment_method === 'transfer'}
                      onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    />
                    <div className={styles.paymentInfo}>
                      <span className={styles.paymentIcon}>💳</span>
                      <span className={styles.paymentName}>Transfer Bank</span>
                      <small>VA Bank</small>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.step2}>
              <div className={styles.summaryList}>
                {cart.map(item => (
                  <div key={item.product.id} className={styles.summaryItem}>
                    <div className={styles.summaryItemInfo}>
                      <span className={styles.summaryQty}>{item.qty}x</span>
                      <span className={styles.summaryName}>{item.product.name}</span>
                    </div>
                    <span className={styles.summaryPrice}>{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className={styles.summaryTotal}>
                <span>Total Pembayaran:</span>
                <span className={styles.totalAmount}>{formatRupiah(totalAmount)}</span>
              </div>
              <p className={styles.paymentNote}>
                Metode Pembayaran: <strong>{formData.payment_method.toUpperCase()}</strong>
              </p>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {step === 1 ? (
            <button onClick={handleNext} className={styles.primaryBtn}>
              Lanjut Konfirmasi
            </button>
          ) : (
            <>
              <button onClick={() => setStep(1)} className={styles.secondaryBtn} disabled={isLoading}>
                Kembali
              </button>
              <button onClick={handleSubmit} className={styles.primaryBtn} disabled={isLoading}>
                {isLoading ? 'Memproses...' : 'Proses Pesanan'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
