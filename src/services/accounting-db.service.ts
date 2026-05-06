import { getDb } from '@/lib/db'

export type JournalEntryRow = {
  id: string
  date: string
  desc: string
  debit: number
  credit: number
  sourceType: string | null
  sourceId: string | null
  isSystem: number
  balance?: number
}

function createJournalId() {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
      : `${Date.now()}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

  return `J-${random}`
}

export async function getJournalEntries(): Promise<JournalEntryRow[]> {
  const db = await getDb()

  return await db.select<JournalEntryRow[]>(
    `
    SELECT
      id,
      datetime(created_at, 'unixepoch', 'localtime') as date,
      description as desc,
      debit,
      credit,
      source_type as sourceType,
      source_id as sourceId,
      is_system as isSystem
    FROM journal_entries
    ORDER BY created_at ASC, id ASC
    `
  )
}

export async function addJournalEntry(input: {
  desc: string
  debit: number
  credit: number
  sourceType?: string | null
  sourceId?: string | null
  isSystem?: boolean
}) {
  const db = await getDb()

  const id = createJournalId()

  await db.execute(
    `
    INSERT INTO journal_entries
      (id, description, debit, credit, source_type, source_id, is_system)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.desc,
      input.debit,
      input.credit,
      input.sourceType ?? null,
      input.sourceId ?? null,
      input.isSystem ? 1 : 0,
    ]
  )

  return id
}

export async function deleteJournalEntry(id: string) {
  const db = await getDb()

  const rows = await db.select<any[]>(
    `
    SELECT is_system
    FROM journal_entries
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  )

  if (rows.length === 0) {
    throw new Error('Journal entry not found')
  }

  if (Number(rows[0].is_system || 0) === 1) {
    throw new Error('System-generated entries cannot be deleted')
  }

  await db.execute(
    `
    DELETE FROM journal_entries
    WHERE id = ?
    `,
    [id]
  )
}

export async function getAccountingSummary() {
  const db = await getDb()

  const receivables = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(due_amount), 0) as total
    FROM sales
    WHERE status NOT IN ('Voided', 'Returned')
    `
  )

  const payables = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(outstanding), 0) as total
    FROM suppliers
    `
  )

  const journalCount = await db.select<any[]>(
    `
    SELECT COUNT(*) as total
    FROM journal_entries
    `
  )

  const cash = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(credit - debit), 0) as total
    FROM journal_entries
    `
  )

  return {
    receivables: Number(receivables[0]?.total || 0),
    payables: Number(payables[0]?.total || 0),
    cashPosition: Number(cash[0]?.total || 0),
    entries: Number(journalCount[0]?.total || 0),
  }
}
