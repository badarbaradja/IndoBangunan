'use client'
import styles from './CartPanel.module.css'
import type { CartItem } from '@/types/pos'

interface Props {
  cart: CartItem[]
  total: number
  cartCount: number
  open: boolean
  onClose: () => void
  onUpdateQty: (id: string, qty: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  onCheckout: () => void
}

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function CartPanel({
  cart, total, cartCount, open, onClose, onUpdateQty, onRemove, onClear, onCheckout
}: Props) {
  return (
    <>
      {/* Mobile overlay */}
      {open && <div className={styles.overlay} onClick={onClose} />}

      <aside className={`${styles.panel} ${open ? styles.panelOpen : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>🛒</span>
            <div>
              <div className={styles.headerTitle}>Keranjang</div>
              <div className={styles.headerSub}>{cartCount} item{cartCount !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className={styles.headerRight}>
            {cart.length > 0 && (
              <button className={styles.clearBtn} onClick={onClear} id="cart-clear">
                Hapus Semua
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose} id="cart-close">✕</button>
          </div>
        </div>

        {/* Items */}
        <div className={styles.items}>
          {cart.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIll}>🛒</div>
              <p className={styles.emptyTitle}>Keranjang Kosong</p>
              <p className={styles.emptySub}>Tambahkan produk dari katalog di sebelah kiri</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className={`${styles.item} slide-in-right`} id={`cart-item-${item.product_id}`}>
                <div className={styles.itemEmoji}>🧱</div>
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{item.product_name}</div>
                  <div className={styles.itemUnit}>{formatRp(item.unit_price)} / {item.unit}</div>
                </div>
                <div className={styles.itemRight}>
                  <div className={styles.qtyRow}>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => onUpdateQty(item.product_id, item.qty - 1)}
                    >−</button>
                    <span className={styles.qtyVal}>{item.qty}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => onUpdateQty(item.product_id, item.qty + 1)}
                      disabled={item.qty >= item.max_stock}
                    >+</button>
                  </div>
                  <div className={styles.itemSubtotal}>{formatRp(item.unit_price * item.qty)}</div>
                  <button
                    className={styles.removeBtn}
                    onClick={() => onRemove(item.product_id)}
                    title="Hapus item"
                  >🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary & Checkout */}
        {cart.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.summaryRow}>
              <span>Subtotal ({cartCount} item)</span>
              <span>{formatRp(total)}</span>
            </div>
            <div className={styles.summaryRowTotal}>
              <span>Total</span>
              <span className={styles.totalAmount}>{formatRp(total)}</span>
            </div>
            <button
              className={`${styles.checkoutBtn} ripple-btn`}
              onClick={onCheckout}
              id="checkout-btn"
            >
              <span>🧾</span>
              Checkout Sekarang
            </button>
            <p className={styles.footerNote}>
              💡 Tunjukkan nomor pesanan di kasir untuk pengambilan barang
            </p>
          </div>
        )}
      </aside>
    </>
  )
}
