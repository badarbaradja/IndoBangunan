import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, logAudit } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['owner', 'admin'])
  if (auth instanceof NextResponse) return auth
  const { supabase } = auth

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Gagal mengambil data pengguna' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200 })
}

export async function POST(req: NextRequest) {
  // Hanya owner yang bisa menambah user baru
  const auth = await requireAuth(req, ['owner'])
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth // supabase disini adalah Service Role Client karena di-create oleh requireAuth

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 })
  }

  const { email, password, full_name, role, is_active } = body

  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: 'Email, Password, Nama Lengkap, dan Role wajib diisi' }, { status: 400 })
  }

  // 1. Create auth user using Supabase Admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Otomatis terkonfirmasi
    user_metadata: {
      full_name,
      role
    }
  })

  if (authError) {
    console.error('Create auth user error:', authError)
    return NextResponse.json({ error: authError.message || 'Gagal membuat kredensial pengguna' }, { status: 400 })
  }

  const newUserId = authData.user.id

  // 2. Insert into public.users table
  const newUserRecord = {
    id: newUserId,
    full_name,
    email,
    role,
    is_active: is_active !== undefined ? Boolean(is_active) : true
  }

  const { data: userRecord, error: dbError } = await supabase
    .from('users')
    .insert(newUserRecord)
    .select()
    .single()

  if (dbError) {
    console.error('Insert public.users error:', dbError)
    // Rollback / clean up auth user (optional best effort)
    await supabase.auth.admin.deleteUser(newUserId)
    return NextResponse.json({ error: 'Gagal menyimpan profil pengguna' }, { status: 500 })
  }

  // 3. Log Audit
  await logAudit(supabase, {
    user_id: user.id,
    action: 'CREATE_USER',
    table_name: 'users',
    record_id: newUserId,
    new_values: newUserRecord
  })

  return NextResponse.json({ data: userRecord }, { status: 201 })
}
