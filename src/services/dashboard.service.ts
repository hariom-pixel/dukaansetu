import { getDb } from '@/lib/db'

export async function getDashboardStats() {
  const db = await getDb()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const ts = Math.floor(todayStart.getTime() / 1000)

  // Today sales
  const sales = await db.select<any[]>(
    `SELECT COALESCE(SUM(total),0) as total FROM sales WHERE created_at >= ?`,
    [ts]
  )

  // Today purchases
  const purchases = await db.select<any[]>(
    `SELECT COALESCE(SUM(value),0) as total FROM purchases WHERE created_at >= ?`,
    [ts]
  )

  // Customer outstanding
  const customerDue = await db.select<any[]>(
    `SELECT COALESCE(SUM(due_amount),0) as total FROM sales`
  )

  // Supplier outstanding
  const supplierDue = await db.select<any[]>(
    `SELECT COALESCE(SUM(outstanding),0) as total FROM suppliers`
  )

  // Low stock (top 5)
  const lowStock = await db.select<any[]>(
    `
    SELECT name, stock, reorder_level
    FROM products
    WHERE stock <= reorder_level
    ORDER BY stock ASC
    LIMIT 5
    `
  )

  // Top products
  const topProducts = await db.select<any[]>(
    `
    SELECT name, SUM(qty) as sold
    FROM sale_items
    GROUP BY name
    ORDER BY sold DESC
    LIMIT 5
    `
  )

  return {
    todaySales: Number(sales[0]?.total || 0),
    todayPurchase: Number(purchases[0]?.total || 0),
    customerDue: Number(customerDue[0]?.total || 0),
    supplierDue: Number(supplierDue[0]?.total || 0),
    lowStock,
    topProducts,
  }
}
