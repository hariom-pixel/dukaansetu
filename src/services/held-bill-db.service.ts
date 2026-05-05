import { getDb } from '@/lib/db'

export type HeldBillRow = {
  id: string
  cart: any[]
  createdAt: string
  customerName?: string
  customerPhone?: string
  discountValue?: number
  discountType?: 'percent' | 'flat'
  gstMode?: 'with' | 'without'
  gstRate?: number
  paymentMode?: 'Cash' | 'UPI' | 'Card'
}

export async function getHeldBills(): Promise<HeldBillRow[]> {
  const db = await getDb()

  const rows = await db.select<any[]>(
    `
    SELECT id, payload_json, created_at
    FROM held_bills
    ORDER BY created_at DESC
    `
  )

  return rows.map((r) => {
    const payload = JSON.parse(r.payload_json || '{}')

    return {
      id: r.id,
      ...payload,
      createdAt:
        payload.createdAt ||
        new Date(Number(r.created_at || 0) * 1000).toLocaleString(),
    }
  })
}

export async function saveHeldBill(bill: HeldBillRow) {
  const db = await getDb()

  await db.execute(
    `
    INSERT OR REPLACE INTO held_bills (
      id,
      payload_json,
      created_at
    )
    VALUES (?, ?, COALESCE(
      (SELECT created_at FROM held_bills WHERE id = ?),
      strftime('%s','now')
    ))
    `,
    [bill.id, JSON.stringify(bill), bill.id]
  )
}

export async function deleteHeldBill(id: string) {
  const db = await getDb()

  await db.execute(
    `
    DELETE FROM held_bills
    WHERE id = ?
    `,
    [id]
  )
}
