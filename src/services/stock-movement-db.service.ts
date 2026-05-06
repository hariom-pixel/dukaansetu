import { getDb } from '@/lib/db'

export type StockMovementRow = {
  id: number
  sku: string
  productName: string
  qty: number
  direction: 'IN' | 'OUT'
  reason: 'SALE' | 'PURCHASE_RECEIVE' | 'RETURN' | 'VOID' | 'ADJUSTMENT'
  refId: string | null
  note: string | null
  createdAt: number
  date: string
}

export async function getRecentStockMovements(
  limit = 20
): Promise<StockMovementRow[]> {
  const db = await getDb()

  return await db.select<StockMovementRow[]>(
    `
    SELECT
      id,
      sku,
      product_name as productName,
      qty,
      direction,
      reason,
      ref_id as refId,
      note,
      created_at as createdAt,
      datetime(created_at, 'unixepoch', 'localtime') as date
    FROM stock_movements
    ORDER BY created_at DESC, id DESC
    LIMIT ?
    `,
    [limit]
  )
}

export async function addStockMovement(input: {
  productId?: number | null
  sku: string
  productName: string
  qty: number
  direction: 'IN' | 'OUT'
  reason: 'SALE' | 'PURCHASE_RECEIVE' | 'RETURN' | 'VOID' | 'ADJUSTMENT'
  refId?: string | number | null
  note?: string | null
}) {
  const db = await getDb()

  await db.execute(
    `
    INSERT INTO stock_movements
      (product_id, sku, product_name, qty, direction, reason, ref_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.productId ?? null,
      input.sku,
      input.productName,
      input.qty,
      input.direction,
      input.reason,
      input.refId != null ? String(input.refId) : null,
      input.note ?? null,
    ]
  )
}
