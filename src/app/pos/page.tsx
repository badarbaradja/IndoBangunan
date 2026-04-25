'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import styles from './pos.module.css'
import CartPanel from '@/components/pos/CartPanel'
import ProductGrid from '@/components/pos/ProductGrid'
import CheckoutModal from '@/components/pos/CheckoutModal'
import SuccessModal from '@/components/pos/SuccessModal'
import type { Product, CartItem } from '@/types/pos'

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastOrder, setLastOrder] = useState<{ invoice: string; total: number } | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/products?${params}&limit=100`)
      const data = await res.json()
      const list: Product[] = data.products ?? []
      setProducts(list)
      const cats = ['Semua', ...Array.from(new Set(list.map((p) => p.category?.name ?? 'Lainnya')))]
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const filteredProducts = products.filter((p) => {
    if (activeCategory !== 'Semua' && (p.category?.name ?? 'Lainnya') !== activeCategory) return false
    return true
  })

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id)
      if (existing) {
        return prev.map((c) =>
          c.product_id === product.id ? { ...c, qty: c.qty + 1 } : c
        )
      }
      return [...prev, {
        product_id: product.id,
        qty: 1,
        unit_price: product.selling_price,
        product_name: product.name,
        unit: product.unit,
        max_stock: product.stock,
      }]
    })
  }

  const updateQty = (product_id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.product_id !== product_id))
    } else {
      setCart((prev) => prev.map((c) => c.product_id === product_id ? { ...c, qty } : c))
    }
  }

  const removeItem = (product_id: string) => {
    setCart((prev) => prev.filter((c) => c.product_id !== product_id))
  }

  const clearCart = () => setCart([])

  const cartTotal = cart.reduce((sum, c) => sum + c.unit_price * c.qty, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)

  const handleOrderSuccess = (invoice: string, total: number) => {
    setLastOrder({ invoice, total })
    setShowCheckout(false)
    setShowSuccess(true)
    setCart([])
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    setLastOrder(null)
  }

  return (
    <div className={styles.posLayout}>
      {/* ── Left Panel: Product Browser ─────────────────────── */}
      <div className={styles.productPanel}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <div className={styles.brandBar}>
            <Image src="/logo.jpeg" alt="IndoBangunan Logo" width={220} height={44} style={{ objectFit: 'contain' }} />
          </div>

          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Cari produk, SKU, atau nama..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="pos-search"
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Mobile Cart Toggle */}
          <button
            className={styles.mobileCartBtn}
            onClick={() => setCartOpen(true)}
            id="mobile-cart-toggle"
          >
            🛒
            {cartCount > 0 && <span className={styles.mobileCartBadge}>{cartCount}</span>}
          </button>
        </div>

        {/* Category Tabs */}
        <div className={styles.categoryBar}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`${styles.categoryTab} ${activeCategory === cat ? styles.categoryTabActive : ''}`}
              onClick={() => setActiveCategory(cat)}
              id={`cat-${cat.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <ProductGrid
          products={filteredProducts}
          cart={cart}
          loading={loading}
          onAdd={addToCart}
          onUpdateQty={updateQty}
        />
      </div>

      {/* ── Right Panel: Cart ────────────────────────────────── */}
      <CartPanel
        cart={cart}
        total={cartTotal}
        cartCount={cartCount}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onUpdateQty={updateQty}
        onRemove={removeItem}
        onClear={clearCart}
        onCheckout={() => setShowCheckout(true)}
      />

      {/* ── Modals ───────────────────────────────────────────── */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          total={cartTotal}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {showSuccess && lastOrder && (
        <SuccessModal
          invoice={lastOrder.invoice}
          total={lastOrder.total}
          onClose={handleSuccessClose}
        />
      )}
    </div>
  )
}
