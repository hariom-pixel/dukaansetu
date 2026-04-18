import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Users,
  Shield,
  Bell,
  Palette,
  Database,
  ChevronRight,
} from 'lucide-react'
import { useLocalObject } from '@/hooks/useLocalStore'
import { toast } from 'sonner'
import { useState } from 'react'

interface OrgSettings {
  legalName: string
  gstin: string
  currency: string
  fyStart: string
  multiBranch: boolean
  batchTracking: boolean
  approvals: boolean
  offlinePOS: boolean
}

const defaults: OrgSettings = {
  legalName: 'Kirana Retail Pvt. Ltd.',
  gstin: '27AABCK1234L1ZV',
  currency: 'INR · Indian Rupee',
  fyStart: '01 April',
  multiBranch: true,
  batchTracking: true,
  approvals: true,
  offlinePOS: false,
}

const sections = [
  {
    icon: Building2,
    title: 'Organization',
    desc: 'Company info, branches, GSTIN',
  },
  {
    icon: Users,
    title: 'Users & roles',
    desc: 'Manage staff, permissions & approvals',
  },
  {
    icon: Shield,
    title: 'Security & audit',
    desc: '2FA, session policy, audit log retention',
  },
  {
    icon: Bell,
    title: 'Notifications',
    desc: 'Low stock, approval & expiry alerts',
  },
  {
    icon: Palette,
    title: 'Branding & receipts',
    desc: 'Logo, invoice templates, footer text',
  },
  {
    icon: Database,
    title: 'Backups & exports',
    desc: 'Daily snapshots, GDPR exports',
  },
]

export default function Settings() {
  const [saved, setSaved] = useLocalObject<OrgSettings>(
    'erp.settings',
    defaults
  )
  const [draft, setDraft] = useState<OrgSettings>(saved)

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const save = () => {
    setSaved(draft)
    toast.success('Settings saved')
  }
  const cancel = () => {
    setDraft(saved)
    toast.info('Changes discarded')
  }

  return (
    <>
      <PageHeader
        eyebrow='Configuration'
        title='Settings'
        subtitle='Configure your tenant, users, and operational policies.'
      />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6'>
        {sections.map((s) => (
          <Card
            key={s.title}
            className='p-5 shadow-soft hover:shadow-card hover:border-primary/30 transition-smooth border-border/60 cursor-pointer group'
            onClick={() => toast.info(`${s.title} panel coming soon`)}
          >
            <div className='flex items-start gap-3'>
              <div className='h-11 w-11 rounded-xl bg-gradient-cream flex items-center justify-center text-primary shrink-0'>
                <s.icon className='h-5 w-5' />
              </div>
              <div className='flex-1'>
                <div className='flex items-center justify-between'>
                  <div className='font-display font-bold'>{s.title}</div>
                  <ChevronRight className='h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-smooth' />
                </div>
                <p className='text-xs text-muted-foreground mt-1'>{s.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className='p-6 shadow-soft border-border/60'>
        <div className='flex items-center gap-2 mb-4'>
          <Building2 className='h-5 w-5 text-primary' />
          <h3 className='font-display font-bold text-lg'>
            Organization details
          </h3>
          <Badge className='bg-success/15 text-success border-0 ml-auto'>
            Verified
          </Badge>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-1.5'>
            <Label className='text-xs text-muted-foreground uppercase tracking-wider'>
              Legal name
            </Label>
            <Input
              value={draft.legalName}
              onChange={(e) =>
                setDraft({ ...draft, legalName: e.target.value })
              }
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-xs text-muted-foreground uppercase tracking-wider'>
              GSTIN
            </Label>
            <Input
              value={draft.gstin}
              onChange={(e) => setDraft({ ...draft, gstin: e.target.value })}
              className='font-mono-num'
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-xs text-muted-foreground uppercase tracking-wider'>
              Default currency
            </Label>
            <Input
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-xs text-muted-foreground uppercase tracking-wider'>
              Fiscal year start
            </Label>
            <Input
              value={draft.fyStart}
              onChange={(e) => setDraft({ ...draft, fyStart: e.target.value })}
            />
          </div>
        </div>

        <div className='mt-6 pt-6 border-t border-border space-y-4'>
          {(
            [
              {
                k: 'multiBranch',
                t: 'Multi-branch mode',
                d: 'Allow stock transfers between branches',
              },
              {
                k: 'batchTracking',
                t: 'Batch & expiry tracking',
                d: 'Required for pharma & FMCG',
              },
              {
                k: 'approvals',
                t: 'Approval workflows',
                d: 'Discount, credit, and write-off approvals',
              },
              {
                k: 'offlinePOS',
                t: 'Offline POS mode',
                d: 'Continue billing without internet',
              },
            ] as const
          ).map((t) => (
            <div key={t.k} className='flex items-center justify-between'>
              <div>
                <div className='font-semibold text-sm'>{t.t}</div>
                <div className='text-xs text-muted-foreground'>{t.d}</div>
              </div>
              <Switch
                checked={draft[t.k]}
                onCheckedChange={(v) => setDraft({ ...draft, [t.k]: v })}
              />
            </div>
          ))}
        </div>

        <div className='mt-6 flex justify-end gap-2'>
          <Button variant='outline' onClick={cancel} disabled={!dirty}>
            Cancel
          </Button>
          <Button
            className='bg-gradient-primary shadow-glow'
            onClick={save}
            disabled={!dirty}
          >
            Save changes
          </Button>
        </div>
      </Card>
    </>
  )
}
