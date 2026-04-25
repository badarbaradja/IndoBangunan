import { Product } from './database'

export interface POSProduct extends Product {
  // Tambahan tipe untuk relasi table
  category?: { name: string }
}

export interface POSCartItem {
  product: POSProduct
  qty: number
  subtotal: number
}
