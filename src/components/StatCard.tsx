import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  accent = 'primary',
}: {
  label: string
  value: string
  icon: LucideIcon
  delta?: number
  hint?: string
  accent?: 'primary' | 'accent' | 'success' | 'warning'
}) {
  const accentMap = {
    primary: 'bg-primary/10 text-primary ring-1 ring-primary/10',
    accent: 'bg-accent/15 text-accent-foreground ring-1 ring-accent/20',
    success: 'bg-success/10 text-success ring-1 ring-success/10',
    warning: 'bg-warning/10 text-warning ring-1 ring-warning/10',
  }

  const deltaValue = Number((delta ?? 0).toFixed(1))
  const positive = deltaValue > 0
  const negative = deltaValue < 0
  const neutral = deltaValue === 0

  return (
    <Card className='group p-5 border border-border/70 bg-card shadow-soft hover:shadow-card hover:-translate-y-[1px] transition-all duration-200'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
            {label}
          </div>
        </div>

        <div
          className={`h-10 w-10 shrink-0 rounded-xl ${accentMap[accent]} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className='h-5 w-5' />
        </div>
      </div>

      <div className='mt-3 font-display text-[30px] leading-none font-bold text-foreground font-mono-num tracking-tight'>
        {value}
      </div>

      <div className='mt-3 flex items-center gap-2 flex-wrap text-xs'>
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${
              positive
                ? 'bg-success/10 text-success'
                : negative
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {positive ? (
              <TrendingUp className='h-3.5 w-3.5' />
            ) : negative ? (
              <TrendingDown className='h-3.5 w-3.5' />
            ) : (
              <Minus className='h-3.5 w-3.5' />
            )}
            {Math.abs(deltaValue)}%
          </span>
        )}

        {hint && <span className='text-muted-foreground'>{hint}</span>}
      </div>
    </Card>
  )
}
