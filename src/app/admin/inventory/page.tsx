'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import { Product } from '@/types/database'
import ProductModal from '@/components/admin/ProductModal'
import styles from './inventory.module.css'

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const supabase = createBrowserClient()

  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name)
        `)
        .order('name')

      if (error) {
        console.error('Error fetching products:', error)
        return
      }

      setProducts(data as unknown as Product[])
    } catch (err) {
      console.error('Unexpected error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = products.filter((p) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0 
    }).format(number)
  }

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Produk & Stok</h1>
          <p className={styles.subtitle}>Kelola inventaris toko bangunan Anda secara real-time</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={styles.primaryBtn}>
          + Tambah Produk
        </button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="Cari berdasarkan nama atau SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Harga Jual</th>
                <th>Stok</th>
                <th>Min Stok</th>
                <th>Satuan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    <div className="skeleton" style={{ height: 24, width: '100%', marginBottom: 12 }}></div>
                    <div className="skeleton" style={{ height: 24, width: '100%', marginBottom: 12 }}></div>
                    <div className="skeleton" style={{ height: 24, width: '100%' }}></div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    Tidak ada produk yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className={styles.skuCol}>{product.sku}</td>
                    <td className={styles.nameCol}>{product.name}</td>
                    <td className={styles.categoryCol}>
                      {/* @ts-ignore - Handle joined column category */}
                      {product.category?.name || 'Umum'}
                    </td>
                    <td className={styles.priceCol}>{formatRupiah(product.selling_price)}</td>
                    <td className={styles.stockCol}>
                      <span className={product.stock <= product.stock_minimum ? styles.textDanger : ''}>
                        {product.stock}
                      </span>
                    </td>
                    <td>{product.stock_minimum}</td>
                    <td className={styles.unitCol}>{product.unit}</td>
                    <td>
                      {product.is_active ? (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>Aktif</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeInactive}`}>Nonaktif</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ProductModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => fetchProducts()} 
        />
      )}
    </div>
  )
}
