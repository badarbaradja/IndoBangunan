// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * Service role client — ONLY for server-side API routes.
 * Bypasses RLS. Never expose to browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    )
  }

  // Validate URL format — common mistake: pasting dashboard URL instead of project URL
  if (url.includes('/dashboard/') || url.includes('/sql/')) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL tidak valid: "${url}"\n` +
      `Harus berupa: https://[project-ref].supabase.co\n` +
      `Bukan link dashboard!`
    )
  }

  return createClient<any>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Anon client — for browser-side auth flows only.
 * Subject to RLS policies.
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient<any>(url, anonKey)
}