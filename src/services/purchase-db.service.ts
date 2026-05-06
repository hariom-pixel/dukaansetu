import { getDb } from '@/lib/db'

export type SupplierRow = {
  id: number
  name: string
  outstanding: number
  leadDays: number
  rating: number
}

export type PurchaseLineRow = {
  sku: string
  name: string
  qty: number
  price: number
}

export type PurchaseRow = {
  id: string
  supplier: string
  supplier_name: string
  items: number
  value: number
  status: string
  eta: string | null
  created_at: number
  lines: PurchaseLineRow[]
}

export async function getAllSuppliers(): Promise<SupplierRow[]> {
  const db = await getDb()

  return await db.select<SupplierRow[]>(
    `
    SELECT
      id,
      name,
      COALESCE(outstanding, 0) as outstanding,
      lead_days as leadDays,
      COALESCE(rating, 0) as rating
    FROM suppliers
    ORDER BY name ASC
    `
  )
}

export async function getAllPurchases(): Promise<PurchaseRow[]> {
  const db = await getDb()

  const purchases = await db.select<any[]>(
    `
    SELECT
      id,
      supplier_name,
      supplier_name as supplier,
      items,
      value,
      status,
      eta,
      created_at
    FROM purchases
    ORDER BY created_at DESC
    `
  )

  const purchaseItems = await db.select<any[]>(
    `
    SELECT
      purchase_id,
      sku,
      name,
      qty,
      price
    FROM purchase_items
    ORDER BY id ASC
    `
  )

  const itemMap = new Map<string, PurchaseLineRow[]>()

  for (const item of purchaseItems) {
    const current = itemMap.get(item.purchase_id) || []

    current.push({
      sku: item.sku,
      name: item.name,
      qty: Number(item.qty || 0),
      price: Number(item.price || 0),
    })

    itemMap.set(item.purchase_id, current)
  }

  return purchases.map((po) => ({
    id: po.id,
    supplier: po.supplier,
    supplier_name: po.supplier_name,
    items: Number(po.items || 0),
    value: Number(po.value || 0),
    status: po.status,
    eta: po.eta,
    created_at: Number(po.created_at || 0),
    lines: itemMap.get(po.id) || [],
  }))
}

export async function createSupplier(name: string) {
  const db = await getDb()

  const cleanName = name.trim()

  if (!cleanName) {
    throw new Error('Supplier name required')
  }

  const existing = await db.select<any[]>(
    `
    SELECT id
    FROM suppliers
    WHERE lower(name) = lower(?)
    LIMIT 1
    `,
    [cleanName]
  )

  if (existing.length > 0) {
    throw new Error('Supplier already exists')
  }

  await db.execute(
    `
    INSERT INTO suppliers(name)
    VALUES (?)
    `,
    [cleanName]
  )
}

export async function createPurchase(po: {
  id: string
  supplier: string
  items: number
  value: number
  status: string
  eta: string
  line: {
    sku: string
    name: string
    qty: number
    price: number
  }
}) {
  const db = await getDb()

  const supplierName = po.supplier.trim()

  if (!po.id) {
    throw new Error('Purchase ID required')
  }

  if (!supplierName) {
    throw new Error('Supplier required')
  }

  if (!po.line?.sku) {
    throw new Error('Product required')
  }

  if (Number(po.line.qty || 0) <= 0) {
    throw new Error('Quantity must be greater than 0')
  }

  if (Number(po.line.price || 0) <= 0) {
    throw new Error('Price must be greater than 0')
  }

  const supplierRows = await db.select<any[]>(
    `
    SELECT id
    FROM suppliers
    WHERE name = ?
    LIMIT 1
    `,
    [supplierName]
  )

  if (supplierRows.length === 0) {
    throw new Error('Supplier not found')
  }

  const productRows = await db.select<any[]>(
    `
    SELECT id, sku, name
    FROM products
    WHERE sku = ?
    LIMIT 1
    `,
    [po.line.sku]
  )

  if (productRows.length === 0) {
    throw new Error('Selected product not found')
  }

  const value = Number(po.line.qty || 0) * Number(po.line.price || 0)

  await db.execute(
    `
    INSERT INTO purchases
      (id, supplier_name, items, value, status, eta)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      po.id,
      supplierName,
      Number(po.line.qty || 0),
      value,
      po.status || 'Draft',
      po.eta || null,
    ]
  )

  await db.execute(
    `
    INSERT INTO purchase_items
      (purchase_id, sku, name, qty, price)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      po.id,
      po.line.sku,
      po.line.name,
      Number(po.line.qty || 0),
      Number(po.line.price || 0),
    ]
  )
}

export async function receivePurchase(poId: string) {
  const db = await getDb()

  const purchases = await db.select<any[]>(
    `
    SELECT *
    FROM purchases
    WHERE id = ?
    LIMIT 1
    `,
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
    `
    SELECT *
    FROM purchase_items
    WHERE purchase_id = ?
    `,
    [poId]
  )

  if (items.length === 0) {
    throw new Error('Purchase has no items')
  }

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
      throw new Error(`Product not found: ${item.name}`)
    }

    const product = productRows[0]

    await db.execute(
      `
      UPDATE products
      SET
        stock = stock + ?,
        updated_at = strftime('%s', 'now')
      WHERE sku = ?
      `,
      [Number(item.qty || 0), item.sku]
    )

    await db.execute(
      `
      INSERT INTO stock_movements
        (product_id, sku, product_name, qty, direction, reason, ref_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(product.id),
        item.sku,
        item.name,
        Number(item.qty || 0),
        'IN',
        'PURCHASE_RECEIVE',
        poId,
        `Received from ${po.supplier_name}`,
      ]
    )
  }

  await db.execute(
    `
    UPDATE suppliers
    SET outstanding = outstanding + ?
    WHERE name = ?
    `,
    [Number(po.value || 0), po.supplier_name]
  )

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
    `
    SELECT *
    FROM suppliers
    WHERE id = ?
    LIMIT 1
    `,
    [supplierId]
  )

  if (suppliers.length === 0) {
    throw new Error('Supplier not found')
  }

  const supplier = suppliers[0]
  const outstanding = Number(supplier.outstanding || 0)
  const paymentAmount = Number(amount || 0)

  if (paymentAmount <= 0) {
    throw new Error('Invalid amount')
  }

  if (paymentAmount > outstanding) {
    throw new Error('Amount exceeds outstanding')
  }

  await db.execute(
    `
    UPDATE suppliers
    SET outstanding = MAX(outstanding - ?, 0)
    WHERE id = ?
    `,
    [paymentAmount, supplierId]
  )

  return paymentAmount
}
