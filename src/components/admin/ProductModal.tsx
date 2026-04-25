'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import styles from './ProductModal.module.css'
import { Category } from '@/types/database'

interface ProductModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ProductModal({ onClose, onSuccess }: ProductModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [supabase] = useState(() => createBrowserClient())
  
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category_id: '',
    unit: 'pcs',
    cost_price: 0,
    selling_price: 0,
    wholesale_price: '',
    min_wholesale_qty: '',
    stock: 0,
    stock_minimum: 0,
    allow_negative_stock: false
  })

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (!error && data) {
        setCategories(data)
      }
    }
    fetchCategories()
  }, [supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setIsLoading(true)

    try {
      // Dapatkan token untuk kirim ke API route
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Anda belum login')

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Submit error:', err)
      setErrorMsg(err.message || 'Gagal menambahkan produk')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} bounce-in`}>
        <div className={styles.modalHeader}>
          <h2>Tambah Produk Baru</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label>SKU *</label>
              <input name="sku" required value={formData.sku} onChange={handleChange} placeholder="Contoh: SEM-50KG" />
            </div>
            
            <div className={styles.inputGroup}>
              <label>Barcode</label>
              <input name="barcode" value={formData.barcode} onChange={handleChange} placeholder="Scan barcode..." />
            </div>

            <div className={`${styles.inputGroup} ${styles.colSpan2}`}>
              <label>Nama Produk *</label>
              <input name="name" required value={formData.name} onChange={handleChange} placeholder="Semen Tiga Roda 50kg" />
            </div>

            <div className={styles.inputGroup}>
              <label>Kategori</label>
              <select name="category_id" value={formData.category_id} onChange={handleChange}>
                <option value="">-- Pilih Kategori --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Satuan *</label>
              <select name="unit" required value={formData.unit} onChange={handleChange}>
                <option value="pcs">Pcs</option>
                <option value="dus">Dus</option>
                <option value="sak">Sak</option>
                <option value="meter">Meter</option>
                <option value="kg">Kg</option>
                <option value="liter">Liter</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Harga Beli (Modal)</label>
              <input type="number" name="cost_price" value={formData.cost_price} onChange={handleChange} min="0" />
            </div>

            <div className={styles.inputGroup}>
              <label>Harga Jual *</label>
              <input type="number" name="selling_price" required value={formData.selling_price} onChange={handleChange} min="0" />
            </div>

            <div className={styles.inputGroup}>
              <label>Harga Grosir</label>
              <input type="number" name="wholesale_price" value={formData.wholesale_price} onChange={handleChange} min="0" />
            </div>

            <div className={styles.inputGroup}>
              <label>Min Qty Grosir</label>
              <input type="number" name="min_wholesale_qty" value={formData.min_wholesale_qty} onChange={handleChange} min="0" />
            </div>

            <div className={styles.inputGroup}>
              <label>Stok Awal *</label>
              <input type="number" name="stock" required value={formData.stock} onChange={handleChange} />
            </div>

            <div className={styles.inputGroup}>
              <label>Min Stok Alert</label>
              <input type="number" name="stock_minimum" value={formData.stock_minimum} onChange={handleChange} min="0" />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              id="allowNeg" 
              name="allow_negative_stock" 
              checked={formData.allow_negative_stock} 
              onChange={handleChange} 
            />
            <label htmlFor="allowNeg">Izinkan Stok Negatif (jual meski stok sistem 0)</label>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isLoading}>
              Batal
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
