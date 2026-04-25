'use client'

import { useEffect, useState } from 'react'
import ProductGrid from '@/components/pos/ProductGrid'
import CartPanel from '@/components/pos/CartPanel'
import CheckoutModal from '@/components/pos/CheckoutModal'
import SuccessModal from '@/components/pos/SuccessModal'
import { POSProduct, POSCartItem } from '@/types/pos'
import styles from './pos.module.css'
import Image from 'next/image'

export default function POSPage() {
  const [products, setProducts] = useState<POSProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<POSCartItem[]>([])
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [successInvoice, setSuccessInvoice] = useState<string | null>(null)

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
      
      let newQty = 1
      // Untuk harga grosir logic
      const calculateSubtotal = (qty: number) => {
        let price = product.selling_price
        if (product.wholesale_price && product.min_wholesale_qty && qty >= product.min_wholesale_qty) {
          price = product.wholesale_price
        }
        return price * qty
      }

      if (existingItemIndex >= 0) {
        const existingItem = prevCart[existingItemIndex]
        newQty = existingItem.qty + 1
        
        // Cek stok
        if (!product.allow_negative_stock && newQty > product.stock) {
          return prevCart // Jangan tambah jika stok habis
        }

        const newCart = [...prevCart]
        newCart[existingItemIndex] = {
          ...existingItem,
          qty: newQty,
          subtotal: calculateSubtotal(newQty)
        }
        return newCart
      }

      // Cek stok awal
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
        // Hapus jika qty 0
        return prevCart.filter(i => i.product.id !== productId)
      }

      // Cek stok
      if (delta > 0 && !item.product.allow_negative_stock && newQty > item.product.stock) {
        return prevCart // Reject tambah jika melebihi stok
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

  const handleCheckoutSuccess = (invoiceNumber: string) => {
    setCart([]) // Kosongkan keranjang
    setIsCheckoutOpen(false)
    setSuccessInvoice(invoiceNumber) // Tampilkan success modal
  }

  // Buat map agar pencarian O(1) di grid
  const cartQtyMap = cart.reduce((map, item) => {
    map[item.product.id] = item.qty
    return map
  }, {} as Record<string, number>)

  return (
    <div className={styles.posLayout}>
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <Image src="/logo.jpeg" alt="IndoBangunan" width={140} height={32} style={{ objectFit: 'contain' }} />
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
          onCheckoutClick={() => setIsCheckoutOpen(true)}
        />
      </aside>

      {isCheckoutOpen && (
        <CheckoutModal 
          cart={cart}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {successInvoice && (
        <SuccessModal 
          invoiceNumber={successInvoice}
          onClose={() => setSuccessInvoice(null)}
        />
      )}
    </div>
  )
}
