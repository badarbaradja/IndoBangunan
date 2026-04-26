'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/server'
import { UserRole } from '@/types/database'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  // Menggunakan helper dari server.ts sesuai aturan CLAUDE.md dan dibungkus useState agar stabil (singleton per komponen)
  const [supabase] = useState(() => createBrowserClient())

  useEffect(() => {
    let isMounted = true

    // Fungsi utama untuk mengecek sesi saat ini
    async function getSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          if (isMounted) setIsLoading(false)
          return
        }

        if (session?.user) {
          if (isMounted) setUser(session.user)
          await fetchUserRole(session.user.id)
        } else {
          if (isMounted) {
            setUser(null)
            setRole(null)
            setIsLoading(false)
          }
        }
      } catch (err) {
        console.error('Unexpected error during session check:', err)
        if (isMounted) setIsLoading(false)
      }
    }

    // Fungsi untuk mengambil role dari tabel users
    async function fetchUserRole(userId: string) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single()

        if (error) {
          console.error('Error fetching user role:', error)
        } else if (data && isMounted) {
          // Cast ke User type agar TypeScript mengenali properti role
          const typedData = data as { role: UserRole }
          setRole(typedData.role)
        }
      } catch (err) {
        console.error('Unexpected error fetching user role:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    getSession()

    // Mendengarkan perubahan status autentikasi (login/logout dari tab lain)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          if (isMounted) setUser(session.user)
          // Hanya fetch role ulang jika belum ada, untuk menghemat network request
          if (isMounted && !role) {
            await fetchUserRole(session.user.id)
          }
        } else {
          if (isMounted) {
            setUser(null)
            setRole(null)
            setIsLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  // Fungsi untuk proses log out
  const signOut = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    setIsLoading(false)
    router.push('/login')
  }

  return { user, role, isLoading, signOut }
}
