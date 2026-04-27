'use client'

import { useEffect, useState, useCallback } from 'react'
import ProductGrid from '@/components/pos/ProductGrid'
import CartPanel from '@/components/pos/CartPanel'
import SuccessModal from '@/components/pos/SuccessModal'
import ReceiptPrinter from '@/components/shared/ReceiptPrinter'
import PaymentSelectionView, { PaymentMethod } from '@/components/pos/PaymentSelectionView'
import OrderConfirmationModal from '@/components/pos/OrderConfirmationModal'
import { POSProduct, POSCartItem } from '@/types/pos'
import styles from './pos.module.css'
import Image from 'next/image'
import Link from 'next/link'

// Data struk yang disimpan setelah checkout sukses
interface ReceiptData {
  invoiceNumber: string
  items: Array<{
    product_name: string
    product_sku: string
    qty: number
    unit_price: number
    line_total: number
  }>
  subtotal: number
  total: number
}

export default function POSPage() {
  const [products, setProducts] = useState<POSProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<POSCartItem[]>([])

  // ── UI State ──
  const [view, setView] = useState<'shop' | 'payment'>('shop')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isProcessingOrder, setIsProcessingOrder] = useState(false)
  const [orderErrorMsg, setOrderErrorMsg] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  // ── State sukses + struk (hanya untuk Cash) ──
  const [successInvoice, setSuccessInvoice] = useState<string | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products')
        const json = await res.json()
        if (res.ok && json.data) {
          setProducts(json.data)
        } else {
          console.error('Failed to fetch products:', json.error)
        }
      } catch (err) {
        console.error('Unexpected error fetching products:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const handleAddToCart = (product: POSProduct) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id)

      const calculateSubtotal = (qty: number) => {
        let price = product.selling_price
        if (product.wholesale_price && product.min_wholesale_qty && qty >= product.min_wholesale_qty) {
          price = product.wholesale_price
        }
        return price * qty
      }

      if (existingItemIndex >= 0) {
        const existingItem = prevCart[existingItemIndex]
        const newQty = existingItem.qty + 1

        if (!product.allow_negative_stock && newQty > product.stock) {
          return prevCart
        }

        const newCart = [...prevCart]
        newCart[existingItemIndex] = {
          ...existingItem,
          qty: newQty,
          subtotal: calculateSubtotal(newQty)
        }
        return newCart
      }

      if (!product.allow_negative_stock && product.stock < 1) {
        return prevCart
      }

      return [
        ...prevCart,
        {
          product,
          qty: 1,
          subtotal: calculateSubtotal(1)
        }
      ]
    })
  }

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prevCart) => {
      const itemIndex = prevCart.findIndex(item => item.product.id === productId)
      if (itemIndex < 0) return prevCart

      const item = prevCart[itemIndex]
      const newQty = item.qty + delta

      if (newQty <= 0) {
        return prevCart.filter(i => i.product.id !== productId)
      }

      if (delta > 0 && !item.product.allow_negative_stock && newQty > item.product.stock) {
        return prevCart
      }

      const calculateSubtotal = (qty: number) => {
        let price = item.product.selling_price
        if (item.product.wholesale_price && item.product.min_wholesale_qty && qty >= item.product.min_wholesale_qty) {
          price = item.product.wholesale_price
        }
        return price * qty
      }

      const newCart = [...prevCart]
      newCart[itemIndex] = {
        ...item,
        qty: newQty,
        subtotal: calculateSubtotal(newQty)
      }
      return newCart
    })
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter(item => item.product.id !== productId))
  }

  const handleConfirmOrder = async () => {
    if (!selectedPaymentMethod) return
    setIsProcessingOrder(true)
    setOrderErrorMsg('')

    try {
      const payload = {
        items: cart.map(item => ({ product_id: item.product.id, qty: item.qty })),
        customer_name: 'Pelanggan Walk-in',
        payment_method: selectedPaymentMethod,
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

      if (selectedPaymentMethod === 'qris' || selectedPaymentMethod === 'transfer') {
        if (gateway_payment_url) {
          setIsRedirecting(true)
          window.location.href = gateway_payment_url
          return
        }
        setIsProcessingOrder(false)
        setOrderErrorMsg('⚠️ Gagal mendapatkan URL pembayaran dari Midtrans. Periksa konfigurasi.')
        return
      }

      // Cash Flow
      handleCheckoutSuccess(invoice_number)
      setShowConfirmation(false)
      setView('shop')
      setIsProcessingOrder(false)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem'
      setOrderErrorMsg(message)
      setIsProcessingOrder(false)
    }
  }

  const handleCheckoutSuccess = (invoiceNumber: string) => {
    const subtotal = cart.reduce((s, i) => s + i.subtotal, 0)

    const receipt: ReceiptData = {
      invoiceNumber,
      items: cart.map(item => ({
        product_name: item.product.name,
        product_sku: item.product.sku,
        qty: item.qty,
        unit_price: item.subtotal / item.qty,
        line_total: item.subtotal,
      })),
      subtotal,
      total: subtotal,
    }

    setReceiptData(receipt)
    setCart([]) 
    setSuccessInvoice(invoiceNumber) 
  }

  const handlePrintReceipt = useCallback(() => {
    if (!receiptData) return

    const formatRupiah = (v: number) =>
      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

    const formatDate = () => new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date())

    const printWindow = window.open('', '_blank', 'width=380,height=650')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Struk - ${receiptData.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; padding: 16px; max-width: 320px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
            .logo { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
            .tagline { font-size: 10px; margin-top: 4px; }
            .info div { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .item { margin-bottom: 6px; }
            .item-name { font-weight: bold; }
            .item-detail { display: flex; justify-content: space-between; color: #444; }
            .totals div { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .total-final { font-weight: 900; font-size: 14px; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
            .footer { text-align: center; margin-top: 16px; border-top: 1px dashed #000; padding-top: 12px; font-size: 10px; line-height: 1.6; }
            .note { background: #f5f5f5; border: 1px dashed #999; padding: 8px; margin-top: 12px; font-size: 11px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">INDOBANGUNAN</div>
            <div class="tagline">Toko Bangunan Self-Service Modern</div>
          </div>
          <div class="info">
            <div><span>Invoice:</span><span>${receiptData.invoiceNumber}</span></div>
            <div><span>Tanggal:</span><span>${formatDate()}</span></div>
            <div><span>Jenis Bayar:</span><span>TUNAI</span></div>
          </div>
          <div class="divider"></div>
          ${receiptData.items.map(item => `
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
            <div class="total-final"><span>TOTAL</span><span>${formatRupiah(receiptData.total)}</span></div>
          </div>
          <div class="note">
            ⚠️ STRUK INI BUKAN BUKTI LUNAS<br>
            Harap bayar di kasir dengan menunjukkan struk ini
          </div>
          <div class="footer">
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
  }, [receiptData])

  const handleSuccessClose = () => {
    setSuccessInvoice(null)
    setReceiptData(null)
  }

  const cartQtyMap = cart.reduce((map, item) => {
    map[item.product.id] = item.qty
    return map
  }, {} as Record<string, number>)

  return (
    <div className={styles.posLayout}>
      
      {isRedirecting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Mengarahkan ke Halaman Pembayaran...</h3>
            <p className="text-gray-500 text-center max-w-sm">Anda akan segera diarahkan ke halaman QRIS / Transfer Bank.<br/><strong>Jangan tutup layar ini.</strong></p>
          </div>
        </div>
      )}

      {view === 'shop' ? (
        <>
          <main className={styles.mainContent}>
            <header className={styles.header}>
              <div className={styles.brand}>
                <Link href="/">
                  <Image src="/logo.jpeg" alt="IndoBangunan" width={140} height={32} style={{ objectFit: 'contain' }} />
                </Link>
              </div>
              <div className={styles.headerTitle}>
                <h2>Pilih Produk Anda</h2>
                <p>Ketuk pada produk untuk menambahkan ke keranjang</p>
              </div>
            </header>

            <div className={styles.gridWrapper}>
              <ProductGrid
                products={products}
                isLoading={isLoading}
                onAddToCart={handleAddToCart}
                cartQtyMap={cartQtyMap}
              />
            </div>
          </main>

          <aside className={styles.cartSidebar}>
            <CartPanel
              cart={cart}
              onUpdateQty={handleUpdateQty}
              onRemove={handleRemoveFromCart}
              onCheckoutClick={() => setView('payment')}
            />
          </aside>
        </>
      ) : (
        <PaymentSelectionView 
          cart={cart} 
          onBack={() => setView('shop')}
          onNext={(method) => {
            setSelectedPaymentMethod(method)
            setShowConfirmation(true)
          }}
        />
      )}

      {showConfirmation && selectedPaymentMethod && (
        <OrderConfirmationModal
          cart={cart}
          paymentMethod={selectedPaymentMethod}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirmOrder}
          isProcessing={isProcessingOrder}
          errorMsg={orderErrorMsg}
        />
      )}

      {successInvoice && (
        <SuccessModal
          invoiceNumber={successInvoice}
          onClose={handleSuccessClose}
          onPrint={handlePrintReceipt}
        />
      )}

      {showReceiptPreview && receiptData && (
        <ReceiptPrinter
          invoiceNumber={receiptData.invoiceNumber}
          items={receiptData.items}
          subtotal={receiptData.subtotal}
          total={receiptData.total}
          paymentMethod="cash"
          onClose={() => setShowReceiptPreview(false)}
        />
      )}
    </div>
  )
}
