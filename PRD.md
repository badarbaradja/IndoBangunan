# PRD — IndoBangunan Self-Service POS & Admin Dashboard

> **Versi:** 1.0  
> **Terakhir diperbarui:** 2025  
> **Tujuan dokumen:** Referensi tunggal untuk AI coding assistant (Antigravity / Claude) agar selalu konsisten dalam mengerjakan proyek ini dari awal sampai selesai.

---

## 1. Gambaran Produk

IndoBangunan adalah **toko bangunan digital dengan sistem self-service** — konsepnya seperti mesin pemesanan mandiri di McDonald's: pelanggan datang, pilih produk sendiri, checkout, lalu ambil barang di kasir. Tidak perlu antri panjang, tidak perlu tanya-tanya harga.

### Dua Sisi Produk

| Sisi | Pengguna | Tujuan |
|------|----------|--------|
| **Self-Order Kiosk / Web POS** | Pelanggan walk-in | Pilih produk → checkout → dapat nomor pesanan |
| **Admin Dashboard** | Owner, Admin, Kasir, Gudang | Kelola produk, stok, transaksi, laporan |

---

## 2. Tech Stack

```
Frontend:   Next.js 14 (App Router) + TypeScript
Backend:    Supabase (PostgreSQL + Auth + Realtime + Storage)
Payment:    Midtrans (primary) / Xendit (alternative)
Deploy:     Vercel
Styling:    CSS Modules (Plus Jakarta Sans font)
```

### Supabase Client Rules
- `createServiceClient()` → **server-side only** (API routes), bypass RLS
- `createBrowserClient()` → **browser-side** (auth flows only), kena RLS
- Jangan pernah expose service role key ke browser

---

## 3. Struktur Database

### Tabel Utama

**users**
```sql
id, full_name, email, role (owner|admin|cashier|warehouse), is_active, created_at
```

**categories**
```sql
id, name, description, created_at
```

**products**
```sql
id, sku, barcode, name, description, category_id, unit,
cost_price, selling_price, wholesale_price, min_wholesale_qty,
stock, stock_minimum, stock_maximum,
allow_negative_stock, negative_stock_limit,
is_active, image_url, created_by, created_at, updated_at
```

**sales**
```sql
id, invoice_number, cashier_id, customer_name, customer_phone,
subtotal, discount_amount, discount_percent, tax_amount, total,
payment_method (cash|qris|transfer|credit),
status (pending|success|void|returned),
notes, is_offline_created, offline_id, synced_at,
original_sale_id, transaction_type (sale|void|return|purchase),
created_at, updated_at
```

**sales_details**
```sql
id, sale_id, product_id, product_name, product_sku, unit,
qty, unit_price, discount_amount, line_total, created_at
```

**payments**
```sql
id, sale_id, payment_method, amount, amount_paid, change_amount,
status (pending|success|failed|expired|refunded),
gateway_provider, gateway_transaction_id, gateway_order_id,
gateway_payment_url, gateway_qr_string, gateway_raw_response,
idempotency_key, webhook_received_at, processed_at, expires_at,
created_at, updated_at
```

**stock_movements**
```sql
id, product_id, type (purchase_in|sale_out|adjustment|void_return|return_in),
qty_change, qty_before, qty_after,
reference_type, reference_id, notes, performed_by, created_at
```

**audit_logs**
```sql
id, user_id, action, table_name, record_id,
old_values (jsonb), new_values (jsonb), ip_address, created_at
```

### PostgreSQL RPC Functions (wajib ada di Supabase)

```sql
-- Generate nomor invoice atomik
generate_invoice_number() → TEXT  -- format: INV-YYYYMMDD-00001

-- Kurangi stok saat sale diproses (atomic, race-condition safe)
process_sale_stock(p_sale_id UUID) → VOID

-- Update stok dengan audit trail
update_stock_atomic(
  p_product_id UUID,
  p_qty_change INTEGER,
  p_movement_type stock_movement_type,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_performed_by UUID,
  p_notes TEXT DEFAULT NULL
) → JSONB
```

---

## 4. Arsitektur & Prinsip Kunci

### 4.1 Append-Only Transactions
- Transaksi yang sudah `success` **tidak boleh diedit atau dihapus**
- Koreksi dilakukan dengan membuat transaksi VOID baru (negatif)
- Stok otomatis dikembalikan saat void

### 4.2 Harga Selalu Divalidasi di Backend
- Frontend **tidak boleh** dipercaya untuk harga
- Endpoint `POST /api/sales` dan `POST /api/orders` selalu ambil harga dari database
- Wholesale price otomatis diterapkan jika qty >= `min_wholesale_qty`

