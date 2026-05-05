import { getDb } from '@/lib/db'

export type SaleInput = {
  id: string
  customerId?: number | null
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

  if (!items.length) {
    throw new Error('Cannot create sale without items')
  }

  // 1. Validate stock before saving invoice
  for (const item of items) {
    const rows = await db.select<any[]>(
      `
      SELECT id, sku, name, stock
      FROM products
      WHERE sku = ?
      LIMIT 1
      `,
      [item.sku]
    )

    if (rows.length === 0) {
      throw new Error(`Product not found: ${item.name}`)
    }

    const product = rows[0]

    if (Number(product.stock || 0) < Number(item.qty || 0)) {
      throw new Error(`Not enough stock for ${item.name}`)
    }
  }

  // 2. Create sale
  await db.execute(
    `
    INSERT INTO sales (
      id, customer_id, customer_name, customer_phone,
      subtotal, discount, discount_value, discount_type,
      tax, gst_rate, gst_mode,
      total, payment_mode, sale_mode,
      paid_amount, due_amount, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      sale.id,
      sale.customerId ?? null,
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

  // 3. Insert sale items, reduce stock, and create stock movement
  for (const item of items) {
    const productRows = await db.select<any[]>(
      `
      SELECT id, stock
      FROM products
      WHERE sku = ?
      LIMIT 1
      `,
      [item.sku]
    )

    if (productRows.length === 0) {
      throw new Error(`Product not found while billing: ${item.name}`)
    }

    const product = productRows[0]

    await db.execute(
      `
      INSERT INTO sale_items
        (sale_id, product_id, sku, name, price, qty, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        sale.id,
        product.id,
        item.sku,
        item.name,
        item.price,
        item.qty,
        item.price * item.qty,
      ]
    )

    await db.execute(
      `
      UPDATE products
      SET
        stock = stock - ?,
        updated_at = strftime('%s', 'now')
      WHERE sku = ?
      `,
      [item.qty, item.sku]
    )

    await db.execute(
      `
      INSERT INTO stock_movements
        (product_id, sku, product_name, qty, direction, reason, ref_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product.id,
        item.sku,
        item.name,
        item.qty,
        'OUT',
        'SALE',
        sale.id,
        `Invoice ${sale.id}`,
      ]
    )
  }

  // 4. Update customer balance for udhaar
  if (sale.saleMode === 'credit' && sale.customerId) {
    await db.execute(
      `
      UPDATE customers
      SET balance = balance + ?
      WHERE id = ?
      `,
      [sale.total, sale.customerId]
    )
  }
}
