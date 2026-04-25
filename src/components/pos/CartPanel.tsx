import { POSCartItem } from '@/types/pos'
import styles from './CartPanel.module.css'

interface CartPanelProps {
  cart: POSCartItem[]
  onUpdateQty: (productId: string, delta: number) => void
  onRemove: (productId: string) => void
  onCheckoutClick: () => void
}

export default function CartPanel({ cart, onUpdateQty, onRemove, onCheckoutClick }: CartPanelProps) {
  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
  }

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  // Misal belum ada pajak/diskon global, total = subtotal
  const total = subtotal

  return (
    <div className={styles.cartPanel}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.cartIcon}>🛒</span> Keranjang
        </h2>
        <span className={styles.itemCount}>{cart.length} item</span>
      </div>

      <div className={styles.itemList}>
        {cart.length === 0 ? (
          <div className={styles.emptyCart}>
            <div className={styles.emptyIcon}>🛍️</div>
            <p>Keranjang masih kosong</p>
            <small>Pilih produk di sebelah kiri untuk mulai memesan</small>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.product.id} className={`${styles.cartItem} slide-up`}>
              <div className={styles.itemInfo}>
                <h4 className={styles.itemName}>{item.product.name}</h4>
                <div className={styles.itemPrice}>
                  {formatRupiah(item.product.selling_price)} <span className={styles.unit}>/{item.product.unit}</span>
                </div>
              </div>
              
              <div className={styles.itemControls}>
                <div className={styles.qtyControl}>
                  <button 
                    className={styles.qtyBtn} 
                    onClick={() => onUpdateQty(item.product.id, -1)}
                    disabled={item.qty <= 1}
                  >
                    -
                  </button>
                  <span className={styles.qtyValue}>{item.qty}</span>
                  <button 
                    className={styles.qtyBtn} 
                    onClick={() => onUpdateQty(item.product.id, 1)}
                    disabled={!item.product.allow_negative_stock && item.qty >= item.product.stock}
                  >
                    +
                  </button>
                </div>
                
                <div className={styles.itemSubtotal}>
                  {formatRupiah(item.subtotal)}
                </div>
                
                <button 
                  className={styles.removeBtn}
                  onClick={() => onRemove(item.product.id)}
                  title="Hapus item"
                >
                  &times;
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.summaryRow}>
          <span>Subtotal</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>
        <div className={`${styles.summaryRow} ${styles.totalRow}`}>
          <span>Total</span>
          <span className={styles.totalAmount}>{formatRupiah(total)}</span>
        </div>
        
        <button 
          className={styles.checkoutBtn}
          disabled={cart.length === 0}
          onClick={onCheckoutClick}
        >
          Checkout Sekarang
        </button>
      </div>
    </div>
  )
}