### 4.3 Payment Flow
```
Sale dibuat (status: pending)
    ↓
CASH → langsung success, stok dikurangi
QRIS/Transfer → tunggu webhook dari gateway
    ↓ (webhook)
verifySignature() → processPaymentSuccess() → update sale → kurangi stok
```

**PENTING:** Stok hanya dikurangi setelah payment confirmed. Jangan kurangi stok sebelum payment.

### 4.4 Idempotency
- Offline transactions punya `offline_id` untuk prevent duplikat
- Payment gateway calls dicek via `gateway_order_id` sebelum diproses ulang
- Webhook yang sudah diproses dicek via `processed_at` field

### 4.5 Role-Based Access Control

| Role | Akses |
|------|-------|
| **Owner** | Full access semua fitur |
| **Admin** | Full access kecuali user management level owner |
| **Cashier** | POS, lihat transaksi sendiri, max diskon 10% |
| **Warehouse** | Stock adjustment, max 100 unit per adjustment |

---

## 5. Halaman & Fitur

### 5.1 Landing Page (`/`)
- Header dengan logo IndoBangunan
- Hero section: "Toko Bangunan Self-Service Modern"
- CTA: "Mulai Pesan Sekarang" → `/pos` dan "Masuk Admin" → `/admin`
- Stats: jumlah produk, waktu proses, harga transparan
- "Cara Kerja" 3 langkah: Pilih → Masukkan Keranjang → Ambil

