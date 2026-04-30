import { getDb } from '@/lib/db'

export type SaleInput = {
  id: string
  customerName: string
  customerPhone?: string
  subtotal: number
  discount: number
  discountValue: number
  discountType: 'percent' | 'flat'
  tax: number
  gstRate: number
  gstMode: 'with' | 'without'
  total: number
  paymentMode: string
  saleMode: 'paid' | 'credit'
}

export type SaleItemInput = {
  sku: string
  name: string
  price: number
  qty: number
}

export async function createSale(sale: SaleInput, items: SaleItemInput[]) {
  const db = await getDb()

  await db.execute(
    `INSERT INTO sales (
      id, customer_name, customer_phone,
      subtotal, discount, discount_value, discount_type,
      tax, gst_rate, gst_mode,
      total, payment_mode, sale_mode,
      paid_amount, due_amount, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sale.id,
      sale.customerName,
      sale.customerPhone || null,
      sale.subtotal,
      sale.discount,
      sale.discountValue,
      sale.discountType,
      sale.tax,
      sale.gstRate,
      sale.gstMode,
      sale.total,
      sale.paymentMode,
      sale.saleMode,
      sale.saleMode === 'paid' ? sale.total : 0,
      sale.saleMode === 'credit' ? sale.total : 0,
      sale.saleMode === 'credit' ? 'Credit' : 'Paid',
    ]
  )

  for (const item of items) {
    await db.execute(
      `INSERT INTO sale_items
      (sale_id, sku, name, price, qty, line_total)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sale.id,
        item.sku,
        item.name,
        item.price,
        item.qty,
        item.price * item.qty,
      ]
    )

    await db.execute(
      `UPDATE products
       SET stock = stock - ?
       WHERE sku = ?`,
      [item.qty, item.sku]
    )
  }
}
