import { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6'>
      <div>
        {eyebrow && (
          <div className='text-[11px] uppercase tracking-widest text-primary font-semibold mb-1.5'>
            {eyebrow}
          </div>
        )}
        <h1 className='font-display text-2xl md:text-3xl font-extrabold tracking-tight text-foreground'>
          {title}
        </h1>
        {subtitle && (
          <p className='text-muted-foreground text-sm mt-1 max-w-2xl'>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className='flex items-center gap-2 flex-wrap'>{actions}</div>
      )}
    </div>
  )
}
