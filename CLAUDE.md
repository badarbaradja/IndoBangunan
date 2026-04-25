# CLAUDE.md — IndoBangunan AI Coding Instructions

> File ini dibaca oleh AI assistant (Claude/Antigravity) di awal setiap sesi.  
> Tujuan: agar setiap AI yang mengerjakan proyek ini **konsisten** dalam gaya koding, arsitektur, dan keputusan teknis.

---

## 1. Proyek Ini Adalah Apa

**IndoBangunan** — toko bangunan digital dengan sistem self-service kiosk (konsep mirip mesin order McDonald's) + admin dashboard untuk staff.

Selalu baca `PRD.md` terlebih dahulu sebelum mengerjakan fitur apapun.

---

## 2. Tech Stack — Jangan Diganti

```
Framework:  Next.js 14 (App Router) — BUKAN Pages Router
Language:   TypeScript strict mode
Database:   Supabase (PostgreSQL)
Auth:       Supabase Auth
Payment:    Midtrans (primary)
Deploy:     Vercel
Styling:    CSS Modules (bukan Tailwind, bukan styled-components)
Font:       Plus Jakarta Sans
```

---

## 3. Aturan Koding Yang Tidak Boleh Dilanggar

### 3.1 Supabase Client
```typescript
// ✅ BENAR — server-side (API routes)
import { createServiceClient } from '@/lib/supabase/server'
const supabase = createServiceClient()

// ✅ BENAR — browser-side (auth flows)
import { createBrowserClient } from '@/lib/supabase/server'

// ❌ SALAH — jangan buat client baru tanpa pakai helper
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key) // ini SALAH
```

### 3.2 Auth di API Routes
```typescript
// ✅ BENAR — semua API route butuh auth pakai ini
const auth = await requireAuth(req, ['owner', 'admin'])
if (auth instanceof NextResponse) return auth
const { user, supabase } = auth

// ❌ SALAH — jangan tulis auth logic sendiri
```

### 3.3 Harga Selalu Dari Database
```typescript
// ✅ BENAR — validasi harga di backend
const validation = await validateCartItems(supabase, items)

// ❌ SALAH — jangan percaya harga dari request body
const { items, prices } = await req.json()  // jangan pakai prices dari frontend
```

### 3.4 Perubahan Stok Harus Via RPC
```typescript
// ✅ BENAR
await supabase.rpc('update_stock_atomic', { ... })
await supabase.rpc('process_sale_stock', { p_sale_id: saleId })

// ❌ SALAH — jangan update stok langsung
await supabase.from('products').update({ stock: newStock }).eq('id', productId)
```

### 3.5 Transaksi Append-Only
```typescript
// ✅ BENAR — void dengan buat transaksi baru
const voidSale = await supabase.from('sales').insert({ 
  total: -originalSale.total, 
  transaction_type: 'void' 
})
// Lalu tandai original sebagai void
await supabase.from('sales').update({ status: 'void' }).eq('id', saleId)

// ❌ SALAH — jangan hapus atau edit transaksi yang sudah success
await supabase.from('sales').delete().eq('id', saleId)
await supabase.from('sales').update({ total: newTotal }).eq('id', saleId)
```

### 3.6 Stok Dikurangi HANYA Setelah Payment
```typescript
// ✅ BENAR — stok dikurangi di webhook SETELAH payment gateway konfirmasi
async function processPaymentSuccess(supabase, paymentId, saleId) {
  await supabase.from('payments').update({ status: 'success' }).eq('id', paymentId)
  await supabase.from('sales').update({ status: 'success' }).eq('id', saleId)
  await supabase.rpc('process_sale_stock', { p_sale_id: saleId }) // ← di sini
}

// ❌ SALAH — jangan kurangi stok saat order dibuat
```

---

## 4. Konvensi Penamaan

| Hal | Konvensi | Contoh |
|-----|----------|--------|
| File komponen | PascalCase | `CartPanel.tsx` |
| CSS Module | PascalCase + `.module.css` | `CartPanel.module.css` |
| API routes | kebab-case folder | `/api/audit-logs/route.ts` |
| Hook | camelCase dengan `use` prefix | `useOfflineSync.ts` |
| Tipe/Interface | PascalCase | `CartItem`, `SaleDetail` |
| Fungsi helper | camelCase | `validateCartItems`, `logAudit` |
| Environment var | SCREAMING_SNAKE_CASE | `SUPABASE_SERVICE_ROLE_KEY` |

---

## 5. Struktur Komponen

Setiap komponen yang punya CSS sendiri:
```
ComponentName.tsx
ComponentName.module.css
```

Komponen di `src/components/pos/` hanya boleh pakai:
- Props yang di-pass dari parent
- Types dari `@/types/pos.ts`
- CSS Modules lokal

Komponen **tidak boleh** langsung call Supabase atau API — itu tanggung jawab halaman (`page.tsx`).

---

## 6. TypeScript Rules

- Strict mode aktif — tidak boleh ada `any` kecuali di Supabase client (sudah di-setup di `server.ts`)
- Semua API request/response harus pakai types dari `@/types/database.ts`
- Komponen POS pakai types dari `@/types/pos.ts`
- Jangan buat type inline di function parameter — taruh di types file

---

## 7. CSS & Styling Rules

- **Hanya CSS Modules** — tidak ada inline styles kecuali untuk dynamic values (misal: `style={{ width: '45%' }}`)
- **Tidak ada Tailwind** — proyek ini tidak pakai Tailwind
- Selalu gunakan CSS variables dari `globals.css`:
  ```css
  /* ✅ BENAR */
  color: var(--brand-600);
  border-radius: var(--radius-md);
  
  /* ❌ SALAH */
  color: #0e3d87;
  border-radius: 12px;
  ```
- Font yang dipakai: **Plus Jakarta Sans** — sudah di-load di `layout.tsx`
- Animasi: gunakan class utility `.fade-in`, `.slide-up`, `.bounce-in`, `.skeleton`

---

## 8. API Route Pattern

Setiap API route harus mengikuti pola ini:

```typescript
export async function POST(req: NextRequest) {
  // 1. Auth check (kecuali public endpoint)
  const auth = await requireAuth(req, ['owner', 'admin'])
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  // 2. Parse & validasi body
  let body: SomeType
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // 3. Validasi field wajib
  if (!body.required_field) {
    return NextResponse.json({ error: 'required_field wajib diisi' }, { status: 400 })
  }

  // 4. Business logic

  // 5. Audit log (untuk aksi kritis)
  await logAudit(supabase, { user_id: user.id, action: '...', ... })

  // 6. Return response
  return NextResponse.json({ data }, { status: 201 })
}
```

Error response selalu format:
```json
{ "error": "Pesan error yang jelas dalam bahasa Indonesia" }
```

Success response selalu include data yang relevan:
```json
{ "sale": {...}, "payment": {...} }
```

---

## 9. Bahasa UI

- **Semua teks UI dalam Bahasa Indonesia**
- Error messages boleh campuran Indonesia-Inggris untuk technical terms
- Console.error/log boleh Inggris

---

## 10. Cara Kerja Self-Order vs Kasir

Dua flow yang berbeda — jangan sampai tertukar:

### Self-Order (Pelanggan)
```
URL: /pos
Auth: tidak perlu login
API: POST /api/orders (guest checkout)
Tujuan: pelanggan order sendiri, dapat nomor pesanan
```

### Kasir POS (Staff)
```
Auth: harus login sebagai cashier/admin/owner
API: POST /api/sales (require auth)
Tujuan: kasir input transaksi manual
```

---

## 11. Checklist Sebelum Menulis Kode

Sebelum mulai mengerjakan fitur apapun, tanyakan:

- [ ] Apakah fitur ini ada di PRD.md? Jika tidak, konfirmasi dulu
- [ ] Apakah perlu auth? Kalau iya, role mana yang boleh akses?
- [ ] Apakah ada perubahan stok? Kalau iya, pakai RPC
- [ ] Apakah ada payment? Kalau iya, stok baru dikurangi setelah webhook
- [ ] Apakah perlu audit log? (semua aksi kritis: buat sale, void, update produk, dll)
- [ ] Apakah ada edge case offline? Pakai `offline_id` dan idempotency
- [ ] Apakah komponen baru butuh CSS Module sendiri?
- [ ] Apakah types sudah ada di `@/types/database.ts` atau `@/types/pos.ts`?

---

## 12. Hal Yang Sering Salah (Jangan Diulangi)

1. **Supabase URL format salah** — harus `https://[ref].supabase.co`, bukan URL dashboard
2. **Kurangi stok sebelum payment confirmed** — stok hanya dikurangi di webhook handler
3. **Edit transaksi yang sudah success** — gunakan void transaction, bukan edit/delete
4. **Percaya harga dari frontend** — selalu ambil harga dari database di backend
5. **Update stok langsung** — selalu lewat RPC function
6. **Lupa logAudit** di aksi kritis
7. **Pakai inline styles** untuk hal yang bisa pakai CSS variables
8. **Buat Supabase client langsung** — selalu pakai helper dari `@/lib/supabase/server.ts`

---

## 13. Referensi File Penting

| File | Isi |
|------|-----|
| `src/lib/auth.ts` | `requireAuth`, `logAudit`, `validateCartItems` |
| `src/lib/supabase/server.ts` | `createServiceClient`, `createBrowserClient` |
| `src/types/database.ts` | Semua database types + API types |
| `src/types/pos.ts` | Types untuk komponen POS (`Product`, `CartItem`) |
| `src/app/globals.css` | Design tokens, animations, utilities |
| `PRD.md` | Business logic, fitur, aturan bisnis lengkap |
| `pos-admin-ui.html` | Demo UI lengkap — referensi UX/layout |

---

*Baca file ini setiap kali mulai sesi baru. Jika ada konflik antara file ini dan PRD.md, PRD.md yang menang untuk urusan bisnis, CLAUDE.md yang menang untuk urusan koding.*
