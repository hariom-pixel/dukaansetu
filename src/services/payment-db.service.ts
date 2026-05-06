import { getDb } from '@/lib/db'

export type PaymentDirection = 'IN' | 'OUT'
export type PaymentPartyType = 'CUSTOMER' | 'SUPPLIER'
export type PaymentSourceType =
  | 'SALE'
  | 'CUSTOMER_PAYMENT'
  | 'INVOICE_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'REFUND'
  | 'VOID'
  | 'RETURN'

export type PaymentRow = {
  id: string
  partyType: PaymentPartyType
  partyId: string | null
  partyName: string
  sourceType: PaymentSourceType
  sourceId: string | null
  amount: number
  mode: string
  direction: PaymentDirection
  note: string | null
  createdAt: number
  date: string
}

function createPaymentId() {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
      : `${Date.now()}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

  return `PAY-${random}`
}

export async function addPayment(input: {
  partyType: PaymentPartyType
  partyId?: string | number | null
  partyName: string
  sourceType: PaymentSourceType
  sourceId?: string | number | null
  amount: number
  mode?: string
  direction: PaymentDirection
  note?: string | null
}) {
  const db = await getDb()

  const amount = Number(input.amount || 0)

  if (amount <= 0) {
    throw new Error('Invalid payment amount')
  }

  const id = createPaymentId()

  await db.execute(
    `
    INSERT INTO payments
      (id, party_type, party_id, party_name, source_type, source_id, amount, mode, direction, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.partyType,
      input.partyId != null ? String(input.partyId) : null,
      input.partyName,
      input.sourceType,
      input.sourceId != null ? String(input.sourceId) : null,
      amount,
      input.mode || 'Cash',
      input.direction,
      input.note ?? null,
    ]
  )

  return id
}

export async function getPaymentsBySource(
  sourceType: PaymentSourceType,
  sourceId: string
): Promise<PaymentRow[]> {
  const db = await getDb()

  return await db.select<PaymentRow[]>(
    `
    SELECT
      id,
      party_type as partyType,
      party_id as partyId,
      party_name as partyName,
      source_type as sourceType,
      source_id as sourceId,
      amount,
      mode,
      direction,
      note,
      created_at as createdAt,
      datetime(created_at, 'unixepoch', 'localtime') as date
    FROM payments
    WHERE source_type = ?
      AND source_id = ?
    ORDER BY created_at DESC, id DESC
    `,
    [sourceType, sourceId]
  )
}

export async function getPaymentsByParty(
  partyType: PaymentPartyType,
  partyId: string | number
): Promise<PaymentRow[]> {
  const db = await getDb()

  return await db.select<PaymentRow[]>(
    `
    SELECT
      id,
      party_type as partyType,
      party_id as partyId,
      party_name as partyName,
      source_type as sourceType,
      source_id as sourceId,
      amount,
      mode,
      direction,
      note,
      created_at as createdAt,
      datetime(created_at, 'unixepoch', 'localtime') as date
    FROM payments
    WHERE party_type = ?
      AND party_id = ?
    ORDER BY created_at DESC, id DESC
    `,
    [partyType, String(partyId)]
  )
}

export async function getRecentPayments(limit = 50): Promise<PaymentRow[]> {
  const db = await getDb()

  return await db.select<PaymentRow[]>(
    `
    SELECT
      id,
      party_type as partyType,
      party_id as partyId,
      party_name as partyName,
      source_type as sourceType,
      source_id as sourceId,
      amount,
      mode,
      direction,
      note,
      created_at as createdAt,
      datetime(created_at, 'unixepoch', 'localtime') as date
    FROM payments
    ORDER BY created_at DESC, id DESC
    LIMIT ?
    `,
    [limit]
  )
}
