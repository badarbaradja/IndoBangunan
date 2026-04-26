// src/lib/supabase/server.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Service role client — ONLY for server-side API routes.
 * Bypasses RLS. Never expose to browser.
 * 
 * Returns SupabaseClient<any> to avoid TypeScript 'never' type inference issues
 * with manually-defined Database schemas. Type safety is enforced via explicit
 * type assertions at the call-site level.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServiceClient(): SupabaseClient<any> {
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

  return createClient(url, serviceKey, {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createBrowserClient(): SupabaseClient<any> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, anonKey)
}