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
    primary: {
      rail: 'bg-primary',
      icon: 'bg-primary/10 text-primary ring-1 ring-primary/15',
      chip: 'bg-primary/10 text-primary',
    },
    accent: {
      rail: 'bg-accent',
      icon: 'bg-accent/10 text-accent ring-1 ring-accent/20',
      chip: 'bg-accent/10 text-accent',
    },
    success: {
      rail: 'bg-success',
      icon: 'bg-success/10 text-success ring-1 ring-success/15',
      chip: 'bg-success/10 text-success',
    },
    warning: {
      rail: 'bg-warning',
      icon: 'bg-warning/10 text-warning ring-1 ring-warning/15',
      chip: 'bg-warning/10 text-warning',
    },
  }

  const deltaValue = Number((delta ?? 0).toFixed(1))
  const positive = deltaValue > 0
  const negative = deltaValue < 0

  return (
    <Card className='group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-[2px] hover:shadow-card'>
      <div
        className={`absolute left-0 top-0 h-full w-1 ${accentMap[accent].rail}`}
      />

      <div className='flex items-start justify-between gap-4 pl-1'>
        <div className='min-w-0'>
          <div className='text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground'>
            {label}
          </div>

          <div className='mt-3 font-display text-[30px] leading-none font-extrabold tracking-tight text-foreground font-mono-num'>
            {value}
          </div>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accentMap[accent].icon} transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className='h-5 w-5' />
        </div>
      </div>

      <div className='mt-4 flex items-center gap-2 pl-1 text-xs'>
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
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

        {hint && <span className='truncate text-muted-foreground'>{hint}</span>}
      </div>
    </Card>
  )
}
