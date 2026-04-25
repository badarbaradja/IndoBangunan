// hooks/useOfflineSync.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { CreateSaleRequest } from '@/types/database'

const OFFLINE_QUEUE_KEY = 'indobangunan_offline_queue'

interface OfflineSale extends CreateSaleRequest {
  offline_id: string
  created_at: string
  is_offline_created: true
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      syncQueue()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load pending count
    const queue = getQueue()
    setPendingCount(queue.length)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  function getQueue(): OfflineSale[] {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]')
    } catch {
      return []
    }
  }

  function saveQueue(queue: OfflineSale[]) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
    setPendingCount(queue.length)
  }

  const addToQueue = useCallback((sale: CreateSaleRequest) => {
    const offlineSale: OfflineSale = {
      ...sale,
      offline_id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at: new Date().toISOString(),
      is_offline_created: true,
    }
    const queue = getQueue()
    queue.push(offlineSale)
    saveQueue(queue)
    return offlineSale.offline_id
  }, [])

  const syncQueue = useCallback(async () => {
    const queue = getQueue()
    if (queue.length === 0 || isSyncing) return

    setIsSyncing(true)
    const token = localStorage.getItem('auth_token')

    try {
      const response = await fetch('/api/sales/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sales: queue }),
      })

      if (response.ok) {
        const { results } = await response.json() as {
          results: Array<{ offline_id: string; status: string }>
        }

        // Remove successfully synced items
        const successIds = new Set(
          results
            .filter(r => r.status === 'synced' || r.status === 'already_synced')
            .map(r => r.offline_id)
        )

        const remaining = queue.filter(s => !successIds.has(s.offline_id))
        saveQueue(remaining)
      }
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing])

  return { isOnline, pendingCount, isSyncing, addToQueue, syncQueue }
}