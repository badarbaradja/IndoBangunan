'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/server'
import styles from '../admin.module.css'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [supabase] = useState(() => createBrowserClient())

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        table_name,
        created_at,
        users(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setLogs(data)
    }
    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="fade-in">
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Log Sistem (Audit)</h1>
        <p className={styles.pageSub}>Jejak digital seluruh aktivitas administratif pada sistem.</p>
      </div>

      <div className={styles.tableCard}>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Tindakan (Action)</th>
                <th>Target Tabel</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 40 }}>Memuat log...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Tidak ada jejak log.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.users?.full_name || 'System / Kiosk'}</div>
                      <small style={{ color: 'var(--text3)' }}>{log.users?.email || '-'}</small>
                    </td>
                    <td>
                      <span className={styles.statusPill} style={{ background: 'var(--gray-100)', color: 'var(--gray-800)' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{log.table_name || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
