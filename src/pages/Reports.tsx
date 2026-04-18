import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  FileBarChart,
  Sparkles,
  Download,
  ArrowRight,
} from 'lucide-react'

const reports = [
  {
    cat: 'Sales',
    title: 'Daily sales summary',
    desc: 'Branch-wise sales, returns, and net revenue',
    tag: 'Live',
  },
  {
    cat: 'Sales',
    title: 'Top moving SKUs',
    desc: 'Fast & slow-moving items with velocity score',
    tag: 'AI',
  },
  {
    cat: 'Inventory',
    title: 'Stock aging report',
    desc: 'Days-on-hand by SKU, batch, and warehouse',
    tag: 'Live',
  },
  {
    cat: 'Inventory',
    title: 'Expiry risk forecast',
    desc: 'Predicted write-offs in next 30/60/90 days',
    tag: 'AI',
  },
  {
    cat: 'Finance',
    title: 'Outstanding & ageing',
    desc: 'Customer-wise receivables bucketed by days',
    tag: 'Live',
  },
  {
    cat: 'Finance',
    title: 'Margin analysis',
    desc: 'Gross margin by item, category, and branch',
    tag: 'Live',
  },
  {
    cat: 'Operations',
    title: 'Cashier productivity',
    desc: 'Bills/hour, basket size, and discount rate',
    tag: 'Live',
  },
  {
    cat: 'Operations',
    title: 'Supplier performance',
    desc: 'Lead time, fill rate, and price variance',
    tag: 'Live',
  },
  {
    cat: 'Customer',
    title: 'Repeat purchase behavior',
    desc: 'Cohort retention and frequency analysis',
    tag: 'AI',
  },
]

const groups = ['Sales', 'Inventory', 'Finance', 'Operations', 'Customer']

export default function Reports() {
  return (
    <>
      <PageHeader
        eyebrow='Insights'
        title='Reports & analytics'
        subtitle='Pre-built operational reports with AI-powered insights and natural language queries.'
        actions={
          <>
            <Button variant='outline' size='sm' className='gap-1.5'>
              <Download className='h-4 w-4' /> Schedule export
            </Button>
            <Button
              size='sm'
              className='bg-gradient-primary shadow-glow gap-1.5'
            >
              <Sparkles className='h-4 w-4' /> Ask in plain English
            </Button>
          </>
        }
      />

      <Card className='p-6 mb-6 shadow-card border-border/60 bg-gradient-warm text-primary-foreground overflow-hidden relative'>
        <div className='absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20' />
        <div className='relative max-w-2xl'>
          <div className='flex items-center gap-2 mb-2'>
            <Sparkles className='h-5 w-5' />
            <span className='text-xs uppercase tracking-widest font-bold opacity-90'>
              AI Insights
            </span>
          </div>
          <h3 className='font-display font-extrabold text-2xl mb-2'>
            "Bandra branch margin dropped 4% — likely due to extra discounts on
            Surf Excel."
          </h3>
          <p className='text-sm opacity-90 mb-4'>
            3 actions suggested. Want to see the contributing factors?
          </p>
          <Button
            variant='secondary'
            size='sm'
            className='bg-white text-primary hover:bg-white/90 gap-1.5'
          >
            Investigate <ArrowRight className='h-4 w-4' />
          </Button>
        </div>
      </Card>

      {groups.map((g) => (
        <div key={g} className='mb-6'>
          <h2 className='font-display font-bold text-lg mb-3 flex items-center gap-2'>
            <BarChart3 className='h-4 w-4 text-primary' /> {g}
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            {reports
              .filter((r) => r.cat === g)
              .map((r) => (
                <Card
                  key={r.title}
                  className='p-4 shadow-soft hover:shadow-card hover:border-primary/30 transition-smooth border-border/60 cursor-pointer group'
                >
                  <div className='flex items-start justify-between mb-2'>
                    <FileBarChart className='h-5 w-5 text-primary' />
                    <Badge
                      variant='outline'
                      className={
                        r.tag === 'AI'
                          ? 'bg-accent/15 text-accent-foreground border-accent/30'
                          : 'bg-success/10 text-success border-success/30'
                      }
                    >
                      {r.tag === 'AI' && <Sparkles className='h-3 w-3 mr-1' />}
                      {r.tag}
                    </Badge>
                  </div>
                  <div className='font-display font-bold'>{r.title}</div>
                  <div className='text-xs text-muted-foreground mt-1'>
                    {r.desc}
                  </div>
                  <div className='flex items-center gap-1 text-xs text-primary font-semibold mt-3 opacity-0 group-hover:opacity-100 transition-smooth'>
                    Open report <ArrowRight className='h-3 w-3' />
                  </div>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </>
  )
}
