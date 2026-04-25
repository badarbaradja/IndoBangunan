// types/database.ts - Generated types matching Supabase schema

export type UserRole = 'owner' | 'admin' | 'cashier' | 'warehouse'
export type SaleStatus = 'pending' | 'success' | 'void' | 'returned'
export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'credit'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired' | 'refunded'
export type StockMovementType = 'purchase_in' | 'sale_out' | 'adjustment' | 'void_return' | 'return_in'
export type TransactionType = 'sale' | 'void' | 'return' | 'purchase'

export interface User {
  id: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Product {
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
  // Joined
  category?: Category
}

export interface Sale {
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
  // Joined
  cashier?: User
  details?: SaleDetail[]
  payment?: Payment
}

export interface SaleDetail {
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

export interface Payment {
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

export interface StockMovement {
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
  // Joined
  product?: Product
  performer?: User
}

export interface AuditLog {
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
// ============================================================

export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: Partial<User>; Update: Partial<User> }
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> }
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> }
      sales: { Row: Sale; Insert: Partial<Sale>; Update: Partial<Sale> }
      sales_details: { Row: SaleDetail; Insert: Partial<SaleDetail>; Update: Partial<SaleDetail> }
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
      stock_movements: { Row: StockMovement; Insert: Partial<StockMovement>; Update: Partial<StockMovement> }
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> }
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