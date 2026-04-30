import { getDb } from '@/lib/db'

export async function getAllSuppliers() {
  const db = await getDb()
  return await db.select(`
    SELECT * FROM suppliers
    ORDER BY name
  `)
}

export async function getAllPurchases() {
  const db = await getDb()
  return await db.select(`
    SELECT *
    FROM purchases
    ORDER BY created_at DESC
  `)
}

export async function createSupplier(name: string) {
  const db = await getDb()

  await db.execute(`INSERT INTO suppliers(name) VALUES (?)`, [name])
}

export async function createPurchase(po: any) {
  const db = await getDb()

  await db.execute(
    `
    INSERT INTO purchases
    (id, supplier_name, items, value, status, eta)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [po.id, po.supplier, po.items, po.value, po.status, po.eta]
  )

  await db.execute(
    `
    INSERT INTO purchase_items
    (purchase_id, sku, name, qty, price)
    VALUES (?, ?, ?, ?, ?)
    `,
    [po.id, po.line.sku, po.line.name, po.line.qty, po.line.price]
  )
}

export async function receivePurchase(poId: string) {
  const db = await getDb()

  const purchases = await db.select<any[]>(
    `SELECT * FROM purchases WHERE id = ?`,
    [poId]
  )

  if (purchases.length === 0) {
    throw new Error('Purchase not found')
  }

  const po = purchases[0]

  if (po.status === 'Delivered') {
    return
  }

  const items = await db.select<any[]>(
    `SELECT * FROM purchase_items WHERE purchase_id = ?`,
    [poId]
  )

  // 1. Increase stock
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
      [
        item.sku,
        item.name,
        item.qty,
        'IN',
        'PURCHASE_RECEIVE',
        poId,
        `Received from ${po.supplier_name}`,
      ]
    )
  }

  // 2. Update supplier payable
  await db.execute(
    `
    UPDATE suppliers
    SET outstanding = outstanding + ?
    WHERE name = ?
    `,
    [po.value, po.supplier_name]
  )

  // 3. Mark delivered
  await db.execute(
    `
    UPDATE purchases
    SET status = 'Delivered'
    WHERE id = ?
    `,
    [poId]
  )
}

export async function paySupplier(supplierId: number, amount: number) {
  const db = await getDb()

  const suppliers = await db.select<any[]>(
    `SELECT * FROM suppliers WHERE id = ?`,
    [supplierId]
  )

  if (suppliers.length === 0) {
    throw new Error('Supplier not found')
  }

  const supplier = suppliers[0]
  const outstanding = Number(supplier.outstanding || 0)

  if (amount <= 0) {
    throw new Error('Invalid amount')
  }

  if (amount > outstanding) {
    throw new Error('Amount exceeds outstanding')
  }

  await db.execute(
    `
    UPDATE suppliers
    SET outstanding = MAX(outstanding - ?, 0)
    WHERE id = ?
    `,
    [amount, supplierId]
  )
}
