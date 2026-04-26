import { Product, Category } from './database'

// POSProduct menggunakan Product dari database secara langsung
// Joined category cukup menggunakan Category yang sudah memiliki semua field
export type POSProduct = Omit<Product, 'category'> & {
  category?: Pick<Category, 'name'>
}

export interface POSCartItem {
  product: POSProduct
  qty: number
  subtotal: number
}
