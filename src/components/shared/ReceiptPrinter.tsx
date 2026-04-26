'use client'

import { useEffect, useRef } from 'react'
import styles from './ReceiptPrinter.module.css'

interface ReceiptItem {
  product_name: string
  product_sku: string
  qty: number
  unit_price: number
  line_total: number
}

interface ReceiptProps {
  invoiceNumber: string
  customerName?: string | null
  customerPhone?: string | null
  items: ReceiptItem[]
  subtotal: number
  discountAmount?: number
  taxAmount?: number
  total: number
  paymentMethod: string
  cashierName?: string
  createdAt?: string
  onClose: () => void
}

export default function ReceiptPrinter({
  invoiceNumber,
  customerName,
  customerPhone,
  items,
  subtotal,
  discountAmount = 0,
  taxAmount = 0,
  total,
  paymentMethod,
  cashierName,
  createdAt,
  onClose,
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const formatRupiah = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  const formatDate = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : new Date()
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=380,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Struk Pembayaran - ${invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              color: #000;
              background: #fff;
              padding: 16px;
              max-width: 320px;
              margin: 0 auto;
            }
            .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
            .receipt-logo { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
            .receipt-tagline { font-size: 10px; margin-top: 4px; }
            .receipt-info { margin-bottom: 8px; }
            .receipt-info div { display: flex; justify-content: space-between; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .items-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 6px; }
            .item { margin-bottom: 6px; }
            .item-name { font-weight: bold; }
            .item-detail { display: flex; justify-content: space-between; color: #444; }
            .totals { margin-top: 8px; }
            .totals div { display: flex; justify-content: space-between; }
            .total-final { font-weight: 900; font-size: 14px; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
            .receipt-footer { text-align: center; margin-top: 16px; border-top: 1px dashed #000; padding-top: 12px; font-size: 10px; }
            @media print { button { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <div class="receipt-logo">INDOBANGUNAN</div>
            <div class="receipt-tagline">Toko Bangunan Self-Service Modern</div>
          </div>
          
          <div class="receipt-info">
            <div><span>Invoice:</span><span>${invoiceNumber}</span></div>
            <div><span>Tanggal:</span><span>${formatDate(createdAt)}</span></div>
            ${customerName ? `<div><span>Pelanggan:</span><span>${customerName}</span></div>` : ''}
            ${customerPhone ? `<div><span>Telp:</span><span>${customerPhone}</span></div>` : ''}
            ${cashierName ? `<div><span>Kasir:</span><span>${cashierName}</span></div>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <div class="items-header">
            <span>Produk</span><span>Subtotal</span>
          </div>
          
          ${items.map(item => `
            <div class="item">
              <div class="item-name">${item.product_name}</div>
              <div class="item-detail">
                <span>${item.qty} x ${formatRupiah(item.unit_price)}</span>
                <span>${formatRupiah(item.line_total)}</span>
              </div>
            </div>
          `).join('')}
          
          <div class="divider"></div>
          
          <div class="totals">
            <div><span>Subtotal</span><span>${formatRupiah(subtotal)}</span></div>
            ${discountAmount > 0 ? `<div><span>Diskon</span><span>-${formatRupiah(discountAmount)}</span></div>` : ''}
            ${taxAmount > 0 ? `<div><span>Pajak</span><span>${formatRupiah(taxAmount)}</span></div>` : ''}
            <div class="total-final">
              <span>TOTAL</span><span>${formatRupiah(total)}</span>
            </div>
            <div><span>Metode</span><span>${paymentMethod.toUpperCase()}</span></div>
          </div>
          
          <div class="receipt-footer">
            <p>Terima kasih atas kunjungan Anda!</p>
            <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
            <p>kecuali ada kerusakan dari pabrik.</p>
          </div>
          
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  useEffect(() => {
    // Auto-trigger print preview (dapat dinonaktifkan)
    // handlePrint()
  }, [])

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Preview Struk</h2>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        {/* Receipt Preview */}
        <div className={styles.receiptContainer} ref={receiptRef}>
          <div className={styles.receiptHeader}>
            <div className={styles.receiptLogo}>INDOBANGUNAN</div>
            <div className={styles.receiptTagline}>Toko Bangunan Self-Service Modern</div>
          </div>

          <div className={styles.receiptInfo}>
            <div className={styles.infoRow}><span>Invoice</span><span>{invoiceNumber}</span></div>
            <div className={styles.infoRow}><span>Tanggal</span><span>{formatDate(createdAt)}</span></div>
            {customerName && <div className={styles.infoRow}><span>Pelanggan</span><span>{customerName}</span></div>}
            {cashierName && <div className={styles.infoRow}><span>Kasir</span><span>{cashierName}</span></div>}
          </div>

          <div className={styles.divider} />

          {items.map((item, i) => (
            <div key={i} className={styles.item}>
              <div className={styles.itemName}>{item.product_name}</div>
              <div className={styles.itemDetail}>
                <span>{item.qty} x {formatRupiah(item.unit_price)}</span>
                <span>{formatRupiah(item.line_total)}</span>
              </div>
            </div>
          ))}

          <div className={styles.divider} />

          <div className={styles.totals}>
            <div className={styles.infoRow}><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
            {discountAmount > 0 && <div className={styles.infoRow}><span>Diskon</span><span>-{formatRupiah(discountAmount)}</span></div>}
            {taxAmount > 0 && <div className={styles.infoRow}><span>Pajak</span><span>{formatRupiah(taxAmount)}</span></div>}
            <div className={`${styles.infoRow} ${styles.totalFinal}`}>
              <span>TOTAL</span><span>{formatRupiah(total)}</span>
            </div>
            <div className={styles.infoRow}><span>Metode</span><span>{paymentMethod.toUpperCase()}</span></div>
          </div>

          <div className={styles.receiptFooter}>
            <p>Terima kasih atas kunjungan Anda!</p>
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={onClose} className={styles.cancelBtn}>Tutup</button>
          <button onClick={handlePrint} className={styles.printBtn}>
            🖨️ Cetak Struk
          </button>
        </div>
      </div>
    </div>
  )
}
