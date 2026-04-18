import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocalStore } from '@/hooks/useLocalStore'
import { toast } from 'sonner'

interface Integration {
  id: string
  name: string
  desc: string
  connected: boolean
  cat: string
}

const seed: Integration[] = [
  {
    id: 'razorpay',
    name: 'Razorpay',
    desc: 'UPI, cards, wallets · Settlement T+1',
    connected: true,
    cat: 'Payments',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    desc: 'QR-based UPI for POS',
    connected: true,
    cat: 'Payments',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    desc: 'International cards',
    connected: false,
    cat: 'Payments',
  },
  {
    id: 'tally',
    name: 'Tally Prime',
    desc: 'Two-way ledger sync',
    connected: true,
    cat: 'Accounting',
  },
  {
    id: 'cleartax',
    name: 'ClearTax GST',
    desc: 'Auto-file GSTR-1 & GSTR-3B',
    connected: true,
    cat: 'Accounting',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    desc: 'Sync products, orders & stock',
    connected: false,
    cat: 'Commerce',
  },
  {
    id: 'woo',
    name: 'WooCommerce',
    desc: 'WordPress storefront sync',
    connected: false,
    cat: 'Commerce',
  },
  {
    id: 'shiprocket',
    name: 'Shiprocket',
    desc: 'Multi-courier dispatch',
    connected: true,
    cat: 'Logistics',
  },
  {
    id: 'twilio',
    name: 'Twilio WhatsApp',
    desc: 'Order updates & reminders',
    connected: true,
    cat: 'Messaging',
  },
  {
    id: 'msg91',
    name: 'MSG91',
    desc: 'Transactional SMS',
    connected: false,
    cat: 'Messaging',
  },
  {
    id: 'zebra',
    name: 'Zebra Printer',
    desc: 'Barcode & invoice printing',
    connected: true,
    cat: 'Hardware',
  },
  {
    id: 'honeywell',
    name: 'Honeywell Scanner',
    desc: 'USB & Bluetooth scanners',
    connected: true,
    cat: 'Hardware',
  },
]

export default function Integrations() {
  const { items, update } = useLocalStore<Integration>('erp.integrations', seed)

  const toggle = (i: Integration) => {
    update(i.id, { connected: !i.connected })
    toast.success(`${i.name} ${!i.connected ? 'connected' : 'disconnected'}`)
  }

  return (
    <>
      <PageHeader
        eyebrow='Connected apps'
        title='Integrations'
        subtitle='Open APIs and webhooks connect your ERP to payments, accounting, commerce, and more.'
      />

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
        {items.map((i) => (
          <Card
            key={i.id}
            className='p-4 shadow-soft hover:shadow-card transition-smooth border-border/60'
          >
            <div className='flex items-start gap-3'>
              <div className='h-11 w-11 rounded-xl bg-gradient-cream flex items-center justify-center font-display font-extrabold text-primary shrink-0'>
                {i.name.slice(0, 2)}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <div className='font-display font-bold'>{i.name}</div>
                    <Badge
                      variant='outline'
                      className='text-[10px] mt-0.5 bg-secondary border-0 text-muted-foreground'
                    >
                      {i.cat}
                    </Badge>
                  </div>
                  <Switch
                    checked={i.connected}
                    onCheckedChange={() => toggle(i)}
                  />
                </div>
                <p className='text-xs text-muted-foreground mt-2 leading-relaxed'>
                  {i.desc}
                </p>
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-xs h-7 px-2 mt-2 text-primary'
                  onClick={() => toggle(i)}
                >
                  {i.connected ? 'Disconnect' : 'Connect'} →
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
