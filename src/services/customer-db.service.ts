import { getDb } from '@/lib/db'

export type CustomerRow = {
  id: number
  name: string
  phone?: string
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

export async function findOrCreateCustomer(input: {
  name: string
  phone?: string
}) {
  const db = await getDb()

  const name = input.name.trim()
  const phone = input.phone?.trim() || ''

  if (!name || name === 'Walk-in') return null

  const rows = await db.select<any[]>(
    `
    SELECT id
    FROM customers
    WHERE
      (phone != '' AND phone = ?)
      OR lower(name) = lower(?)
    LIMIT 1
    `,
    [phone, name]
  )

  if (rows.length > 0) {
    await db.execute(
      `
      UPDATE customers
      SET name = ?, phone = ?
      WHERE id = ?
      `,
      [name, phone, rows[0].id]
    )

    return Number(rows[0].id)
  }

  await db.execute(
    `
    INSERT INTO customers (name, phone, balance)
    VALUES (?, ?, 0)
    `,
    [name, phone]
  )

  const created = await db.select<any[]>(
    `
    SELECT id
    FROM customers
    WHERE name = ?
      AND COALESCE(phone, '') = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [name, phone]
  )

  return Number(created[0]?.id)
}

export async function refreshCustomerBalance(customerId: number) {
  const db = await getDb()

  const rows = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(due_amount), 0) as balance
    FROM sales
    WHERE customer_id = ?
    `,
    [customerId]
  )

  await db.execute(
    `
    UPDATE customers
    SET balance = ?
    WHERE id = ?
    `,
    [Number(rows[0]?.balance || 0), customerId]
  )
}

export async function getAllCustomers(): Promise<CustomerRow[]> {
  const db = await getDb()

  const rows = await db.select<any[]>(
    `
    SELECT
      c.id,
      c.name,
      c.phone,
      COUNT(s.id) as visits,
      COALESCE(SUM(s.total), 0) as spent,
      COALESCE(c.balance, 0) + COALESCE(SUM(s.due_amount), 0) as outstanding,
      MAX(s.created_at) as lastAt
    FROM customers c
    LEFT JOIN sales s ON s.customer_id = c.id
    GROUP BY c.id
    ORDER BY spent DESC, c.name ASC
    `
  )

  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    phone: r.phone || '',
    spent: Number(r.spent || 0),
    visits: Number(r.visits || 0),
    outstanding: Number(r.outstanding || 0),
    loyalty: getTier(Number(r.spent || 0)),
    last: r.lastAt ? 'Recent' : 'No sales yet',
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
  customerId: number
): Promise<CustomerInvoiceRow[]> {
  const db = await getDb()

  return await db.select<CustomerInvoiceRow[]>(
    `
    SELECT
      s.id,
      c.name as customer,
      s.total as amount,
      s.due_amount as dueAmount,
      s.status,
      datetime(s.created_at, 'unixepoch', 'localtime') as time
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    WHERE s.customer_id = ?
    ORDER BY s.created_at DESC
    `,
    [customerId]
  )
}

export async function getCustomerLedger(
  customerId: number
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
    WHERE customer_id = ?
    ORDER BY created_at ASC
    `,
    [customerId]
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
  customerId: number,
  amount: number
) {
  const db = await getDb()

  const creditSales = await db.select<any[]>(
    `
    SELECT id, due_amount, paid_amount
    FROM sales
    WHERE customer_id = ?
      AND due_amount > 0
      AND status = 'Credit'
    ORDER BY created_at ASC
    `,
    [customerId]
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

  await refreshCustomerBalance(customerId)

  return amount - remaining
}

export async function createCustomer(input: {
  name: string
  phone?: string
  openingBalance?: number
}) {
  const db = await getDb()

  const name = input.name.trim()
  const phone = input.phone?.trim() || ''
  const openingBalance = Number(input.openingBalance || 0)

  if (!name) {
    throw new Error('Customer name required')
  }

  const existing = await db.select<any[]>(
    `
    SELECT id
    FROM customers
    WHERE lower(name) = lower(?)
       OR (phone != '' AND phone = ?)
    LIMIT 1
    `,
    [name, phone]
  )

  if (existing.length > 0) {
    throw new Error('Customer already exists')
  }

  await db.execute(
    `
    INSERT INTO customers (name, phone, balance)
    VALUES (?, ?, ?)
    `,
    [name, phone, openingBalance]
  )
}