### 5.2 Self-Order POS (`/pos`)
Layout: **Dua kolom** — kiri browser produk, kanan keranjang (mirip kiosk McDonald's)

**Panel Kiri (Produk):**
- Search bar: cari by nama, SKU, barcode
- Tab kategori (horizontal scroll)
- Product grid: kartu produk dengan gambar/emoji, nama, SKU, harga, stok
- Badge: "Habis" (merah), "⚠️ Stok terbatas" (kuning), "✓ N item" (hijau)
- Tombol "+ Tambah" → berubah jadi qty control (+/-) jika sudah di keranjang
- Loading skeleton saat fetch produk

**Panel Kanan (Keranjang):**
- Header: icon keranjang + jumlah item
- List item: nama, harga/unit, qty control, subtotal per item, tombol hapus
- Empty state jika kosong
- Footer: subtotal, total, tombol "Checkout Sekarang"
- Mobile: cart jadi overlay/drawer

**Checkout Modal (2 langkah):**
1. Form: nama pelanggan (opsional), no. telp (opsional), pilih metode bayar (Cash/QRIS/Transfer)
2. Review: ringkasan pesanan, total, konfirmasi

**Success Modal:**
- Nomor pesanan besar dan prominent (screenshot-friendly)
- Langkah selanjutnya: ke kasir → bayar → ambil barang
- Auto-close 30 detik

### 5.3 Admin Dashboard (`/admin`)

**Sidebar navigasi:**
- Dashboard (laporan harian)
- Transaksi (riwayat lengkap)
- Produk & Stok (inventory)
- Mutasi Stok (audit trail)
- Stok Rendah (alert)
- Pengguna (user management)
- Audit Log (sistem log)

**Dashboard:**
- 4 stat card: Pendapatan Hari Ini, Transaksi, Stok Rendah, Avg. Transaksi
- Bar chart pendapatan 7 hari
- Breakdown metode pembayaran (progress bar)
- Tabel transaksi terbaru

**Transaksi:**
- Filter: search invoice, status, rentang tanggal
- Tabel: invoice, pelanggan, kasir, items, total, metode, status, waktu, aksi Void
- Void flow: modal konfirmasi dengan field alasan

**Produk:**
- Search produk
- Tombol tambah produk (modal form lengkap)
- Tabel: SKU, nama, kategori, harga jual, stok, min stok, unit, status, aksi edit/adjustment

**Modal Tambah/Edit Produk:**
- SKU, barcode, nama, kategori, satuan
- Harga beli, harga jual, harga grosir, min qty grosir
- Stok awal, min stok alert
- Checkbox: izinkan stok negatif

**Mutasi Stok:**
- Filter by tipe movement
- Tombol penyesuaian stok manual (modal: pilih produk, qty, keterangan)
- Tabel append-only: waktu, produk, tipe, perubahan, sebelum, sesudah, ref, petugas

**Stok Rendah:**
- Alert strip menampilkan jumlah produk kritis
- Tabel dengan tombol "Buat PO"

---

## 6. API Endpoints

### Public (no auth)
```
GET  /api/products          → list produk aktif (untuk POS)
POST /api/orders            → buat pesanan self-service (guest checkout)
POST /api/payments/webhook  → terima webhook dari payment gateway
```

### Authenticated (cashier+)
```
POST /api/sales             → buat transaksi dari kasir
GET  /api/sales             → list transaksi (cashier: hanya milik sendiri)
POST /api/sales/sync        → sync transaksi offline (batch max 50)
```

### Authenticated (admin+)
```
POST /api/products          → tambah produk
PUT  /api/products          → update produk (stok tidak bisa diubah langsung)
POST /api/stock             → stock adjustment
GET  /api/stock             → list mutasi stok
POST /api/void              → void transaksi
GET  /api/reports           → laporan (type: summary|top_products|low_stock)
GET  /api/users             → list user
POST /api/users             → tambah user
GET  /api/audit-logs        → audit log
```

---

## 7. Payment Gateway Integration

### Midtrans (Primary)
- Sandbox: `https://app.sandbox.midtrans.com/snap/v1`
- Production: `https://app.midtrans.com/snap/v1`
- Auth: `Basic base64(SERVER_KEY:)`
- Webhook verifikasi: `sha512(order_id + status_code + gross_amount + SERVER_KEY)`

### Webhook Flow
```javascript
verifySignature()
  → findPaymentByOrderId()
  → checkIdempotency (processed_at sudah ada? skip)
  → if success: processPaymentSuccess()
      → update payment status = 'success'
      → update sale status = 'success'
      → process_sale_stock() via RPC
  → if failed: update payment = 'failed', sale = 'void'
```

---

## 8. Offline Support

- Transaksi offline disimpan di `localStorage` dengan key `indobangunan_offline_queue`
- Setiap entry punya `offline_id` unik (timestamp + random)
- Saat device kembali online, `useOfflineSync` hook otomatis sync ke `/api/sales/sync`
- Backend cek `offline_id` untuk idempotency (sudah sync? skip)
- Max 50 transaksi per sync batch

---

## 9. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Payment Gateway
MIDTRANS_SERVER_KEY=SB-Mid-server-...
MIDTRANS_CLIENT_KEY=SB-Mid-client-...
XENDIT_SECRET_KEY=xnd_...
XENDIT_WEBHOOK_TOKEN=...
```

**Validasi URL:** `NEXT_PUBLIC_SUPABASE_URL` harus format `https://[ref].supabase.co`, bukan link dashboard.

---

## 10. File Structure

```
/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Design tokens & global styles
│   │   ├── pos/
│   │   │   ├── page.tsx                # Self-order POS halaman utama
│   │   │   └── pos.module.css
│   │   ├── admin/
│   │   │   ├── layout.tsx              # Admin layout + sidebar
│   │   │   ├── page.tsx                # Dashboard
│   │   │   ├── admin.module.css
│   │   │   ├── inventory/page.tsx      # Produk & stok
│   │   │   └── users/page.tsx          # User management
│   │   └── api/
│   │       ├── orders/route.ts         # Guest checkout
│   │       ├── products/route.ts       # GET (public) + POST/PUT (auth)
│   │       ├── sales/
│   │       │   ├── route.ts            # POST + GET transaksi
│   │       │   └── sync/route.ts       # Offline sync
│   │       ├── payments/
│   │       │   ├── create/route.ts     # Inisiasi payment gateway
│   │       │   └── webhook/route.ts    # Terima notif gateway
│   │       ├── stock/route.ts          # Stock adjustment
│   │       ├── void/route.ts           # Void transaksi
│   │       ├── reports/route.ts        # Laporan
│   │       ├── users/route.ts          # User CRUD
│   │       └── audit-logs/route.ts     # Audit log read
│   ├── components/
│   │   └── pos/
│   │       ├── ProductGrid.tsx + .module.css
│   │       ├── CartPanel.tsx + .module.css
│   │       ├── CheckoutModal.tsx + .module.css
│   │       └── SuccessModal.tsx + .module.css
│   ├── hooks/
│   │   └── useOfflineSync.ts
│   ├── lib/
│   │   ├── auth.ts                     # requireAuth, logAudit, validateCartItems
│   │   └── supabase/server.ts          # createServiceClient, createBrowserClient
│   └── types/
│       ├── database.ts                 # Semua TypeScript types
│       └── pos.ts                      # Types khusus POS (Product, CartItem)
├── public/
│   └── logo.jpeg
├── package.json
├── tsconfig.json
└── next.config.js
```

---

## 11. Design System

### CSS Variables (dari globals.css)
```css
/* Brand */
--brand-500: #124aa1;
--brand-600: #0e3d87;

/* Accent (kuning) */
--accent-400: #ffd533;
--accent-500: #ffc909;

/* Gray scale */
--gray-50 hingga --gray-900

/* Status */
--green-500: #22c55e;
--red-500: #ef4444;
--yellow-500: #eab308;

/* Border radius */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
```

### Font
- **Plus Jakarta Sans** (Google Fonts) — weight 400/500/600/700/800
- Fallback: system-ui, sans-serif

### Animasi
- `fadeIn`, `slideUp`, `slideInRight`, `bounceIn`, `shimmer` (skeleton)
- Class utility: `.fade-in`, `.slide-up`, `.bounce-in`, `.skeleton`

### Tombol Utama
- **Primary CTA:** gradient accent kuning (`#ffd533` → `#ffc909`), teks brand-800
- **Confirm/Success:** `--green-500` ke `--green-600`
- **Danger:** background merah transparan, border merah

---

## 12. Aturan Bisnis Penting

1. **Harga tidak bisa diubah dari POS** — kasir hanya bisa pilih produk & qty
2. **Diskon kasir max 10%**, owner/admin bebas
3. **Stok tidak bisa negatif** kecuali `allow_negative_stock = true` pada produk
4. **Warehouse** hanya bisa adjustment max 100 unit sekaligus
5. **Void** hanya bisa dilakukan oleh owner/admin, dan hanya untuk transaksi `success`
6. **Stok dikurangi** hanya setelah payment gateway konfirmasi (via webhook), bukan saat order dibuat
7. **Invoice number** harus atomik — gunakan RPC `generate_invoice_number()` di Supabase
8. **Semua perubahan stok** harus lewat RPC `update_stock_atomic()` bukan update langsung
9. **Audit log** ditulis untuk semua aksi kritis (buat transaksi, void, update produk, dll)
10. **Self-order pelanggan** tidak perlu login — guest checkout via `/api/orders`

---

## 13. Yang Belum Selesai / TODO

- [ ] `src/app/admin/inventory/page.tsx` — halaman produk & stok lengkap
- [ ] `src/app/admin/users/page.tsx` — user management halaman
- [ ] `src/app/api/users/route.ts` — CRUD users
- [ ] `src/app/api/audit-logs/route.ts` — read audit logs
- [ ] Login page (`/login`) dengan Supabase Auth
- [ ] `useAuth` hook untuk proteksi halaman admin
- [ ] Realtime stok update via Supabase Realtime (untuk kasir bisa lihat perubahan live)
- [ ] Image upload produk ke Supabase Storage
- [ ] Print struk (browser print / thermal printer integration)
- [ ] Export laporan ke CSV/Excel
- [ ] Halaman pengaturan toko (nama, alamat, logo)
- [ ] Supabase RLS policies untuk semua tabel
- [ ] SQL migrations file untuk semua tabel + RPC functions
- [ ] `tsconfig.tsbuildinfo` TypeScript errors di API routes (karena `Database` type generic)

---

## 14. Known Issues & Notes

### TypeScript Error di API Routes
Supabase client di-inisiasi dengan `createClient<any>(...)` karena tipe Database belum di-wire penuh. Akibatnya banyak `Property 'x' does not exist on type 'never'` error. Fix: pass tipe Database yang benar ke `createClient<Database>(...)`.

### Supabase URL Validation
Ada validasi di `createServiceClient()` — jangan paste URL dashboard Supabase, harus format `https://[ref].supabase.co`.

### POS Self-Order vs Kasir POS
Ada dua alur berbeda:
- **Self-Order** (`/pos`): pelanggan sendiri, guest checkout, panggil `/api/orders`
- **Kasir POS** (standalone HTML `pos-admin-ui.html`): staff, butuh auth, panggil `/api/sales`

File `pos-admin-ui.html` adalah demo UI standalone yang sudah lengkap — bisa dijadikan referensi UX.

---

## 15. Cara Menjalankan Lokal

```bash
# Install dependencies
npm install

# Copy env
cp env.example .env.local
# Edit .env.local dengan credentials Supabase & payment gateway

# Jalankan dev server
npm run dev

# Type check
npm run type-check

# Build
npm run build
```

---

*Dokumen ini adalah source of truth untuk pengembangan IndoBangunan. Setiap fitur baru, perubahan arsitektur, atau keputusan bisnis harus dicerminkan di sini.*
