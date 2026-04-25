'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/server'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Tampilkan pesan error informatif dalam bahasa Indonesia
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('Email atau kata sandi salah. Silakan coba lagi.')
        } else {
          setErrorMsg(error.message)
        }
        setIsSubmitting(false)
        return
      }

      if (data.user) {
        // Jika sukses login, langsung arahkan ke Dashboard Admin
        router.push('/admin')
      }
    } catch (err) {
      console.error('Login error:', err)
      setErrorMsg('Terjadi kesalahan yang tidak terduga pada sistem.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Menggunakan animasi slide-up dari globals.css */}
      <div className={`${styles.loginCard} slide-up`}>
        <div className={styles.header}>
          <h1 className={styles.title}>IndoBangunan</h1>
          <p className={styles.subtitle}>Masuk ke Admin Dashboard</p>
        </div>

        {errorMsg && (
          <div className={`${styles.errorAlert} fade-in`}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Kata Sandi</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
