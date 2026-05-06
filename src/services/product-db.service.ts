import { getDb } from '@/lib/db'

export type ProductRow = {
  id: number
  sku: string
  name: string
  barcode: string | null
  price: number
  costPrice: number
  stock: number
  category: string | null
  reorderLevel: number
  hsnCode: string | null
  gstRate: number
  taxInclusive: number
}

export async function getAllProducts(): Promise<ProductRow[]> {
  const db = await getDb()

  return await db.select<ProductRow[]>(
    `
    SELECT 
      id,
      sku,
      name,
      barcode,
      price,
      COALESCE(cost_price, 0) as costPrice,
      stock,
      category,
      reorder_level as reorderLevel,
      hsn_code as hsnCode,
      COALESCE(gst_rate, 0) as gstRate,
      COALESCE(tax_inclusive, 1) as taxInclusive
    FROM products
    ORDER BY id DESC
    `
  )
}

export async function createProduct(input: {
  sku: string
  name: string
  barcode?: string
  price: number
  costPrice?: number
  stock?: number
  category?: string
  reorderLevel?: number
  hsnCode?: string
  gstRate?: number
  taxInclusive?: boolean
}) {
  const db = await getDb()

  await db.execute(
    `INSERT INTO products 
        (sku, name, barcode, price, cost_price, stock, category, reorder_level, hsn_code, gst_rate, tax_inclusive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.sku,
      input.name,
      input.barcode || null,
      input.price,
      input.costPrice ?? 0,
      input.stock ?? 0,
      input.category ?? null,
      input.reorderLevel ?? 20,
      input.hsnCode?.trim() || null,
      input.gstRate ?? 0,
      input.taxInclusive === false ? 0 : 1,
    ]
  )
}

export async function updateProduct(
  id: number,
  input: {
    name: string
    barcode?: string
    price: number
    costPrice: number
    reorderLevel: number
    hsnCode?: string
    gstRate: number
    taxInclusive: boolean
  }
) {
  const db = await getDb()

  await db.execute(
    `UPDATE products
      SET name = ?, barcode = ?, price = ?, cost_price = ?, reorder_level = ?, hsn_code = ?, gst_rate = ?, tax_inclusive = ?
      WHERE id = ?`,
    [
      input.name,
      input.barcode || null,
      input.price,
      input.costPrice,
      input.reorderLevel,
      input.hsnCode?.trim() || null,
      input.gstRate,
      input.taxInclusive ? 1 : 0,
      id,
    ]
  )
}

export async function updateProductStock(id: number, stock: number) {
  const db = await getDb()

  await db.execute(`UPDATE products SET stock = ? WHERE id = ?`, [stock, id])
}

export async function deleteProduct(id: number) {
  const db = await getDb()

  await db.execute(`DELETE FROM products WHERE id = ?`, [id])
}

export async function getTopSellingProducts(limit = 10): Promise<ProductRow[]> {
  const db = await getDb()

  const rows = await db.select<ProductRow[]>(
    `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.barcode,
      p.price,
      COALESCE(p.cost_price, 0) as costPrice,
      p.stock,
      p.category,
      p.reorder_level as reorderLevel,
      p.hsn_code as hsnCode,
      COALESCE(p.gst_rate, 0) as gstRate,
      COALESCE(p.tax_inclusive, 1) as taxInclusive
    FROM products p
    LEFT JOIN (
      SELECT
        sku,
        SUM(qty) as sold_qty
      FROM sale_items
      GROUP BY sku
    ) s ON s.sku = p.sku
    ORDER BY
      COALESCE(s.sold_qty, 0) DESC,
      p.name ASC
    LIMIT ?
    `,
    [limit]
  )

  return rows
}

export async function createProductFromBarcode(input: {
  sku: string
  name: string
  barcode: string
  price: number
  costPrice?: number
  stock: number
  category?: string
  hsnCode?: string
  gstRate?: number
  taxInclusive?: boolean
}) {
  const db = await getDb()

  await db.execute(
    `
    INSERT INTO products (
      sku,
      name,
      barcode,
      price,
      cost_price,
      stock,
      category,
      hsn_code,
      gst_rate,
      tax_inclusive,
      reorder_level
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.sku,
      input.name,
      input.barcode,
      input.price,
      input.costPrice ?? 0,
      input.stock,
      input.category || 'General',
      input.hsnCode?.trim() || null,
      input.gstRate ?? 0,
      input.taxInclusive === false ? 0 : 1,
      10,
    ]
  )
}
