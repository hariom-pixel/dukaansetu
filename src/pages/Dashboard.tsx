import { useMemo, useState, useEffect} from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
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
  Clock,
  ChevronLeft,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  KPIS,
  BRANCHES,
  EXPIRING,
  APPROVALS,
  fmtINR,
  type Product,
  type Invoice,
} from '@/lib/mockData'
import { useLocalStore } from '@/hooks/useLocalStore'
import { getDashboardStats } from "@/services/dashboard.service";

export default function Dashboard() {
  const products = useLocalStore<Product>('erp.products', [])
  const invoices = useLocalStore<Invoice>('erp.invoices', [])
  const journal = useLocalStore<any>('erp.journal', [])

  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [stats, setStats] = useState<any>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  const today = useMemo(() => new Date(selectedDate), [selectedDate])

  const activeInvoices = useMemo(() => {
    return invoices.items.filter((inv: any) => inv.status !== 'Voided')
  }, [invoices.items])

  const isSameDay = (dateStr: string) => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return false

    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    )
  }

  const todaysInvoices = useMemo(() => {
    return activeInvoices.filter((inv) => {
      if (!inv.time) return false
      return isSameDay(String(inv.time))
    })
  }, [activeInvoices])

  const todaySales = useMemo(() => {
    return todaysInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
  }, [todaysInvoices])

  const outstanding = useMemo(() => {
    return activeInvoices.reduce(
      (sum, inv: any) => sum + Number(inv.dueAmount || 0),
      0
    )
  }, [activeInvoices])

  const liveRecentInvoices = useMemo(() => {
    return [...activeInvoices].sort(
  (a, b) => new Date(String(b.time)).getTime() - new Date(String(a.time)).getTime()).slice(0, 6)
  }, [activeInvoices])

  const liveLowStock = useMemo(() => {
    return [...products.items]
      .filter((p) => Number(p.stock) <= 20)
      .sort((a, b) => Number(a.stock) - Number(b.stock))
      .slice(0, 4)
      .map((p) => ({
        sku: p.sku,
        name: p.name,
        qty: p.stock,
        reorder: 20,
        branch: 'Main store',
      }))
  }, [products.items])

  const yesterdaySales = useMemo(() => {
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    return activeInvoices
      .filter((inv) => {
        if (!inv.time) return false
        const d = new Date(String(inv.time))
        if (Number.isNaN(d.getTime())) return false

        return (
          d.getDate() === yesterday.getDate() &&
          d.getMonth() === yesterday.getMonth() &&
          d.getFullYear() === yesterday.getFullYear()
        )
      })
      .reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
  }, [activeInvoices, today])

  const trend = yesterdaySales === 0 ? todaySales > 0 ? 100 : 0 : ((todaySales - yesterdaySales) / yesterdaySales) * 100

  const cashInHand = useMemo(() => {
    return journal.items.reduce((sum, entry: any) => {
      const desc = String(entry.desc || "").toLowerCase()
      const type = String(entry.type || "").toUpperCase()

      const credit = Number(entry.credit || 0)
      const debit = Number(entry.debit || 0)

      const isCashIn =
        desc.includes("sale") ||
        desc.includes("invoice payment") ||
        type === "SALE" ||
        type === "PAYMENT"

      const isCashOut =
        desc.includes("refund") ||
        desc.includes("payment to") ||
        desc.includes("void invoice") ||
        type === "REFUND" ||
        type === "SUPPLIER_PAYMENT"

      if (isCashIn) return sum + credit
      if (isCashOut) return sum - debit - credit

      return sum
    }, 0)
  }, [journal.items])

  const onlineOrders = useMemo(() => {
    return activeInvoices.filter((inv) => String(inv.channel).toLowerCase() === 'online').length
  }, [activeInvoices])

  const weeklySalesTrend = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const result = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (6 - idx))

      const total = activeInvoices
        .filter((inv) => {
          if (!inv.time) return false
          const t = new Date(String(inv.time))
          if (Number.isNaN(t.getTime())) return false

          return (
            t.getDate() === d.getDate() &&
            t.getMonth() === d.getMonth() &&
            t.getFullYear() === d.getFullYear()
          )
        })
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0)

      return {
        day: days[d.getDay()],
        in: total,
        ret: 0,
      }
    })

    return result
  }, [activeInvoices, today])

  const channelMix = useMemo(() => {
    const buckets = [
      { name: 'POS', value: 0, color: '#f55d0a' },
      { name: 'Online', value: 0, color: '#f4b400' },
      { name: 'B2B', value: 0, color: '#12a36d' },
    ]

    activeInvoices.forEach((inv) => {
      const amount = Number(inv.amount || 0)
      const channel = String(inv.channel || '').toLowerCase()

      if (channel === 'pos') buckets[0].value += amount
      else if (channel === 'online') buckets[1].value += amount
      else if (channel === 'b2b') buckets[2].value += amount
    })

    const total = buckets.reduce((sum, b) => sum + b.value, 0)

    return buckets.map((b) => ({
      ...b,
      value: total ? Math.round((b.value / total) * 100) : 0,
    }))
  }, [activeInvoices])

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>()

    activeInvoices.forEach((inv: any) => {
      ;(inv.items || []).forEach((item: any) => {
        const prev = map.get(item.sku)

        if (prev) {
          prev.qty += Number(item.qty || 0)
          prev.revenue += Number(item.qty || 0) * Number(item.price || 0)
        } else {
          map.set(item.sku, {
            name: item.name,
            qty: Number(item.qty || 0),
            revenue: Number(item.qty || 0) * Number(item.price || 0),
          })
        }
      })
    })

    return Array.from(map.entries())
      .map(([sku, v]) => ({
        sku,
        name: v.name,
        qty: v.qty,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6)
  }, [activeInvoices])

  const paidInvoicesCount = useMemo(() => {
    return activeInvoices.filter((inv) => inv.status === 'Paid').length
  }, [activeInvoices])

  const creditInvoicesCount = useMemo(() => {
    return activeInvoices.filter((inv) => inv.status === 'Credit').length
  }, [activeInvoices])

  const lowStockCount = useMemo(() => {
    return products.items.filter((p) => Number(p.stock) <= 20).length
  }, [products.items])

  const cashTrend =
    cashInHand > 0 ? 8 : 0

  const onlineTrend =
    onlineOrders > 0 ? 22 : 0

  const outstandingTrend =
    outstanding > 0 ? -3 : 0

  const salesHint =
    yesterdaySales === 0
      ? 'first activity vs yesterday'
      : `vs ${fmtINR(yesterdaySales)} yesterday`

  const cashHint = `${paidInvoicesCount} paid invoices`
  const onlineHint = `${onlineOrders} online invoices`
  const outstandingHint = `${creditInvoicesCount} credit invoices`

  const exportDashboard = () => {
    const rows = [
      ['Metric', 'Value'],
      ["Today's Sales", todaySales],
      ['Cash in Hand', cashInHand],
      ['Online Orders', onlineOrders],
      ['Outstanding', outstanding],
      ['Paid Invoices', paidInvoicesCount],
      ['Credit Invoices', creditInvoicesCount],
      ['Low Stock Items', lowStockCount],
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

    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

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

  const selectedDateLabel = today.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow='Owner cockpit · Mumbai HQ'
        title='Good morning, Hariom 👋'
        subtitle="Here's how your business is performing across 5 branches today."
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
                          new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
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
                          new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
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

                  <div className='grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border'>
                    <Button
                      size='sm'
                      variant='outline'
                      className='text-xs'
                      onClick={() => {
                        const d = new Date()
                        setSelectedDate(toDateInputValue(d))
                        setCalendarMonth(d)
                        setDatePickerOpen(false)
                      }}
                    >
                      Today
                    </Button>

                    <Button
                      size='sm'
                      variant='outline'
                      className='text-xs'
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() - 1)
                        setSelectedDate(toDateInputValue(d))
                        setCalendarMonth(d)
                        setDatePickerOpen(false)
                      }}
                    >
                      Yesterday
                    </Button>

                    <Button
                      size='sm'
                      variant='outline'
                      className='text-xs'
                      onClick={() => setDatePickerOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <Button variant='outline' size='sm' className='gap-1.5' onClick={exportDashboard}>
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

      {/* KPI grid */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        <StatCard
          label="Today's Sales"
          value={fmtINR(stats?.todaySales || 0)}
          icon={Banknote}
          delta={Number(trend.toFixed(1))}
          hint={salesHint}
          accent='primary'
        />

        <StatCard
          label='Today Purchase'
          value={fmtINR(stats?.todayPurchase || 0)}
          icon={Wallet}
          delta={cashTrend}
          hint={cashHint}
          accent='success'
        />

        <StatCard
          label='Customer Due'
          value={fmtINR(stats?.customerDue || 0)}
          icon={ShoppingBag}
          delta={onlineTrend}
          hint={onlineHint}
          accent='accent'
        />

        <StatCard
          label='Supplier Payable'
          value={fmtINR(stats?.supplierDue || 0)}
          icon={AlertTriangle}
          delta={outstandingTrend}
          hint={outstandingHint}
          accent='warning'
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="relative overflow-hidden p-5 border border-border/70 shadow-soft rounded-2xl bg-gradient-to-br from-card to-secondary/30">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Today Profit</div>
          <div className="mt-2 text-3xl font-display font-extrabold">
            {fmtINR((stats?.todaySales || 0) - (stats?.todayPurchase || 0))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Sales minus purchases for today
          </div>
        </Card>

        <Card className="relative overflow-hidden p-5 border border-border/70 shadow-soft rounded-2xl bg-gradient-to-br from-card to-primary/5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Net Credit Position</div>
          <div className="mt-2 text-3xl font-display font-extrabold">
            {fmtINR((stats?.customerDue || 0) - (stats?.supplierDue || 0))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Customer dues minus supplier payables
          </div>
        </Card>

        <Card className="relative overflow-hidden p-5 border border-border/70 shadow-soft rounded-2xl bg-gradient-to-br from-card to-success/5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Inventory Value</div>
          <div className="mt-2 text-3xl font-display font-extrabold">
            {fmtINR(
              products.items.reduce(
                (sum, p) => sum + Number(p.stock || 0) * Number(p.price || 0),
                0
              )
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Current stock value at selling price
          </div>
        </Card>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-3 mb-6'>
        <Card className='p-4 border border-border/60 shadow-soft'>
          <div className='text-xs uppercase tracking-wide text-muted-foreground mb-1'>
            Billing health
          </div>
          <div className='text-sm font-medium'>
            {paidInvoicesCount} paid · {creditInvoicesCount} credit
          </div>
          <div className='text-xs text-muted-foreground mt-1'>
            Sales mix for active invoices
          </div>
        </Card>

        <Card className='p-4 border border-border/60 shadow-soft'>
          <div className='text-xs uppercase tracking-wide text-muted-foreground mb-1'>
            Inventory alert
          </div>
          <div className='text-sm font-medium'>
            {lowStockCount} low-stock items
          </div>
          <div className='text-xs text-muted-foreground mt-1'>
            Reorder attention needed
          </div>
        </Card>

        <Card className='p-4 border border-border/60 shadow-soft'>
          <div className='text-xs uppercase tracking-wide text-muted-foreground mb-1'>
            Receivables health
          </div>
          <div className='text-sm font-medium'>
            {fmtINR(outstanding)} pending
          </div>
          <div className='text-xs text-muted-foreground mt-1'>
            Collected through invoice dues
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6'>
        <Card className='lg:col-span-2 p-5 shadow-soft border-border/60'>
          <div className='flex items-start justify-between mb-4'>
            <div>
              <h3 className='font-display font-bold text-lg'>
                Weekly sales trend
              </h3>
              <p className='text-xs text-muted-foreground'>
                Net sales vs returns · last 7 days
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
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </Badge>
          </div>
          <ResponsiveContainer width='100%' height={260}>
            <AreaChart
              data={weeklySalesTrend}
              margin={{ left: -20, right: 8, top: 8 }}
            >
              <defs>
                <linearGradient id='g1' x1='0' y1='0' x2='0' y2='1'>
                  <stop
                    offset='0%'
                    stopColor='hsl(16 78% 52%)'
                    stopOpacity={0.4}
                  />
                  <stop
                    offset='100%'
                    stopColor='hsl(16 78% 52%)'
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id='g2' x1='0' y1='0' x2='0' y2='1'>
                  <stop
                    offset='0%'
                    stopColor='hsl(38 88% 56%)'
                    stopOpacity={0.3}
                  />
                  <stop
                    offset='100%'
                    stopColor='hsl(38 88% 56%)'
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
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area
                type='monotone'
                dataKey='in'
                name='Sales'
                stroke='hsl(16 78% 52%)'
                strokeWidth={2.5}
                fill='url(#g1)'
              />
              <Area
                type='monotone'
                dataKey='ret'
                name='Returns'
                stroke='hsl(38 88% 56%)'
                strokeWidth={2}
                fill='url(#g2)'
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className='p-5 shadow-soft border-border/60'>
          <h3 className='font-display font-bold text-lg mb-1'>Channel mix</h3>
          <p className='text-xs text-muted-foreground mb-2'>
            Where revenue comes from
          </p>
          <ResponsiveContainer width='100%' height={220}>
            <PieChart>
              <Pie
                data={channelMix}
                dataKey='value'
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {channelMix.map((c) => (
                  <Cell key={c.name} fill={c.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className='space-y-1.5 mt-2'>
            {channelMix.map((c) => (
              <div
                key={c.name}
                className='flex items-center justify-between text-xs'
              >
                <div className='flex items-center gap-2'>
                  <span
                    className='h-2.5 w-2.5 rounded-sm'
                    style={{ background: c.color }}
                  />
                  <span className='text-muted-foreground'>{c.name}</span>
                </div>
                <span className='font-mono-num font-semibold'>{c.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 mb-6 border border-border/70 shadow-soft rounded-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-display font-bold text-lg">Cash Flow Snapshot</h3>
            <p className="text-xs text-muted-foreground">Quick view of money movement today</p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Today
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Cash In</div>
            <div className="mt-2 text-2xl font-bold text-success">
              {fmtINR(stats?.todaySales || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">From sales</div>
          </div>

          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Cash Out</div>
            <div className="mt-2 text-2xl font-bold text-destructive">
              {fmtINR(stats?.todayPurchase || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Purchases / stock-in</div>
          </div>

          <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Net Cash</div>
            <div className="mt-2 text-2xl font-bold">
              {fmtINR((stats?.todaySales || 0) - (stats?.todayPurchase || 0))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">In minus out</div>
          </div>
        </div>
      </Card>

      {/* Bottom row */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        <Card className='lg:col-span-2 p-5 shadow-soft border-border/60'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='font-display font-bold text-lg'>Recent invoices</h3>
            <Button variant='ghost' size='sm' className='text-primary gap-1'>
              All invoices <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
          <div className='overflow-x-auto -mx-2'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-xs text-muted-foreground uppercase tracking-wider'>
                  <th className='text-left font-medium px-2 py-2'>Invoice</th>
                  <th className='text-left font-medium px-2 py-2'>Customer</th>
                  <th className='text-left font-medium px-2 py-2 hidden md:table-cell'>
                    Channel
                  </th>
                  <th className='text-right font-medium px-2 py-2'>Amount</th>
                  <th className='text-left font-medium px-2 py-2'>Status</th>
                </tr>
              </thead>
              <tbody>
                {liveRecentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='px-2 py-8 text-center text-sm text-muted-foreground'>
                      No invoices yet. Start billing from POS.
                    </td>
                  </tr>
                ) : (
                  liveRecentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className='border-t border-border/60 hover:bg-secondary/40'
                    >
                      <td className='px-2 py-3 font-mono-num font-semibold text-primary'>
                        {inv.id}
                      </td>
                      <td className='px-2 py-3'>{inv.customer}</td>
                      <td className='px-2 py-3 hidden md:table-cell text-muted-foreground'>
                        {inv.channel}
                      </td>
                      <td className='px-2 py-3 text-right font-mono-num font-semibold'>
                        {fmtINR(inv.amount)}
                      </td>
                      <td className='px-2 py-3'>
                        <Badge
                          variant='outline'
                          className={
                            inv.status === 'Paid'
                              ? 'bg-success/10 text-success border-success/30'
                              : inv.status === 'Pending'
                              ? 'bg-warning/10 text-warning border-warning/30'
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

        <div className='space-y-4'>
          <Card className='p-5 shadow-soft border-border/60'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='font-display font-bold text-base'>Low stock</h3>
              <Badge className='bg-warning/15 text-warning border-0'>
                {stats?.lowStock?.length}
              </Badge>
            </div>
            <div className='space-y-2'>
              {stats?.lowStock?.length === 0 ? (
                <div className='text-sm text-muted-foreground'>
                  No low-stock items right now.
                </div>
              ) : (
                stats?.lowStock?.map((p) => (
                  <div
                    key={p.sku}
                    className='flex items-center justify-between text-sm'
                  >
                    <div className='min-w-0'>
                      <div className='font-medium truncate'>{p.name}</div>
                      <div className='text-xs text-muted-foreground'>
                        Reorder at {p.reorder_level}
                      </div>
                    </div>
                    <div className='text-right shrink-0'>
                      <div className='font-mono-num font-bold text-destructive'>
                        {p.stock}
                      </div>
                      <div className='text-[10px] text-muted-foreground'>
                        /{p.reorder_level}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5 shadow-soft border border-border/70 rounded-2xl mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-lg">Owner Alerts</h3>
            <p className="text-xs text-muted-foreground">Important things to check today</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/70 p-4 bg-secondary/25">
            <div className="text-sm font-semibold">Customer dues</div>
            <div className="mt-1 text-xl font-bold">{fmtINR(stats?.customerDue || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">Follow up pending payments</div>
          </div>

          <div className="rounded-xl border border-border/70 p-4 bg-secondary/25">
            <div className="text-sm font-semibold">Supplier payables</div>
            <div className="mt-1 text-xl font-bold">{fmtINR(stats?.supplierDue || 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">Payments due to suppliers</div>
          </div>

          <div className="rounded-xl border border-border/70 p-4 bg-secondary/25">
            <div className="text-sm font-semibold">Low stock</div>
            <div className="mt-1 text-xl font-bold">{stats?.lowStock?.length || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Items need reorder attention</div>
          </div>
        </div>
      </Card>

      {/* Top products */}
      <Card className='p-5 shadow-soft border-border/60 mt-4'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <h3 className='font-display font-bold text-lg'>
              Top moving products
            </h3>
            <p className='text-xs text-muted-foreground'>
              By units sold this week
            </p>
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
