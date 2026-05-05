import { useMemo, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Banknote,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  ChevronRight,
  Download,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ChevronLeft,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { fmtINR } from '@/lib/mockData'
import { getDashboardStats } from '@/services/dashboard.service'
import { getAllSales } from '@/services/sales-db.service'

export default function Dashboard() {
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [stats, setStats] = useState<any>(null)
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const today = useMemo(() => new Date(selectedDate), [selectedDate])

  const weeklySalesTrend = stats?.weeklySales || [
    { day: 'Sun', in: 0 },
    { day: 'Mon', in: 0 },
    { day: 'Tue', in: 0 },
    { day: 'Wed', in: 0 },
    { day: 'Thu', in: 0 },
    { day: 'Fri', in: 0 },
    { day: 'Sat', in: 0 },
  ]

  const inventoryValue = Number(stats?.inventoryValue || 0)
  const trend = Number(stats?.trend || 0)

  const selectedDateLabel = today.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const monthLabel = calendarMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const days: Array<Date | null> = []

    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }

    return days
  }, [calendarMonth])

  const toDateInputValue = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  async function loadDashboard() {
    const [dashboardStats, salesRows] = await Promise.all([
      getDashboardStats(),
      getAllSales(),
    ])

    setStats(dashboardStats)
    setRecentInvoices(salesRows.slice(0, 6))
  }

  const exportDashboard = () => {
    const rows = [
      ['Metric', 'Value'],
      ["Today's Sales", stats?.todaySales || 0],
      ["Today's Purchase", stats?.todayPurchase || 0],
      ['Today Profit', (stats?.todaySales || 0) - (stats?.todayPurchase || 0)],
      ['Inventory Value', inventoryValue],
      ['Low Stock Items', stats?.lowStock?.length || 0],
      ['Customer Due', stats?.customerDue || 0],
      ['Supplier Payable', stats?.supplierDue || 0],
    ]

    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()

    URL.revokeObjectURL(url)
    toast.success('Dashboard exported')
  }

  useEffect(() => {
    loadDashboard().catch(console.error)

    const reloadDashboard = () => {
      loadDashboard().catch(console.error)
    }

    window.addEventListener('focus', reloadDashboard)
    window.addEventListener('visibilitychange', reloadDashboard)

    return () => {
      window.removeEventListener('focus', reloadDashboard)
      window.removeEventListener('visibilitychange', reloadDashboard)
    }
  }, [])

  return (
    <>
      <PageHeader
        eyebrow='Owner cockpit'
        title='Welcome Back 👋'
        subtitle='Live view of sales, stock, cash flow, and owner actions.'
        actions={
          <>
            <div className='relative'>
              <Button
                variant='outline'
                size='sm'
                className='gap-1.5 bg-card shadow-soft'
                onClick={() => setDatePickerOpen((v) => !v)}
              >
                <Calendar className='h-4 w-4' />
                {selectedDateLabel}
              </Button>

              {datePickerOpen && (
                <div className='absolute right-0 top-11 z-50 w-[320px] rounded-2xl border border-border bg-card p-4 shadow-elevated'>
                  <div className='flex items-center justify-between mb-3'>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-8 w-8 rounded-full'
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() - 1,
                            1
                          )
                        )
                      }
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </Button>

                    <div className='font-display font-semibold text-sm'>
                      {monthLabel}
                    </div>

                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-8 w-8 rounded-full'
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() + 1,
                            1
                          )
                        )
                      }
                    >
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                  </div>

                  <div className='grid grid-cols-7 gap-1 mb-2 text-center text-[11px] text-muted-foreground font-medium'>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>

                  <div className='grid grid-cols-7 gap-1'>
                    {calendarDays.map((day, idx) => {
                      if (!day) return <div key={idx} className='h-9' />

                      const value = toDateInputValue(day)
                      const isSelected = value === selectedDate
                      const isToday = value === toDateInputValue(new Date())

                      return (
                        <button
                          key={value}
                          className={`h-9 rounded-lg text-sm transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-glow'
                              : isToday
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'hover:bg-secondary text-foreground'
                          }`}
                          onClick={() => {
                            setSelectedDate(value)
                            setDatePickerOpen(false)
                          }}
                        >
                          {day.getDate()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <Button
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={exportDashboard}
            >
              <Download className='h-4 w-4' /> Export
            </Button>

            <Button
              size='sm'
              className='bg-gradient-primary shadow-glow gap-1.5'
            >
              <Sparkles className='h-4 w-4' /> Ask AI
            </Button>
          </>
        }
      />

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        <StatCard
          label="Today's Sales"
          value={fmtINR(stats?.todaySales || 0)}
          icon={Banknote}
          delta={Number(trend.toFixed(1))}
          hint='sales today'
          accent='primary'
        />

        <StatCard
          label='Today Profit'
          value={fmtINR((stats?.todaySales || 0) - (stats?.todayPurchase || 0))}
          icon={Wallet}
          delta={0}
          hint='sales minus stock-in'
          accent='success'
        />

        <StatCard
          label='Inventory Value'
          value={fmtINR(inventoryValue)}
          icon={ShoppingBag}
          delta={0}
          hint='current stock value'
          accent='accent'
        />

        <StatCard
          label='Low Stock'
          value={String(stats?.lowStock?.length || 0)}
          icon={AlertTriangle}
          delta={0}
          hint='items need reorder'
          accent='warning'
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6'>
        <Card className='lg:col-span-2 p-5 shadow-soft border-border/60 rounded-2xl'>
          <div className='flex items-start justify-between mb-4'>
            <div>
              <h3 className='font-display font-bold text-lg'>
                Weekly sales trend
              </h3>
              <p className='text-xs text-muted-foreground'>
                Net sales for the last 7 days
              </p>
            </div>

            <Badge
              variant='outline'
              className={
                trend > 0
                  ? 'bg-success/10 text-success border-success/30'
                  : trend < 0
                  ? 'bg-destructive/10 text-destructive border-destructive/30'
                  : 'bg-muted text-muted-foreground border-border'
              }
            >
              {trend > 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </Badge>
          </div>

          <div className='flex items-center gap-4 text-xs text-muted-foreground mb-3'>
            <div className='flex items-center gap-1'>
              <span className='h-2.5 w-2.5 rounded-full bg-primary' />
              Sales
            </div>
          </div>

          <ResponsiveContainer width='100%' height={280}>
            <AreaChart
              data={weeklySalesTrend}
              margin={{ left: -20, right: 8, top: 8 }}
            >
              <defs>
                <linearGradient id='g1' x1='0' y1='0' x2='0' y2='1'>
                  <stop
                    offset='0%'
                    stopColor='hsl(var(--primary))'
                    stopOpacity={0.4}
                  />
                  <stop
                    offset='100%'
                    stopColor='hsl(var(--primary))'
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke='hsl(var(--border))'
                strokeDasharray='3 3'
                vertical={false}
              />

              <XAxis
                dataKey='day'
                stroke='hsl(var(--muted-foreground))'
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke='hsl(var(--muted-foreground))'
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Number(v) / 1000}k`}
              />

              <Area
                type='monotone'
                dataKey='in'
                name='Sales'
                stroke='hsl(var(--primary))'
                strokeWidth={2.5}
                fill='url(#g1)'
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className='p-5 shadow-soft border-border/60 rounded-2xl'>
          <div className='mb-4'>
            <h3 className='font-display font-bold text-lg'>Cash Flow</h3>
            <p className='text-xs text-muted-foreground'>
              Money movement today
            </p>
          </div>

          <div className='space-y-3'>
            <div className='rounded-xl border border-border/70 bg-secondary/30 p-4'>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                Cash In
              </div>
              <div className='mt-1 text-2xl font-bold text-success'>
                {fmtINR(stats?.todaySales || 0)}
              </div>
              <div className='text-xs text-muted-foreground'>From sales</div>
            </div>

            <div className='rounded-xl border border-border/70 bg-secondary/30 p-4'>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                Cash Out
              </div>
              <div className='mt-1 text-2xl font-bold text-destructive'>
                {fmtINR(stats?.todayPurchase || 0)}
              </div>
              <div className='text-xs text-muted-foreground'>
                Purchases / stock-in
              </div>
            </div>

            <div className='rounded-xl border border-border/70 bg-secondary/30 p-4'>
              <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                Net Cash
              </div>
              <div className='mt-1 text-2xl font-bold'>
                {fmtINR((stats?.todaySales || 0) - (stats?.todayPurchase || 0))}
              </div>
              <div className='text-xs text-muted-foreground'>In minus out</div>
            </div>
          </div>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6'>
        <Card className='lg:col-span-2 p-5 shadow-soft border-border/60 rounded-2xl'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h3 className='font-display font-bold text-lg'>
                Recent invoices
              </h3>
              <p className='text-xs text-muted-foreground'>
                Latest bills from POS
              </p>
            </div>

            <Button
              variant='ghost'
              size='sm'
              className='text-primary gap-1'
              onClick={() => {
                window.location.href = '/sales'
              }}
            >
              All invoices <ChevronRight className='h-4 w-4' />
            </Button>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-xs text-muted-foreground uppercase tracking-wider'>
                  <th className='text-left font-medium px-2 py-2'>Invoice</th>
                  <th className='text-left font-medium px-2 py-2'>Customer</th>
                  <th className='text-left font-medium px-2 py-2'>Channel</th>
                  <th className='text-right font-medium px-2 py-2'>Amount</th>
                  <th className='text-left font-medium px-2 py-2'>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className='px-2 py-8 text-center text-sm text-muted-foreground'
                    >
                      No invoices yet. Start billing from POS.
                    </td>
                  </tr>
                ) : (
                  recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className='border-t border-border/60 hover:bg-secondary/40'
                    >
                      <td className='px-2 py-3 font-mono-num font-semibold text-primary'>
                        {inv.id}
                      </td>
                      <td className='px-2 py-3'>
                        {inv.customer || inv.customer_name || 'Walk-in'}
                      </td>
                      <td className='px-2 py-3 text-muted-foreground'>
                        {inv.channel || 'POS'}
                      </td>
                      <td className='px-2 py-3 text-right font-mono-num font-semibold'>
                        {fmtINR(inv.amount || inv.total || 0)}
                      </td>
                      <td className='px-2 py-3'>
                        <Badge
                          variant='outline'
                          className={
                            inv.status === 'Paid'
                              ? 'bg-success/10 text-success border-success/30'
                              : inv.status === 'Voided'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-accent/10 text-accent-foreground border-accent/30'
                          }
                        >
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className='p-5 shadow-soft border-border/60 rounded-2xl'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h3 className='font-display font-bold text-lg'>Reorder Needed</h3>
              <p className='text-xs text-muted-foreground'>
                Low-stock products
              </p>
            </div>

            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                window.location.href = '/purchase'
              }}
            >
              Create PO
            </Button>
          </div>

          <div className='space-y-3'>
            {(stats?.lowStock?.length || 0) === 0 ? (
              <div className='text-sm text-muted-foreground'>
                No low-stock items right now.
              </div>
            ) : (
              stats.lowStock.map((p: any) => (
                <div
                  key={p.name}
                  className='flex items-center justify-between rounded-xl border border-border/70 bg-secondary/30 p-3'
                >
                  <div>
                    <div className='font-semibold text-sm'>{p.name}</div>
                    <div className='text-xs text-muted-foreground'>
                      Stock {p.stock} · Reorder at {p.reorder_level}
                    </div>
                  </div>

                  <Button
                    size='sm'
                    variant='ghost'
                    className='text-primary'
                    onClick={() => {
                      window.location.href = '/purchase'
                    }}
                  >
                    Buy
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className='p-5 shadow-soft border-border/60 rounded-2xl'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h3 className='font-display font-bold text-lg'>
              Top moving products
            </h3>
            <p className='text-xs text-muted-foreground'>By units sold</p>
          </div>

          <Button variant='ghost' size='sm' className='text-primary gap-1'>
            Full report <ArrowUpRight className='h-4 w-4' />
          </Button>
        </div>

        {(stats?.topProducts?.length || 0) === 0 ? (
          <div className='text-sm text-muted-foreground'>
            No product movement yet.
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            {stats?.topProducts?.map((p: any, i: number) => (
              <div
                key={p.name}
                className='p-4 rounded-xl border border-border bg-gradient-cream hover:shadow-card transition-smooth'
              >
                <div className='flex items-start gap-3'>
                  <div className='h-9 w-9 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center font-display font-bold text-sm shadow-glow'>
                    {i + 1}
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='font-semibold text-sm truncate'>
                      {p.name}
                    </div>
                    <div className='text-[11px] text-muted-foreground'>
                      Sold: {p.sold}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
