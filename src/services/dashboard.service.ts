import { getDb } from '@/lib/db'

function startOfLocalDaySeconds(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function getDashboardStats() {
  const db = await getDb()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayStart = startOfLocalDaySeconds(today)
  const tomorrowStart = startOfLocalDaySeconds(addDays(today, 1))
  const yesterdayStart = startOfLocalDaySeconds(addDays(today, -1))
  const weekStart = startOfLocalDaySeconds(addDays(today, -6))

  const sales = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(total), 0) as total
    FROM sales
    WHERE created_at >= ?
      AND created_at < ?
      AND status NOT IN ('Voided', 'Returned')
    `,
    [todayStart, tomorrowStart]
  )

  const yesterdaySales = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(total), 0) as total
    FROM sales
    WHERE created_at >= ?
      AND created_at < ?
      AND status NOT IN ('Voided', 'Returned')
    `,
    [yesterdayStart, todayStart]
  )

  const purchases = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(value), 0) as total
    FROM purchases
    WHERE created_at >= ?
      AND created_at < ?
    `,
    [todayStart, tomorrowStart]
  )

  const profitRows = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(si.profit), 0) as total
    FROM sale_items si
    INNER JOIN sales s ON s.id = si.sale_id
    WHERE s.created_at >= ?
      AND s.created_at < ?
      AND s.status NOT IN ('Voided', 'Returned')
    `,
    [todayStart, tomorrowStart]
  )

  const customerDue = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(due_amount), 0) as total
    FROM sales
    WHERE status NOT IN ('Voided', 'Returned')
    `
  )

  const supplierDue = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(outstanding), 0) as total
    FROM suppliers
    `
  )

  const lowStock = await db.select<any[]>(
    `
    SELECT id, name, sku, stock, reorder_level
    FROM products
    WHERE stock <= reorder_level
    ORDER BY stock ASC
    LIMIT 5
    `
  )

  const topProducts = await db.select<any[]>(
    `
    SELECT 
      si.name,
      COALESCE(SUM(si.qty), 0) as sold
    FROM sale_items si
    INNER JOIN sales s ON s.id = si.sale_id
    WHERE s.status NOT IN ('Voided', 'Returned')
    GROUP BY si.name
    ORDER BY sold DESC
    LIMIT 5
    `
  )

  const inventory = await db.select<any[]>(
    `
    SELECT COALESCE(SUM(stock * price), 0) as total
    FROM products
    `
  )

  const weeklyRows = await db.select<any[]>(
    `
    SELECT
      strftime('%w', datetime(created_at, 'unixepoch', 'localtime')) as day_index,
      COALESCE(SUM(total), 0) as total
    FROM sales
    WHERE created_at >= ?
      AND created_at < ?
      AND status NOT IN ('Voided', 'Returned')
    GROUP BY day_index
    `,
    [weekStart, tomorrowStart]
  )

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const weeklyMap = new Map<number, number>()

  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i)
    weeklyMap.set(d.getDay(), 0)
  }

  for (const row of weeklyRows) {
    weeklyMap.set(Number(row.day_index), Number(row.total || 0))
  }

  const weeklySales = Array.from(weeklyMap.entries()).map(
    ([dayIndex, total]) => ({
      day: dayLabels[dayIndex],
      in: total,
    })
  )

  const todaySales = Number(sales[0]?.total || 0)
  const previousSales = Number(yesterdaySales[0]?.total || 0)

  const trend =
    previousSales > 0
      ? ((todaySales - previousSales) / previousSales) * 100
      : todaySales > 0
      ? 100
      : 0

  return {
    todaySales,
    todayPurchase: Number(purchases[0]?.total || 0),
    customerDue: Number(customerDue[0]?.total || 0),
    supplierDue: Number(supplierDue[0]?.total || 0),
    inventoryValue: Number(inventory[0]?.total || 0),
    todayProfit: Number(profitRows[0]?.total || 0),
    lowStock,
    topProducts,
    weeklySales,
    trend,
  }
}
