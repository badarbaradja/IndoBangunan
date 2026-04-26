-- ============================================================
-- IndoBangunan — Migration: Cashier Queue Realtime Support
-- File: sql/003_realtime_queue.sql
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Enable Realtime untuk tabel 'sales' ──────────────────
-- Ini wajib agar Supabase Realtime bisa listen INSERT/UPDATE
-- Jalankan di SQL Editor Supabase:

ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

-- Jika tabel sudah ada di publication, command di atas akan error.
-- Cukup abaikan errornya dan lanjutkan ke step berikutnya.


-- ── 2. Tambah Index untuk Query Antrean (Performance) ───────
-- Index untuk query: status='pending' AND payment_method='cash'
CREATE INDEX IF NOT EXISTS idx_sales_pending_cash
  ON public.sales(status, payment_method, created_at ASC)
  WHERE status = 'pending' AND payment_method = 'cash';


-- ── 3. Verifikasi Realtime Status ────────────────────────────
-- Jalankan query ini untuk memastikan 'sales' sudah masuk publication:
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';


-- ── 4. RLS Policy untuk Queue ────────────────────────────────
-- Kasir, Admin, Owner bisa READ pending cash sales untuk antrean

-- Tambahkan policy baca antrean (jika belum ada)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales' AND policyname = 'Staff can read pending queue'
  ) THEN
    EXECUTE '
      CREATE POLICY "Staff can read pending queue"
        ON public.sales FOR SELECT
        USING (
          auth.role() = ''authenticated'' AND (
            EXISTS (
              SELECT 1 FROM public.users u
              WHERE u.id = auth.uid()
              AND u.role IN (''owner'', ''admin'', ''cashier'')
              AND u.is_active = true
            )
          )
        )
    ';
  END IF;
END $$;


-- ── 5. Tambah Function: Konfirmasi Cash Payment ──────────────
-- Atomic function untuk confirm payment + update stok dalam 1 transaksi

CREATE OR REPLACE FUNCTION public.confirm_cash_payment(
  p_sale_id     UUID,
  p_amount_paid NUMERIC DEFAULT NULL,
  p_cashier_id  UUID   DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale    RECORD;
  v_total   NUMERIC;
  v_paid    NUMERIC;
  v_change  NUMERIC;
BEGIN
  -- Lock sale row
  SELECT id, total, status, payment_method, invoice_number
  INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan: %', p_sale_id;
  END IF;

  IF v_sale.status <> 'pending' THEN
    RAISE EXCEPTION 'Pesanan % sudah berstatus %, tidak bisa dikonfirmasi ulang', 
      v_sale.invoice_number, v_sale.status;
  END IF;

  IF v_sale.payment_method <> 'cash' THEN
    RAISE EXCEPTION 'Hanya pesanan Cash yang bisa dikonfirmasi manual';
  END IF;

  v_total  := v_sale.total;
  v_paid   := COALESCE(p_amount_paid, v_total);
  v_change := GREATEST(0, v_paid - v_total);

  -- Update sale → success
  UPDATE public.sales
  SET status = 'success', updated_at = NOW()
  WHERE id = p_sale_id;

  -- Update payment → success
  UPDATE public.payments
  SET 
    status        = 'success',
    amount_paid   = v_paid,
    change_amount = v_change,
    processed_at  = NOW(),
    updated_at    = NOW()
  WHERE sale_id = p_sale_id
    AND status  = 'pending';

  -- Potong stok (atomic)
  PERFORM public.process_sale_stock(p_sale_id);

  RETURN jsonb_build_object(
    'success',         true,
    'invoice_number',  v_sale.invoice_number,
    'total',           v_total,
    'amount_paid',     v_paid,
    'change_amount',   v_change
  );
END;
$$;

COMMENT ON FUNCTION public.confirm_cash_payment IS 
  'Atomically confirm cash payment: update sale to success, update payment, deduct stock. Use from /api/queue/confirm or directly via RPC.';
