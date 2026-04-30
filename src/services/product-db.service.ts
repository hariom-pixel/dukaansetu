import { getDb } from '@/lib/db'

export type ProductRow = {
  id: number
  sku: string
  name: string
  barcode: string | null
  price: number
  stock: number
  category: string | null
  reorderLevel: number
}

export async function getAllProducts(): Promise<ProductRow[]> {
  const db = await getDb()

  return await db.select<ProductRow[]>(
    `SELECT 
      id,
      sku,
      name,
      barcode,
      price,
      stock,
      category,
      reorder_level as reorderLevel
    FROM products
    ORDER BY id DESC`
  )
}

export async function createProduct(input: {
  sku: string
  name: string
  barcode?: string
  price: number
  stock?: number
  category?: string
  reorderLevel?: number
}) {
  const db = await getDb()

  await db.execute(
    `INSERT INTO products 
      (sku, name, barcode, price, stock, category, reorder_level)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.sku,
      input.name,
      input.barcode || null,
      input.price,
      input.stock ?? 0,
      input.category ?? null,
      input.reorderLevel ?? 20,
    ]
  )
}

export async function updateProduct(
  id: number,
  input: {
    name: string
    barcode?: string
    price: number
    reorderLevel: number
  }
) {
  const db = await getDb()

  await db.execute(
    `UPDATE products
     SET name = ?, barcode = ?, price = ?, reorder_level = ?
     WHERE id = ?`,
    [input.name, input.barcode || null, input.price, input.reorderLevel, id]
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
