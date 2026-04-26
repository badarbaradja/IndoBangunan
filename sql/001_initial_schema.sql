-- ============================================================
-- IndoBangunan — Complete Database Migration
-- File: sql/001_initial_schema.sql
-- Run this in Supabase SQL Editor to set up the database
-- ============================================================

-- ── Enable UUID extension ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'cashier', 'warehouse');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sale_status AS ENUM ('pending', 'success', 'void', 'returned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'qris', 'transfer', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'expired', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM (
    'purchase_in', 'sale_out', 'adjustment', 'void_return', 'return_in'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('sale', 'void', 'return', 'purchase');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Table: users ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'cashier',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: categories ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: products ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku                  TEXT NOT NULL UNIQUE,
  barcode              TEXT,
  name                 TEXT NOT NULL,
  description          TEXT,
  category_id          UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit                 TEXT NOT NULL DEFAULT 'pcs',
  cost_price           NUMERIC(15, 2) NOT NULL DEFAULT 0,
  selling_price        NUMERIC(15, 2) NOT NULL,
  wholesale_price      NUMERIC(15, 2),
  min_wholesale_qty    INTEGER NOT NULL DEFAULT 0,
  stock                INTEGER NOT NULL DEFAULT 0,
  stock_minimum        INTEGER NOT NULL DEFAULT 0,
  stock_maximum        INTEGER,
  allow_negative_stock BOOLEAN NOT NULL DEFAULT false,
  negative_stock_limit INTEGER NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  image_url            TEXT,
  created_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: sales ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number      TEXT NOT NULL UNIQUE,
  cashier_id          UUID NOT NULL REFERENCES public.users(id),
  customer_name       TEXT,
  customer_phone      TEXT,
  subtotal            NUMERIC(15, 2) NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  discount_percent    NUMERIC(5, 2) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total               NUMERIC(15, 2) NOT NULL DEFAULT 0,
  payment_method      payment_method NOT NULL,
  status              sale_status NOT NULL DEFAULT 'pending',
  notes               TEXT,
  is_offline_created  BOOLEAN NOT NULL DEFAULT false,
  offline_id          TEXT,
  synced_at           TIMESTAMPTZ,
  original_sale_id    UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  transaction_type    transaction_type NOT NULL DEFAULT 'sale',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: sales_details ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_details (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id         UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES public.products(id),
  product_name    TEXT NOT NULL,
  product_sku     TEXT NOT NULL,
  unit            TEXT NOT NULL,
  qty             INTEGER NOT NULL CHECK (qty > 0),
  unit_price      NUMERIC(15, 2) NOT NULL,
  discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  line_total      NUMERIC(15, 2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: payments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id                 UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method          payment_method NOT NULL,
  amount                  NUMERIC(15, 2) NOT NULL,
  amount_paid             NUMERIC(15, 2),
  change_amount           NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status                  payment_status NOT NULL DEFAULT 'pending',
  gateway_provider        TEXT,
  gateway_transaction_id  TEXT,
  gateway_order_id        TEXT UNIQUE,
  gateway_payment_url     TEXT,
  gateway_qr_string       TEXT,
  gateway_raw_response    JSONB,
  idempotency_key         TEXT NOT NULL DEFAULT uuid_generate_v4()::TEXT,
  webhook_received_at     TIMESTAMPTZ,
  processed_at            TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: stock_movements ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES public.products(id),
  type             stock_movement_type NOT NULL,
  qty_change       INTEGER NOT NULL,
  qty_before       INTEGER NOT NULL,
  qty_after        INTEGER NOT NULL,
  reference_type   TEXT,  -- 'sale', 'void', 'adjustment', etc
  reference_id     UUID,
  notes            TEXT,
  performed_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: audit_logs ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON public.sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_offline_id ON public.sales(offline_id);
CREATE INDEX IF NOT EXISTS idx_sales_details_sale ON public.sales_details(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale ON public.payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ── Trigger: updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RPC Functions
-- ============================================================

-- ── generate_invoice_number ──────────────────────────────────
-- Atomically generates invoice number: INV-YYYYMMDD-00001
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date TEXT;
  v_count INTEGER;
  v_invoice TEXT;
BEGIN
  v_date := TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.sales
  WHERE invoice_number LIKE 'INV-' || v_date || '-%'
    AND transaction_type = 'sale';
  
  v_invoice := 'INV-' || v_date || '-' || LPAD(v_count::TEXT, 5, '0');
  
  RETURN v_invoice;
END;
$$;

-- ── update_stock_atomic ──────────────────────────────────────
-- Atomically updates stock with full audit trail
CREATE OR REPLACE FUNCTION public.update_stock_atomic(
  p_product_id     UUID,
  p_qty_change     INTEGER,
  p_movement_type  stock_movement_type,
  p_reference_type TEXT,
  p_reference_id   UUID,
  p_performed_by   UUID,
  p_notes          TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product RECORD;
  v_qty_after INTEGER;
BEGIN
  -- Lock the product row to prevent race conditions
  SELECT stock, allow_negative_stock, negative_stock_limit
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan: %', p_product_id;
  END IF;
  
  v_qty_after := v_product.stock + p_qty_change;
  
  -- Validate stock won't go below limit
  IF v_qty_after < 0 AND NOT v_product.allow_negative_stock THEN
    RAISE EXCEPTION 'Stok tidak cukup. Sisa: %, Diminta: %', v_product.stock, ABS(p_qty_change);
  END IF;
  
  IF v_qty_after < -v_product.negative_stock_limit THEN
    RAISE EXCEPTION 'Stok melebihi batas negatif yang diizinkan: %', v_product.negative_stock_limit;
  END IF;
  
  -- Update stock
  UPDATE public.products
  SET stock = v_qty_after, updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Record movement
  INSERT INTO public.stock_movements (
    product_id, type, qty_change, qty_before, qty_after,
    reference_type, reference_id, notes, performed_by
  ) VALUES (
    p_product_id, p_movement_type, p_qty_change, v_product.stock, v_qty_after,
    p_reference_type, p_reference_id, p_notes, p_performed_by
  );
  
  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'qty_before', v_product.stock,
    'qty_after', v_qty_after,
    'qty_change', p_qty_change
  );
END;
$$;

-- ── process_sale_stock ───────────────────────────────────────
-- Reduces stock for all items in a completed sale (called after payment confirmed)
CREATE OR REPLACE FUNCTION public.process_sale_stock(p_sale_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_detail RECORD;
  v_sale RECORD;
BEGIN
  SELECT cashier_id INTO v_sale FROM public.sales WHERE id = p_sale_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale tidak ditemukan: %', p_sale_id;
  END IF;
  
  FOR v_detail IN
    SELECT product_id, qty FROM public.sales_details WHERE sale_id = p_sale_id
  LOOP
    PERFORM public.update_stock_atomic(
      p_product_id     := v_detail.product_id,
      p_qty_change     := -v_detail.qty,  -- negative = reduce
      p_movement_type  := 'sale_out',
      p_reference_type := 'sale',
      p_reference_id   := p_sale_id,
      p_performed_by   := v_sale.cashier_id,
      p_notes          := 'Auto deduct on sale success'
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Seed: Default Categories
-- ============================================================
INSERT INTO public.categories (name, description) VALUES
  ('Semen & Beton', 'Semen, mortar, beton cor'),
  ('Besi & Baja', 'Besi beton, hollow, pipa besi'),
  ('Kayu & Triplek', 'Kayu balok, triplek, multiplex'),
  ('Cat & Kimia', 'Cat tembok, cat kayu, thinner, lem'),
  ('Keramik & Granit', 'Keramik lantai, granit, mozaik'),
  ('Atap & Rangka', 'Genteng, spandek, rangka baja ringan'),
  ('Sanitasi & Pipa', 'Pipa PVC, fitting, kloset, wastafel'),
  ('Listrik', 'Kabel, MCB, stop kontak, lampu'),
  ('Alat & Perkakas', 'Palu, gergaji, mata bor, kunci'),
  ('Lainnya', 'Produk lain-lain')
ON CONFLICT DO NOTHING;
