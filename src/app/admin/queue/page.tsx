'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import styles from './queue.module.css'

interface QueueItem {
  id: string
  invoice_number: string
  customer_name: string | null
  total: number
  payment_method: string
  status: string
  created_at: string
  item_count?: number
}

interface ConfirmState {
  saleId: string | null
  isLoading: boolean
  amountPaid: string
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(iso))

const formatRelative = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff} detik lalu`
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  return `${Math.floor(diff / 3600)} jam lalu`
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'error'>('connecting')
  const [confirm, setConfirm] = useState<ConfirmState>({ saleId: null, isLoading: false, amountPaid: '' })
  const [errorMsg, setErrorMsg] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ── Fetch antrean awal ──────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from('sales')
      .select('id, invoice_number, customer_name, total, payment_method, status, created_at')
      .eq('status', 'pending')
      .eq('payment_method', 'cash')
      .order('created_at', { ascending: true }) // FIFO: yang paling lama duluan

    if (!error && data) {
      setQueue(data as QueueItem[])
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  // ── Supabase Realtime Subscription ─────────────────────────────
  useEffect(() => {
    const supabase = createBrowserClient()

    const channel = supabase
      .channel('cashier-queue-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales',
          filter: 'payment_method=eq.cash',
        },
        (payload) => {
          const newSale = payload.new as QueueItem
          // Hanya tambah jika masih pending
          if (newSale.status === 'pending') {
            setQueue(prev => {
              // Hindari duplikat
              if (prev.find(q => q.id === newSale.id)) return prev
              return [...prev, newSale]
            })
            setLastUpdate(new Date())

            // Notifikasi suara (opsional — perlu user gesture)
            try { audioRef.current?.play().catch(() => {}) } catch { /* noop */ }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sales',
        },
        (payload) => {
          const updated = payload.new as QueueItem
          // Jika sale sudah tidak pending, hapus dari antrean
          if (updated.status !== 'pending') {
            setQueue(prev => prev.filter(q => q.id !== updated.id))
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('live')
        else if (status === 'CHANNEL_ERROR') setRealtimeStatus('error')
        else setRealtimeStatus('connecting')
      })

    // Cleanup saat unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // Empty deps — channel dibuat sekali saja

  // ── Konfirmasi pembayaran ───────────────────────────────────────
  const handleConfirmOpen = (saleId: string, total: number) => {
    setConfirm({ saleId, isLoading: false, amountPaid: String(total) })
    setErrorMsg('')
  }

  const handleConfirmClose = () => {
    setConfirm({ saleId: null, isLoading: false, amountPaid: '' })
    setErrorMsg('')
  }

  const handleConfirmSubmit = async () => {
    if (!confirm.saleId) return
    setConfirm(prev => ({ ...prev, isLoading: true }))
    setErrorMsg('')

    try {
      const res = await fetch('/api/queue/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_id: confirm.saleId,
          amount_paid: Number(confirm.amountPaid),
        }),
      })

      const data = await res.json() as { success?: boolean; error?: string; invoice_number?: string }

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengkonfirmasi pembayaran')
      }

      // Hapus dari antrean secara mulus
      setQueue(prev => prev.filter(q => q.id !== confirm.saleId))
      setLastUpdate(new Date())
      handleConfirmClose()

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setErrorMsg(msg)
      setConfirm(prev => ({ ...prev, isLoading: false }))
    }
  }

  const selectedItem = queue.find(q => q.id === confirm.saleId)
  const change = selectedItem
    ? Math.max(0, Number(confirm.amountPaid) - selectedItem.total)
    : 0

  return (
    <div className="fade-in">
      {/* ── Notif audio (silent bell) ── */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>🧾 Antrean Kasir</h1>
          <p className={styles.pageSub}>
            Pesanan Cash dari Kiosk yang menunggu pembayaran. Data diperbarui secara <strong>realtime</strong>.
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.statusBadge} ${styles[`status_${realtimeStatus}`]}`}>
            <span className={styles.statusDot} />
            {realtimeStatus === 'live' && 'Live'}
            {realtimeStatus === 'connecting' && 'Menghubungkan...'}
            {realtimeStatus === 'error' && 'Koneksi Terputus'}
          </div>
          {lastUpdate && (
            <div className={styles.lastUpdateNote}>
              Update terakhir: {formatTime(lastUpdate.toISOString())}
            </div>
          )}
          <button onClick={fetchQueue} className={styles.refreshBtn}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── Counter bar ── */}
      <div className={styles.counterBar}>
        <div className={styles.counterItem}>
          <span className={styles.counterNum}>{queue.length}</span>
          <span className={styles.counterLabel}>Menunggu Bayar</span>
        </div>
        <div className={styles.counterItem}>
          <span className={styles.counterNum}>
            {formatRupiah(queue.reduce((s, q) => s + q.total, 0))}
          </span>
          <span className={styles.counterLabel}>Total Nilai Antrean</span>
        </div>
      </div>

      {/* ── Queue Grid ── */}
      {isLoading ? (
        <div className={styles.emptyState}>
          <div className={styles.spinner} />
          <p>Memuat antrean...</p>
        </div>
      ) : queue.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✅</div>
          <h3>Antrean Kosong</h3>
          <p>Tidak ada pesanan Cash yang menunggu pembayaran saat ini.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text3)', marginTop: 8 }}>
            Pesanan baru dari Kiosk akan muncul secara otomatis di sini.
          </p>
        </div>
      ) : (
        <div className={styles.queueGrid}>
          {queue.map((item, idx) => (
            <div
              key={item.id}
              className={`${styles.queueCard} ${idx === 0 ? styles.queueCardFirst : ''}`}
            >
              {/* Badge nomor antrean */}
              <div className={styles.queueBadge}>#{idx + 1}</div>

              {/* Invoice */}
              <div className={styles.invoiceNum}>{item.invoice_number}</div>

              {/* Pelanggan */}
              <div className={styles.customerName}>
                {item.customer_name || 'Walk-in Kiosk'}
              </div>

              {/* Total */}
              <div className={styles.totalAmount}>{formatRupiah(item.total)}</div>

              {/* Waktu */}
              <div className={styles.timeInfo}>
                <span className={styles.timeAgo}>{formatRelative(item.created_at)}</span>
                <span className={styles.timeExact}>{formatTime(item.created_at)}</span>
              </div>

              {/* Tombol Konfirmasi */}
              <button
                onClick={() => handleConfirmOpen(item.id, item.total)}
                className={styles.confirmBtn}
                id={`confirm-btn-${item.id}`}
              >
                💰 Terima Pembayaran
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Konfirmasi Pembayaran ── */}
      {confirm.saleId && selectedItem && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} bounce-in`}>

            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Konfirmasi Pembayaran Tunai</h2>
              <button onClick={handleConfirmClose} className={styles.modalClose} disabled={confirm.isLoading}>✕</button>
            </div>

            {errorMsg && (
              <div className={styles.errorAlert}>⚠️ {errorMsg}</div>
            )}

            {/* Info pesanan */}
            <div className={styles.orderSummary}>
              <div className={styles.summaryRow}>
                <span>Invoice</span>
                <strong className={styles.monoFont}>{selectedItem.invoice_number}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Total Tagihan</span>
                <strong className={styles.priceHighlight}>{formatRupiah(selectedItem.total)}</strong>
              </div>
            </div>

            {/* Input uang diterima */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Uang Diterima (Rp)</label>
              <input
                type="number"
                value={confirm.amountPaid}
                onChange={e => setConfirm(prev => ({ ...prev, amountPaid: e.target.value }))}
                className={styles.amountInput}
                placeholder="Masukkan jumlah uang"
                min={selectedItem.total}
                disabled={confirm.isLoading}
                autoFocus
              />
              {/* Quick amount buttons */}
              <div className={styles.quickAmounts}>
                {[0, 5000, 10000, 20000, 50000].map(extra => (
                  <button
                    key={extra}
                    onClick={() => setConfirm(prev => ({
                      ...prev,
                      amountPaid: String(selectedItem.total + extra)
                    }))}
                    className={styles.quickBtn}
                    disabled={confirm.isLoading}
                  >
                    {extra === 0 ? 'Pas' : `+${formatRupiah(extra)}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Kembalian */}
            <div className={`${styles.changeRow} ${change > 0 ? styles.changePos : ''}`}>
              <span>Kembalian</span>
              <strong className={styles.changeBig}>{formatRupiah(change)}</strong>
            </div>

            {/* Tombol confirm */}
            <div className={styles.modalActions}>
              <button
                onClick={handleConfirmClose}
                className={styles.cancelBtn}
                disabled={confirm.isLoading}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSubmit}
                className={styles.submitBtn}
                disabled={confirm.isLoading || Number(confirm.amountPaid) < selectedItem.total}
                id="confirm-payment-submit"
              >
                {confirm.isLoading ? '⏳ Memproses...' : '✅ Konfirmasi Lunas'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
