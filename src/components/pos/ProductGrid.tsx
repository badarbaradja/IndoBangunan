'use client'
import styles from './ProductGrid.module.css'
import type { Product, CartItem } from '@/types/pos'

interface Props {
  products: Product[]
  cart: CartItem[]
  loading: boolean
  onAdd: (product: Product) => void
  onUpdateQty: (product_id: string, qty: number) => void
}

function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function ProductGrid({ products, cart, loading, onAdd, onUpdateQty }: Props) {
  const getCartItem = (id: string) => cart.find((c) => c.product_id === id)

  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`${styles.card} ${styles.skeletonCard}`}>
            <div className={`skeleton ${styles.skeletonImg}`} />
            <div className={styles.skeletonBody}>
              <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '60%', height: 12 }} />
              <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '40%', height: 10 }} />
              <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '50%', height: 18 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🔍</div>
        <h3>Produk tidak ditemukan</h3>
        <p>Coba kata kunci lain atau pilih kategori berbeda</p>
      </div>
    )
  }

  return (
    <div className={styles.gridWrapper}>
      <div className={styles.grid}>
        {products.map((product, idx) => {
          const cartItem = getCartItem(product.id)
          const qty = cartItem?.qty ?? 0
          const outOfStock = (product.stock ?? 0) <= 0

          return (
            <div
              key={product.id}
              className={`${styles.card} ${outOfStock ? styles.cardOos : ''} fade-in`}
              style={{ animationDelay: `${idx * 0.04}s` }}
              id={`product-${product.id}`}
            >
              {/* Image */}
              <div className={styles.imgWrapper}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className={styles.img} />
                ) : (
                  <div className={styles.imgPlaceholder}>
                    <span className={styles.imgEmoji}>🧱</span>
                  </div>
                )}

                {/* Badges */}
                {outOfStock && (
                  <div className={styles.osBadge}>Habis</div>
                )}
                {product.is_low_stock && !outOfStock && (
                  <div className={styles.lowBadge}>⚠️ Stok terbatas</div>
                )}

                {qty > 0 && (
                  <div className={styles.addedBadge}>
                    <span>✓ {qty} {product.unit}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className={styles.cardBody}>
                <div className={styles.categoryChip}>{product.category?.name ?? 'Lainnya'}</div>
                <h3 className={styles.productName}>{product.name}</h3>
                <div className={styles.productSku}>SKU: {product.sku}</div>

                <div className={styles.cardFooter}>
                  <div>
                    <div className={styles.price}>{formatRp(product.selling_price)}</div>
                    <div className={styles.perUnit}>per {product.unit}</div>
                  </div>

                  {/* Add / Qty control */}
                  {outOfStock ? (
                    <div className={styles.oosLabel}>Stok Habis</div>
                  ) : qty === 0 ? (
                    <button
                      className={`${styles.addBtn} ripple-btn`}
                      onClick={() => onAdd(product)}
                      id={`add-${product.id}`}
                    >
                      + Tambah
                    </button>
                  ) : (
                    <div className={styles.qtyControl}>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => onUpdateQty(product.id, qty - 1)}
                      >−</button>
                      <span className={styles.qtyVal}>{qty}</span>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => onUpdateQty(product.id, qty + 1)}
                        disabled={qty >= (product.stock ?? 999)}
                      >+</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
