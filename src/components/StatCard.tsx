import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
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
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent text-accent-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  }
  const positive = (delta ?? 0) >= 0
  return (
    <Card className='p-5 shadow-soft border border-border bg-card hover:shadow-card transition-smooth'>
      <div className='flex items-start justify-between'>
        <div className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
          {label}
        </div>
        <div
          className={`h-10 w-10 rounded-lg ${accentMap[accent]} flex items-center justify-center`}
        >
          <Icon className='h-5 w-5' />
        </div>
      </div>
      <div className='mt-3 font-display text-[28px] font-bold text-foreground font-mono-num'>
        {value}
      </div>
      <div className='mt-2 flex items-center gap-2 text-xs'>
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold ${
              positive
                ? 'bg-success/10 text-success'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {positive ? (
              <TrendingUp className='h-3 w-3' />
            ) : (
              <TrendingDown className='h-3 w-3' />
            )}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className='text-muted-foreground'>{hint}</span>}
      </div>
    </Card>
  )
}
