'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import styles from '../admin.module.css'

export default function LowStockPage() {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [supabase] = useState(() => createBrowserClient())

  const fetchLowStock = useCallback(async () => {
    setIsLoading(true)
    // Menarik seluruh produk untuk MVP
    // Untuk database besar sebaiknya filter menggunakan raw query rpc "where stock <= stock_minimum"
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, stock, stock_minimum, unit')
      .eq('is_active', true)
      
    if (!error && data) {
      const low = data.filter(p => p.stock <= p.stock_minimum)
      // Sort dari yang paling parah kekurangannya
      low.sort((a, b) => (a.stock - a.stock_minimum) - (b.stock - b.stock_minimum))
      setProducts(low)
    }
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchLowStock()
  }, [fetchLowStock])

  return (
    <div className="fade-in">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle} style={{ color: 'var(--red-600)' }}>Peringatan Stok Rendah</h1>
        <p className={styles.pageSub}>Daftar produk yang stoknya sudah menyentuh batas minimum dan butuh restock secepatnya.</p>
      </div>

      <div className={styles.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama Produk</th>
                <th>Sisa Stok</th>
                <th>Batas Minimum</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40 }}>Mengecek stok...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--green-600)', fontWeight: 600 }}>
                    Semua stok barang dalam kondisi aman.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isEmpty = p.stock <= 0
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace' }}>{p.sku}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontWeight: 800, color: isEmpty ? 'var(--red-600)' : 'var(--yellow-600)', fontSize: '1.2rem' }}>
                        {p.stock} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text3)' }}>{p.unit}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.stock_minimum}</td>
                      <td>
                        {isEmpty ? (
                          <span className={`${styles.statusPill} ${styles.statusVoid}`}>Stok Habis!</span>
                        ) : (
                          <span className={`${styles.statusPill} ${styles.statusPending}`}>Hampir Habis</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
