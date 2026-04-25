import { POSProduct } from '@/types/pos'
import styles from './ProductGrid.module.css'

interface ProductGridProps {
  products: POSProduct[]
  isLoading: boolean
  onAddToCart: (product: POSProduct) => void
  cartQtyMap: Record<string, number> // Untuk mengecek berapa qty di cart saat ini
}

export default function ProductGrid({ products, isLoading, onAddToCart, cartQtyMap }: ProductGridProps) {
  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number)
  }

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className={styles.productCard}>
            <div className={`skeleton ${styles.skeletonImg}`}></div>
            <div className={`skeleton ${styles.skeletonTitle}`}></div>
            <div className={`skeleton ${styles.skeletonPrice}`}></div>
            <div className={`skeleton ${styles.skeletonBtn}`}></div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Tidak ada produk yang tersedia saat ini.</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {products.map(product => {
        const inCartQty = cartQtyMap[product.id] || 0
        const isOutOfStock = product.stock <= 0 && !product.allow_negative_stock
        const isLowStock = product.stock <= product.stock_minimum && product.stock > 0

        return (
          <div key={product.id} className={`${styles.productCard} fade-in`}>
            {/* Status Badges */}
            <div className={styles.badgeContainer}>
              {isOutOfStock ? (
                <span className={`${styles.badge} ${styles.badgeDanger}`}>Habis</span>
              ) : isLowStock ? (
                <span className={`${styles.badge} ${styles.badgeWarning}`}>Sisa {product.stock}</span>
              ) : null}
            </div>

            <div className={styles.imagePlaceholder}>
              {/* Fallback image as emoji for demo based on category or name */}
              <span className={styles.emoji}>
                {product.name.toLowerCase().includes('semen') ? '🧱' : 
                 product.name.toLowerCase().includes('cat') ? '🎨' : 
                 product.name.toLowerCase().includes('paku') ? '🔨' : '📦'}
              </span>
            </div>
            
            <div className={styles.productInfo}>
              <h3 className={styles.productName}>{product.name}</h3>
              <p className={styles.productCategory}>{product.category?.name || 'Umum'} • {product.sku}</p>
              
              <div className={styles.priceRow}>
                <span className={styles.price}>{formatRupiah(product.selling_price)}</span>
                <span className={styles.unit}>/{product.unit}</span>
              </div>

              {inCartQty > 0 ? (
                <button 
                  className={styles.addBtnActive}
                  onClick={() => onAddToCart(product)}
                  disabled={isOutOfStock}
                >
                  ✓ Di Keranjang ({inCartQty})
                </button>
              ) : (
                <button 
                  className={styles.addBtn}
                  onClick={() => onAddToCart(product)}
                  disabled={isOutOfStock}
                >
                  + Tambah
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
