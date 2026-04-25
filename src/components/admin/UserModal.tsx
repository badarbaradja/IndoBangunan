'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import styles from './UserModal.module.css'

interface UserModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function UserModal({ onClose, onSuccess }: UserModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'cashier',
    is_active: true
  })

  const supabase = createBrowserClient()

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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Anda belum login')

      const res = await fetch('/api/users', {
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
      setErrorMsg(err.message || 'Gagal menambahkan pengguna')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} bounce-in`}>
        <div className={styles.modalHeader}>
          <h2>Tambah Pengguna Baru</h2>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={`${styles.inputGroup} ${styles.colSpan2}`}>
              <label>Nama Lengkap *</label>
              <input 
                name="full_name" 
                required 
                value={formData.full_name} 
                onChange={handleChange} 
                placeholder="Contoh: Budi Santoso" 
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Email *</label>
              <input 
                type="email"
                name="email" 
                required 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="nama@email.com" 
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Kata Sandi *</label>
              <input 
                type="password"
                name="password" 
                required 
                minLength={6}
                value={formData.password} 
                onChange={handleChange} 
                placeholder="Minimal 6 karakter" 
              />
            </div>

            <div className={`${styles.inputGroup} ${styles.colSpan2}`}>
              <label>Peran (Role) *</label>
              <select name="role" required value={formData.role} onChange={handleChange}>
                <option value="admin">Admin</option>
                <option value="cashier">Kasir (Cashier)</option>
                <option value="warehouse">Gudang (Warehouse)</option>
              </select>
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              id="isActive" 
              name="is_active" 
              checked={formData.is_active} 
              onChange={handleChange} 
            />
            <label htmlFor="isActive">Akun Aktif (Dapat digunakan untuk login)</label>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isLoading}>
              Batal
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Pengguna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
