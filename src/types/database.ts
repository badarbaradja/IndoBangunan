// types/database.ts - Generated types matching Supabase schema

export type UserRole = 'owner' | 'admin' | 'cashier' | 'warehouse'
export type SaleStatus = 'pending' | 'success' | 'void' | 'returned'
export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'credit'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired' | 'refunded'
export type StockMovementType = 'purchase_in' | 'sale_out' | 'adjustment' | 'void_return' | 'return_in'
export type TransactionType = 'sale' | 'void' | 'return' | 'purchase'

// ============================================================
// Raw DB Row interfaces (NO joined fields)
// ============================================================

export interface UserRow {
  id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryRow {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface ProductRow {
  id: string
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category_id: string | null
  unit: string
  cost_price: number
  selling_price: number
  wholesale_price: number | null
  min_wholesale_qty: number
  stock: number
  stock_minimum: number
  stock_maximum: number | null
  allow_negative_stock: boolean
  negative_stock_limit: number
  is_active: boolean
  image_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SaleRow {
  id: string
  invoice_number: string
  cashier_id: string
  customer_name: string | null
  customer_phone: string | null
  subtotal: number
  discount_amount: number
  discount_percent: number
  tax_amount: number
  total: number
  payment_method: PaymentMethod
  status: SaleStatus
  notes: string | null
  is_offline_created: boolean
  offline_id: string | null
  synced_at: string | null
  original_sale_id: string | null
  transaction_type: TransactionType
  created_at: string
  updated_at: string
}

export interface SaleDetailRow {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  product_sku: string
  unit: string
  qty: number
  unit_price: number
  discount_amount: number
  line_total: number
  created_at: string
}

export interface PaymentRow {
  id: string
  sale_id: string
  payment_method: PaymentMethod
  amount: number
  amount_paid: number | null
  change_amount: number
  status: PaymentStatus
  gateway_provider: string | null
  gateway_transaction_id: string | null
  gateway_order_id: string | null
  gateway_payment_url: string | null
  gateway_qr_string: string | null
  gateway_raw_response: Record<string, unknown> | null
  idempotency_key: string
  webhook_received_at: string | null
  processed_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface StockMovementRow {
  id: string
  product_id: string
  type: StockMovementType
  qty_change: number
  qty_before: number
  qty_after: number
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  performed_by: string | null
  created_at: string
}

export interface AuditLogRow {
  id: string
  user_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// ============================================================
// Application interfaces (WITH optional joined fields)
// These are used in application code, NOT in Database<> type
// ============================================================

/** User dipakai di semua business logic */
export type User = UserRow
/** Category dipakai di semua business logic */
export type Category = CategoryRow

/** Product dengan optional joined category */
export type Product = ProductRow & {
  category?: CategoryRow
}

/** Sale dengan optional joined fields */
export type Sale = SaleRow & {
  cashier?: UserRow
  details?: SaleDetailRow[]
  payment?: PaymentRow
}

/** SaleDetail (alias) */
export type SaleDetail = SaleDetailRow

/** Payment (alias) */
export type Payment = PaymentRow

/** StockMovement dengan optional joined fields */
export type StockMovement = StockMovementRow & {
  product?: ProductRow
  performer?: UserRow
}

/** AuditLog (alias) */
export type AuditLog = AuditLogRow

// ============================================================
// Insert types (optional fields = auto-generated or nullable)
// ============================================================

export interface UserInsert {
  id: string
  full_name: string
  email?: string
  role: UserRole
  is_active?: boolean
}

export interface SaleInsert {
  invoice_number: string
  cashier_id: string
  customer_name?: string | null
  customer_phone?: string | null
  subtotal: number
  discount_amount?: number
  discount_percent?: number
  tax_amount?: number
  total: number
  payment_method: PaymentMethod
  status?: SaleStatus
  notes?: string | null
  is_offline_created?: boolean
  offline_id?: string | null
  synced_at?: string | null
  original_sale_id?: string | null
  transaction_type?: TransactionType
}

export interface SaleDetailInsert {
  sale_id: string
  product_id: string
  product_name: string
  product_sku: string
  unit: string
  qty: number
  unit_price: number
  discount_amount?: number
  line_total: number
}

export interface PaymentInsert {
  sale_id: string
  payment_method: PaymentMethod
  amount: number
  amount_paid?: number | null
  change_amount?: number
  status?: PaymentStatus
  gateway_provider?: string | null
  gateway_transaction_id?: string | null
  gateway_order_id?: string | null
  gateway_payment_url?: string | null
  gateway_qr_string?: string | null
  gateway_raw_response?: Record<string, unknown> | null
  idempotency_key?: string
  processed_at?: string | null
  expires_at?: string | null
}

export interface AuditLogInsert {
  user_id?: string | null
  action: string
  table_name?: string | null
  record_id?: string | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  ip_address?: string | null
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface CreateSaleRequest {
  customer_name?: string
  customer_phone?: string
  items: CartItem[]
  payment_method: PaymentMethod
  discount_amount?: number
  discount_percent?: number
  notes?: string
  // Offline support
  offline_id?: string
  is_offline_created?: boolean
}

export interface CartItem {
  product_id: string
  qty: number
  discount_amount?: number
}

export interface CreateSaleResponse {
  sale: Sale
  payment: Payment
}

export interface CreatePaymentRequest {
  sale_id: string
  amount_paid?: number  // for cash only
  idempotency_key: string
}

export interface WebhookPayload {
  // Midtrans fields
  order_id?: string
  transaction_id?: string
  transaction_status?: string
  payment_type?: string
  gross_amount?: string
  signature_key?: string
  // Xendit fields
  id?: string
  external_id?: string
  status?: string
  amount?: number
}

export interface StockAdjustmentRequest {
  product_id: string
  qty_change: number
  notes: string
  type: 'adjustment'
}

export interface VoidSaleRequest {
  sale_id: string
  reason: string
}

export interface SyncOfflineSaleRequest {
  sales: CreateSaleRequest[]
}

// ============================================================
// Supabase Database type definition
// IMPORTANT: Row, Insert, Update MUST NOT include joined fields
// ============================================================

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: Partial<UserInsert>
      }
      categories: {
        Row: CategoryRow
        Insert: { name: string; description?: string | null }
        Update: { name?: string; description?: string | null }
      }
      products: {
        Row: ProductRow
        Insert: {
          sku: string
          barcode?: string | null
          name: string
          description?: string | null
          category_id?: string | null
          unit: string
          cost_price?: number
          selling_price: number
          wholesale_price?: number | null
          min_wholesale_qty?: number
          stock?: number
          stock_minimum?: number
          stock_maximum?: number | null
          allow_negative_stock?: boolean
          negative_stock_limit?: number
          is_active?: boolean
          image_url?: string | null
          created_by?: string | null
        }
        Update: {
          sku?: string
          barcode?: string | null
          name?: string
          description?: string | null
          category_id?: string | null
          unit?: string
          cost_price?: number
          selling_price?: number
          wholesale_price?: number | null
          min_wholesale_qty?: number
          stock_minimum?: number
          stock_maximum?: number | null
          allow_negative_stock?: boolean
          negative_stock_limit?: number
          is_active?: boolean
          image_url?: string | null
        }
      }
      sales: {
        Row: SaleRow
        Insert: SaleInsert
        Update: { status?: SaleStatus; notes?: string | null; synced_at?: string | null }
      }
      sales_details: {
        Row: SaleDetailRow
        Insert: SaleDetailInsert
        Update: Partial<SaleDetailInsert>
      }
      payments: {
        Row: PaymentRow
        Insert: PaymentInsert
        Update: {
          status?: PaymentStatus
          processed_at?: string | null
          webhook_received_at?: string | null
          gateway_raw_response?: Record<string, unknown> | null
        }
      }
      stock_movements: {
        Row: StockMovementRow
        Insert: {
          product_id: string
          type: StockMovementType
          qty_change: number
          qty_before: number
          qty_after: number
          reference_type?: string | null
          reference_id?: string | null
          notes?: string | null
          performed_by?: string | null
        }
        Update: never
      }
      audit_logs: {
        Row: AuditLogRow
        Insert: AuditLogInsert
        Update: never
      }
    }
    Functions: {
      generate_invoice_number: {
        Args: Record<string, never>
        Returns: string
      }
      update_stock_atomic: {
        Args: {
          p_product_id: string
          p_qty_change: number
          p_movement_type: StockMovementType
          p_reference_type: string
          p_reference_id: string
          p_performed_by: string
          p_notes?: string
        }
        Returns: Record<string, unknown>
      }
      process_sale_stock: {
        Args: { p_sale_id: string }
        Returns: void
      }
    }
  }
}