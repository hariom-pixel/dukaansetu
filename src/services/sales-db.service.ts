import { getDb } from '@/lib/db'

export type SaleItemRow = {
  sku: string
  name: string
  qty: number
  price: number
  costPrice?: number
  profit?: number
  hsnCode?: string | null
  gstRate?: number
  taxAmount?: number
  taxableAmount?: number
  taxInclusive?: number
}

export type SaleRow = {
  id: string
  customerId?: number | null
  customer: string
  channel: string
  amount: number
  subtotal: number
  discount: number
  discountValue: number
  discountType: 'percent' | 'flat'
  tax: number
  gstRate: number
  gstMode: 'with' | 'without'
  paidAmount: number
  dueAmount: number
  status: string
  time: string
  items?: SaleItemRow[]
}

export async function getAllSales(): Promise<SaleRow[]> {
  const db = await getDb()

  return await db.select<SaleRow[]>(
    `
    SELECT
      id,
      customer_id as customerId,
      customer_name as customer,
      channel,
      total as amount,
      subtotal,
      discount,
      discount_value as discountValue,
      discount_type as discountType,
      tax,
      gst_rate as gstRate,
      gst_mode as gstMode,
      paid_amount as paidAmount,
      due_amount as dueAmount,
      status,
      datetime(created_at, 'unixepoch', 'localtime') as time
    FROM sales
    ORDER BY created_at DESC
    `
  )
}

export async function getSaleItems(saleId: string): Promise<SaleItemRow[]> {
  const db = await getDb()

  return await db.select<SaleItemRow[]>(
    `
    SELECT
      sku,
      name,
      qty,
      price,
      COALESCE(cost_price, 0) as costPrice,
      COALESCE(profit, 0) as profit,
      hsn_code as hsnCode,
      COALESCE(gst_rate, 0) as gstRate,
      COALESCE(tax_amount, 0) as taxAmount
      COALESCE(taxable_amount, 0) as taxableAmount,
      COALESCE(tax_inclusive, 1) as taxInclusive
    FROM sale_items
    WHERE sale_id = ?
    ORDER BY id ASC
    `,
    [saleId]
  )
}

export async function collectSalePayment(saleId: string, amount: number) {
  const db = await getDb()

  const rows = await db.select<any[]>(
    `
    SELECT id, paid_amount, due_amount
    FROM sales
    WHERE id = ?
    `,
    [saleId]
  )

  if (rows.length === 0) {
    throw new Error('Invoice not found')
  }

  const sale = rows[0]

  const currentDue = Number(sale.due_amount || 0)
  const currentPaid = Number(sale.paid_amount || 0)

  if (amount <= 0) {
    throw new Error('Invalid amount')
  }

  const applied = Math.min(amount, currentDue)
  const nextDue = Math.max(currentDue - applied, 0)
  const nextPaid = currentPaid + applied

  await db.execute(
    `
    UPDATE sales
    SET
      paid_amount = ?,
      due_amount = ?,
      status = ?
    WHERE id = ?
    `,
    [nextPaid, nextDue, nextDue <= 0 ? 'Paid' : 'Credit', saleId]
  )

  return applied
}

export async function returnSale(saleId: string, reason: string) {
  const db = await getDb()

  const sales = await db.select<any[]>(`SELECT * FROM sales WHERE id = ?`, [
    saleId,
  ])

  if (sales.length === 0) {
    throw new Error('Invoice not found')
  }

  const sale = sales[0]

  if (sale.status === 'Returned') {
    return
  }

  const items = await db.select<any[]>(
    `SELECT * FROM sale_items WHERE sale_id = ?`,
    [saleId]
  )

  // 1. restore stock
  for (const item of items) {
    await db.execute(
      `
      UPDATE products
      SET stock = stock + ?
      WHERE sku = ?
      `,
      [item.qty, item.sku]
    )

    await db.execute(
      `
      INSERT INTO stock_movements
      (sku, product_name, qty, direction, reason, ref_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [item.sku, item.name, item.qty, 'IN', 'RETURN', saleId, reason]
    )
  }

  // 2. mark invoice returned
  await db.execute(
    `
    UPDATE sales
    SET
      status = 'Returned',
      paid_amount = 0,
      due_amount = 0
    WHERE id = ?
    `,
    [saleId]
  )
}

export async function voidSale(saleId: string, reason: string) {
  const db = await getDb()

  const sales = await db.select<any[]>(`SELECT * FROM sales WHERE id = ?`, [
    saleId,
  ])

  if (sales.length === 0) {
    throw new Error('Invoice not found')
  }

  const sale = sales[0]

  if (sale.status === 'Voided') {
    return
  }

  const items = await db.select<any[]>(
    `SELECT * FROM sale_items WHERE sale_id = ?`,
    [saleId]
  )

  // 1. restore stock
  for (const item of items) {
    await db.execute(
      `
      UPDATE products
      SET stock = stock + ?
      WHERE sku = ?
      `,
      [item.qty, item.sku]
    )

    await db.execute(
      `
      INSERT INTO stock_movements
      (sku, product_name, qty, direction, reason, ref_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [item.sku, item.name, item.qty, 'IN', 'VOID', saleId, reason]
    )
  }

  // 2. mark voided
  await db.execute(
    `
    UPDATE sales
    SET
      status = 'Voided',
      paid_amount = 0,
      due_amount = 0
    WHERE id = ?
    `,
    [saleId]
  )
}
