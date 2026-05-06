import { getDb } from '@/lib/db'

function getLocalDateParts(date = new Date()) {
  const year = date.getFullYear()
  const yy = String(year).slice(2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return {
    key: `${year}-${month}-${day}`,
    compact: `${yy}${month}${day}`,
  }
}

export async function getNextInvoiceNumber() {
  const db = await getDb()
  const dateParts = getLocalDateParts()

  const rows = await db.select<any[]>(
    `
    SELECT last_number
    FROM invoice_sequences
    WHERE sequence_date = ?
    LIMIT 1
    `,
    [dateParts.key]
  )

  const nextNumber = Number(rows[0]?.last_number || 0) + 1

  if (rows.length === 0) {
    await db.execute(
      `
      INSERT INTO invoice_sequences
        (sequence_date, last_number)
      VALUES (?, ?)
      `,
      [dateParts.key, nextNumber]
    )
  } else {
    await db.execute(
      `
      UPDATE invoice_sequences
      SET
        last_number = ?,
        updated_at = strftime('%s', 'now')
      WHERE sequence_date = ?
      `,
      [nextNumber, dateParts.key]
    )
  }

  return `INV-${dateParts.compact}-${String(nextNumber).padStart(4, '0')}`
}
