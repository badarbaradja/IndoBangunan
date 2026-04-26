-- ============================================================
-- IndoBangunan — Row Level Security (RLS) Policies
-- File: sql/002_rls_policies.sql
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ── Enable RLS on all tables ─────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ── Helper function: get current user role ───────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$;

-- ── Helper function: check if role is allowed ────────────────
CREATE OR REPLACE FUNCTION public.has_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT get_user_role() = ANY(allowed_roles);
$$;

-- ============================================================
-- USERS table policies
-- ============================================================

-- Everyone can view their own profile
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

-- Owner and admin can view all users
DROP POLICY IF EXISTS "users_select_admin" ON public.users;
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT USING (has_role(ARRAY['owner', 'admin']));

-- Only owner can insert users (app uses service role for this anyway)
DROP POLICY IF EXISTS "users_insert_owner" ON public.users;
CREATE POLICY "users_insert_owner" ON public.users
  FOR INSERT WITH CHECK (has_role(ARRAY['owner']));

-- Owner can update any user, users can update themselves (limited)
DROP POLICY IF EXISTS "users_update_owner" ON public.users;
CREATE POLICY "users_update_owner" ON public.users
  FOR UPDATE USING (has_role(ARRAY['owner']));

-- ============================================================
-- CATEGORIES table policies
-- ============================================================

-- All authenticated users can view categories
DROP POLICY IF EXISTS "categories_select_auth" ON public.categories;
CREATE POLICY "categories_select_auth" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Anon users can view categories (for POS guest checkout)
DROP POLICY IF EXISTS "categories_select_anon" ON public.categories;
CREATE POLICY "categories_select_anon" ON public.categories
  FOR SELECT USING (true);

-- Only owner/admin can manage categories
DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
CREATE POLICY "categories_insert_admin" ON public.categories
  FOR INSERT WITH CHECK (has_role(ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS "categories_update_admin" ON public.categories;
CREATE POLICY "categories_update_admin" ON public.categories
  FOR UPDATE USING (has_role(ARRAY['owner', 'admin']));

-- ============================================================
-- PRODUCTS table policies
-- ============================================================

-- Public (anon) can view active products — needed for self-service POS
DROP POLICY IF EXISTS "products_select_public" ON public.products;
CREATE POLICY "products_select_public" ON public.products
  FOR SELECT USING (is_active = true);

-- Authenticated users can view all products including inactive
DROP POLICY IF EXISTS "products_select_auth" ON public.products;
CREATE POLICY "products_select_auth" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Owner/admin can insert products
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT WITH CHECK (has_role(ARRAY['owner', 'admin']));

-- Owner/admin can update products (NOT stock directly — use RPC)
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE USING (has_role(ARRAY['owner', 'admin']));

-- ============================================================
-- SALES table policies
-- ============================================================

-- Owner/admin can see all sales
DROP POLICY IF EXISTS "sales_select_admin" ON public.sales;
CREATE POLICY "sales_select_admin" ON public.sales
  FOR SELECT USING (has_role(ARRAY['owner', 'admin']));

-- Cashier can only see their own sales
DROP POLICY IF EXISTS "sales_select_cashier" ON public.sales;
CREATE POLICY "sales_select_cashier" ON public.sales
  FOR SELECT USING (
    has_role(ARRAY['cashier']) AND cashier_id = auth.uid()
  );

-- Cashier/admin/owner can create sales
DROP POLICY IF EXISTS "sales_insert_cashier" ON public.sales;
CREATE POLICY "sales_insert_cashier" ON public.sales
  FOR INSERT WITH CHECK (has_role(ARRAY['owner', 'admin', 'cashier']));

-- Only owner/admin can update sale status (void, etc)
DROP POLICY IF EXISTS "sales_update_admin" ON public.sales;
CREATE POLICY "sales_update_admin" ON public.sales
  FOR UPDATE USING (has_role(ARRAY['owner', 'admin']));

-- ============================================================
-- SALES_DETAILS table policies
-- ============================================================

-- Owner/admin can see all details
DROP POLICY IF EXISTS "sales_details_select_admin" ON public.sales_details;
CREATE POLICY "sales_details_select_admin" ON public.sales_details
  FOR SELECT USING (has_role(ARRAY['owner', 'admin']));

-- Cashier can see details of their own sales
DROP POLICY IF EXISTS "sales_details_select_cashier" ON public.sales_details;
CREATE POLICY "sales_details_select_cashier" ON public.sales_details
  FOR SELECT USING (
    has_role(ARRAY['cashier']) AND EXISTS (
      SELECT 1 FROM public.sales
      WHERE id = sales_details.sale_id AND cashier_id = auth.uid()
    )
  );

-- Authenticated can insert details
DROP POLICY IF EXISTS "sales_details_insert_auth" ON public.sales_details;
CREATE POLICY "sales_details_insert_auth" ON public.sales_details
  FOR INSERT WITH CHECK (has_role(ARRAY['owner', 'admin', 'cashier']));

-- ============================================================
-- PAYMENTS table policies
-- ============================================================

-- Owner/admin can see all payments
DROP POLICY IF EXISTS "payments_select_admin" ON public.payments;
CREATE POLICY "payments_select_admin" ON public.payments
  FOR SELECT USING (has_role(ARRAY['owner', 'admin']));

-- Cashier can see payments of their own sales
DROP POLICY IF EXISTS "payments_select_cashier" ON public.payments;
CREATE POLICY "payments_select_cashier" ON public.payments
  FOR SELECT USING (
    has_role(ARRAY['cashier']) AND EXISTS (
      SELECT 1 FROM public.sales
      WHERE id = payments.sale_id AND cashier_id = auth.uid()
    )
  );

-- Authenticated can insert payments
DROP POLICY IF EXISTS "payments_insert_auth" ON public.payments;
CREATE POLICY "payments_insert_auth" ON public.payments
  FOR INSERT WITH CHECK (has_role(ARRAY['owner', 'admin', 'cashier']));

-- Owner/admin can update payments (refund, etc)
DROP POLICY IF EXISTS "payments_update_admin" ON public.payments;
CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE USING (has_role(ARRAY['owner', 'admin']));

-- ============================================================
-- STOCK_MOVEMENTS table policies
-- ============================================================

-- Owner/admin/warehouse can view all movements
DROP POLICY IF EXISTS "stock_movements_select_staff" ON public.stock_movements;
CREATE POLICY "stock_movements_select_staff" ON public.stock_movements
  FOR SELECT USING (has_role(ARRAY['owner', 'admin', 'warehouse', 'cashier']));

-- Stock movements are INSERT-only via RPC (no direct insert from UI)
-- The RPC functions run with SECURITY DEFINER and bypass RLS

-- ============================================================
-- AUDIT_LOGS table policies
-- ============================================================

-- Only owner/admin can read audit logs
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (has_role(ARRAY['owner', 'admin']));

-- Audit logs are written server-side via service role key (bypasses RLS)

-- ============================================================
-- Notes for Service Role Key usage
-- ============================================================
-- The app uses service role key (SUPABASE_SERVICE_ROLE_KEY) for all
-- server-side operations which bypasses RLS entirely. RLS policies above
-- apply only to browser client (anon key) operations.
-- 
-- This is intentional: all business logic is validated server-side,
-- and RLS serves as an additional safety layer.
