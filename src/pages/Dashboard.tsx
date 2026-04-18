import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  SALES_TREND,
  CHANNEL_MIX,
  BRANCHES,
  TOP_PRODUCTS,
  RECENT_INVOICES,
  LOW_STOCK,
  EXPIRING,
  APPROVALS,
  fmtINR,
} from '@/lib/mockData'

export default function Dashboard() {
  const trend =
    ((KPIS.todaySales - KPIS.yesterdaySales) / KPIS.yesterdaySales) * 100

  return (
    <>
      <PageHeader
        eyebrow='Owner cockpit · Mumbai HQ'
        title='Good morning, Anil 👋'
        subtitle="Here's how your business is performing across 5 branches today."
        actions={
          <>
            <Button variant='outline' size='sm' className='gap-1.5'>
              <Calendar className='h-4 w-4' /> Today
            </Button>
            <Button variant='outline' size='sm' className='gap-1.5'>
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
          value={fmtINR(KPIS.todaySales)}
          icon={Banknote}
          delta={+trend}
          hint='vs yesterday'
          accent='primary'
        />
        <StatCard
          label='Cash in Hand'
          value={fmtINR(KPIS.cashInHand)}
          icon={Wallet}
          delta={+8}
          hint='across drawers'
          accent='success'
        />
        <StatCard
          label='Online Orders'
          value={String(KPIS.onlineOrders)}
          icon={ShoppingBag}
          delta={+22}
          hint='last 24h'
          accent='accent'
        />
        <StatCard
          label='Outstanding'
          value={fmtINR(KPIS.outstanding)}
          icon={AlertTriangle}
          delta={-3}
          hint='receivables'
          accent='warning'
        />
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
              className='bg-success/10 text-success border-success/30'
            >
              +17.2%
            </Badge>
          </div>
          <ResponsiveContainer width='100%' height={260}>
            <AreaChart
              data={SALES_TREND}
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
                data={CHANNEL_MIX}
                dataKey='value'
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {CHANNEL_MIX.map((c) => (
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
            {CHANNEL_MIX.map((c) => (
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

      {/* Branches + Approvals */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6'>
        <Card className='lg:col-span-2 p-5 shadow-soft border-border/60'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='font-display font-bold text-lg'>
              Branch performance
            </h3>
            <Button variant='ghost' size='sm' className='text-primary gap-1'>
              View all <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
          <div className='space-y-3'>
            {BRANCHES.map((b) => (
              <div
                key={b.id}
                className='flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/60 transition-smooth'
              >
                <Avatar className='h-10 w-10'>
                  <AvatarFallback className='bg-gradient-warm text-primary-foreground text-xs font-bold'>
                    {b.id.slice(-2)}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1 min-w-0'>
                  <div className='font-semibold text-sm truncate'>{b.name}</div>
                  <div className='flex items-center gap-3 mt-1'>
                    <Progress
                      value={b.health}
                      className='h-1.5 flex-1 max-w-[200px]'
                    />
                    <span className='text-xs text-muted-foreground font-mono-num'>
                      {b.health}%
                    </span>
                  </div>
                </div>
                <div className='text-right shrink-0'>
                  <div className='font-display font-bold font-mono-num'>
                    {fmtINR(b.sales)}
                  </div>
                  <div className='text-[11px] text-warning flex items-center gap-1 justify-end'>
                    <AlertTriangle className='h-3 w-3' /> {b.alerts} alerts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className='p-5 shadow-soft border-border/60'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='font-display font-bold text-lg'>
              Pending approvals
            </h3>
            <Badge className='bg-primary/10 text-primary border-0'>
              {KPIS.pendingApprovals}
            </Badge>
          </div>
          <div className='space-y-2'>
            {APPROVALS.map((a) => (
              <div
                key={a.id}
                className='p-3 rounded-xl border border-border bg-secondary/30 hover:border-primary/40 transition-smooth'
              >
                <div className='flex items-center justify-between mb-1'>
                  <span className='font-semibold text-sm'>{a.type}</span>
                  <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                    <Clock className='h-3 w-3' /> {a.time}
                  </span>
                </div>
                <div className='text-xs text-muted-foreground mb-2'>
                  {a.by} ·{' '}
                  <span className='font-mono-num font-semibold text-foreground'>
                    {a.value}
                  </span>
                </div>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    className='h-7 text-xs flex-1 bg-gradient-primary'
                  >
                    Approve
                  </Button>
                  <Button size='sm' variant='outline' className='h-7 text-xs'>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

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
                {RECENT_INVOICES.map((inv) => (
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
                            : 'bg-accent/10 text-accent-foreground border-accent/30'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className='space-y-4'>
          <Card className='p-5 shadow-soft border-border/60'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='font-display font-bold text-base'>Low stock</h3>
              <Badge className='bg-warning/15 text-warning border-0'>
                {KPIS.lowStock}
              </Badge>
            </div>
            <div className='space-y-2'>
              {LOW_STOCK.slice(0, 4).map((p) => (
                <div
                  key={p.sku}
                  className='flex items-center justify-between text-sm'
                >
                  <div className='min-w-0'>
                    <div className='font-medium truncate'>{p.name}</div>
                    <div className='text-xs text-muted-foreground'>
                      {p.branch}
                    </div>
                  </div>
                  <div className='text-right shrink-0'>
                    <div className='font-mono-num font-bold text-destructive'>
                      {p.qty}
                    </div>
                    <div className='text-[10px] text-muted-foreground'>
                      /{p.reorder}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className='p-5 shadow-soft border-border/60'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='font-display font-bold text-base'>
                Expiring soon
              </h3>
              <Badge className='bg-destructive/15 text-destructive border-0'>
                {KPIS.expiringSoon}
              </Badge>
            </div>
            <div className='space-y-2'>
              {EXPIRING.map((p) => (
                <div
                  key={p.sku}
                  className='flex items-center justify-between text-sm'
                >
                  <div className='min-w-0'>
                    <div className='font-medium truncate'>{p.name}</div>
                    <div className='text-xs text-muted-foreground'>
                      Batch {p.batch}
                    </div>
                  </div>
                  <Badge
                    variant='outline'
                    className='bg-destructive/10 text-destructive border-destructive/30 font-mono-num'
                  >
                    {p.days}d
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

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
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
          {TOP_PRODUCTS.map((p, i) => (
            <div
              key={p.sku}
              className='p-4 rounded-xl border border-border bg-gradient-cream hover:shadow-card transition-smooth'
            >
              <div className='flex items-start gap-3'>
                <div className='h-9 w-9 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center font-display font-bold text-sm shadow-glow'>
                  {i + 1}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='font-semibold text-sm truncate'>{p.name}</div>
                  <div className='text-[11px] text-muted-foreground font-mono-num'>
                    {p.sku}
                  </div>
                  <div className='flex items-center justify-between mt-2'>
                    <span className='text-xs text-muted-foreground'>
                      {p.qty} units
                    </span>
                    <span className='font-mono-num font-bold text-sm'>
                      {fmtINR(p.revenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
