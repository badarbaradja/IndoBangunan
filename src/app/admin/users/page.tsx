'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import { User } from '@/types/database'
import UserModal from '@/components/admin/UserModal'
import { useAuth } from '@/hooks/useAuth'
import styles from './users.module.css'

export default function UsersPage() {
  const { role } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const supabase = createBrowserClient()

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const json = await res.json()

      if (res.ok && json.data) {
        setUsers(json.data as User[])
      } else {
        console.error('Error fetching users:', json.error)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = users.filter((u) => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  const getRoleBadgeClass = (userRole: string) => {
    switch (userRole) {
      case 'owner': return styles.badgeOwner
      case 'admin': return styles.badgeAdmin
      case 'warehouse': return styles.badgeWarehouse
      case 'cashier': return styles.badgeCashier
      default: return styles.badgeDefault
    }
  }

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Manajemen Pengguna</h1>
          <p className={styles.subtitle}>Kelola akses akun admin, kasir, dan staf gudang</p>
        </div>
        {role === 'owner' && (
          <button onClick={() => setIsModalOpen(true)} className={styles.primaryBtn}>
            + Tambah Pengguna
          </button>
        )}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              type="text" 
              placeholder="Cari berdasarkan nama atau email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Lengkap</th>
                <th>Email</th>
                <th>Peran (Role)</th>
                <th>Status</th>
                <th>Waktu Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    <div className="skeleton" style={{ height: 24, width: '100%', marginBottom: 12 }}></div>
                    <div className="skeleton" style={{ height: 24, width: '100%', marginBottom: 12 }}></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    Tidak ada pengguna yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td className={styles.nameCol}>{u.full_name}</td>
                    <td className={styles.emailCol}>{u.email}</td>
                    <td>
                      <span className={`${styles.badge} ${getRoleBadgeClass(u.role)}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>Aktif</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeInactive}`}>Nonaktif</span>
                      )}
                    </td>
                    <td className={styles.dateCol}>{formatDate(u.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <UserModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => fetchUsers()} 
        />
      )}
    </div>
  )
}
