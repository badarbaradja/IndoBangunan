// src/types/pos.ts
export interface Product {
  id: string
  name: string
  sku: string
  selling_price: number
  stock: number
  unit: string
  image_url: string | null
  category?: { name: string } | null
  description?: string | null
  is_low_stock?: boolean
  is_out_of_stock?: boolean
}

export interface CartItem {
  product_id: string
  product_name: string
  unit: string
  qty: number
  unit_price: number
  max_stock: number
}
