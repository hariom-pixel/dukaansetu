import { getDb } from '@/lib/db'

export type CustomerRow = {
  id: string
  name: string
  spent: number
  visits: number
  outstanding: number
  loyalty: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  last: string
}

function getTier(spent: number): CustomerRow['loyalty'] {
  if (spent >= 50000) return 'Platinum'
  if (spent >= 20000) return 'Gold'
  if (spent >= 5000) return 'Silver'
  return 'Bronze'
}

export async function getAllCustomers(): Promise<CustomerRow[]> {
  const db = await getDb()

  const rows = await db.select<any[]>(
    `
    SELECT
      customer_name as name,
      COUNT(*) as visits,
      COALESCE(SUM(total),0) as spent,
      COALESCE(SUM(due_amount),0) as outstanding,
      MAX(created_at) as lastAt
    FROM sales
    WHERE customer_name IS NOT NULL
      AND customer_name != ''
      AND customer_name != 'Walk-in'
    GROUP BY customer_name
    ORDER BY spent DESC
    `
  )

  return rows.map((r, i) => ({
    id: `CUST-${i + 1}`,
    name: r.name,
    spent: Number(r.spent || 0),
    visits: Number(r.visits || 0),
    outstanding: Number(r.outstanding || 0),
    loyalty: getTier(Number(r.spent || 0)),
    last: 'Recent',
  }))
}

export type CustomerInvoiceRow = {
  id: string
  customer: string
  amount: number
  dueAmount: number
  status: string
  time: string
}

export type CustomerLedgerRow = {
  date: string
  type: string
  ref: string
  debit: number
  credit: number
  balance: number
}

export async function getCustomerInvoices(
  customerName: string
): Promise<CustomerInvoiceRow[]> {
  const db = await getDb()

  return await db.select<CustomerInvoiceRow[]>(
    `
    SELECT
      id,
      customer_name as customer,
      total as amount,
      due_amount as dueAmount,
      status,
      datetime(created_at, 'unixepoch', 'localtime') as time
    FROM sales
    WHERE customer_name = ?
    ORDER BY created_at DESC
    `,
    [customerName]
  )
}

export async function getCustomerLedger(
  customerName: string
): Promise<CustomerLedgerRow[]> {
  const db = await getDb()

  const rows = await db.select<any[]>(
    `
    SELECT
      id,
      total,
      paid_amount,
      due_amount,
      status,
      datetime(created_at, 'unixepoch', 'localtime') as time
    FROM sales
    WHERE customer_name = ?
    ORDER BY created_at ASC
    `,
    [customerName]
  )

  let balance = 0

  return rows.map((r) => {
    const debit = Number(r.total || 0)
    const credit = Number(r.paid_amount || 0)
    balance += debit - credit

    return {
      date: r.time,
      type: 'Invoice',
      ref: r.id,
      debit,
      credit,
      balance,
    }
  })
}

export async function collectCustomerPayment(
  customerName: string,
  amount: number
) {
  const db = await getDb()

  const creditSales = await db.select<any[]>(
    `
    SELECT id, due_amount, paid_amount
    FROM sales
    WHERE customer_name = ?
      AND due_amount > 0
      AND status = 'Credit'
    ORDER BY created_at ASC
    `,
    [customerName]
  )

  let remaining = amount

  for (const sale of creditSales) {
    if (remaining <= 0) break

    const due = Number(sale.due_amount || 0)
    const paid = Number(sale.paid_amount || 0)
    const applied = Math.min(remaining, due)
    const nextDue = due - applied
    const nextPaid = paid + applied

    await db.execute(
      `
      UPDATE sales
      SET
        due_amount = ?,
        paid_amount = ?,
        status = ?
      WHERE id = ?
      `,
      [nextDue, nextPaid, nextDue <= 0 ? 'Paid' : 'Credit', sale.id]
    )

    remaining -= applied
  }

  return amount - remaining
}
