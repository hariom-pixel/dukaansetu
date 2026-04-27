import { Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Bell, Search, Plus, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function AppLayout() {
  const navigate = useNavigate()
  const [quickOpen, setQuickOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')

  return (
    <SidebarProvider>
      <div className='min-h-screen flex w-full bg-background'>
        <AppSidebar />

        <div className='flex-1 flex min-w-0 flex-col'>
          <header className='sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur shadow-sm'>
            <div className='flex h-16 items-center gap-3 px-4 md:px-6'>
              <div className='flex items-center gap-2 shrink-0'>
                <SidebarTrigger className='text-muted-foreground hover:text-foreground' />
              </div>

              <div className='hidden md:flex flex-1 justify-center min-w-0 px-2'>
                <div className='relative w-full max-w-xl'>
                  <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    placeholder='Search products, invoices, customers…'
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return

                      const q = globalSearch.trim().toLowerCase()
                      if (!q) return

                      if (q.startsWith('inv') || q.includes('invoice')) {
                        navigate('/sales')
                      } else if (
                        q.includes('customer') ||
                        q.includes('phone')
                      ) {
                        navigate('/customers')
                      } else {
                        navigate('/inventory')
                      }
                    }}
                    className='h-10 rounded-xl border-border bg-background pl-9 pr-16 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20'
                  />
                  <kbd className='absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground lg:inline-flex'>
                    ⌘ K
                  </kbd>
                </div>
              </div>

              <div className='md:hidden flex-1' />

              <div className='flex items-center gap-2 shrink-0'>
                <Badge
                  variant='outline'
                  className='hidden h-9 items-center gap-1.5 rounded-full border-border bg-secondary/60 px-3 text-foreground sm:flex'
                >
                  <span className='h-1.5 w-1.5 rounded-full bg-success' />
                  Live
                </Badge>

                <div className='relative hidden sm:block'>
                  <Button
                    size='sm'
                    className='h-9 rounded-full bg-primary px-4 text-primary-foreground shadow-sm hover:shadow-md transition-all'
                    onClick={() => setQuickOpen((v) => !v)}
                  >
                    <Plus className='mr-1.5 h-4 w-4' />
                    New
                  </Button>

                  {quickOpen && (
                    <div className='absolute right-0 top-11 z-50 w-52 rounded-xl border border-border bg-card p-2 shadow-elevated'>
                      <button
                        className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary'
                        onClick={() => {
                          navigate('/pos')
                          setQuickOpen(false)
                        }}
                      >
                        New bill / POS
                      </button>

                      <button
                        className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary'
                        onClick={() => {
                          navigate('/inventory')
                          setQuickOpen(false)
                        }}
                      >
                        Add product
                      </button>

                      <button
                        className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary'
                        onClick={() => {
                          navigate('/customers')
                          setQuickOpen(false)
                        }}
                      >
                        Add customer
                      </button>

                      <button
                        className='w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary'
                        onClick={() => {
                          navigate('/purchase')
                          setQuickOpen(false)
                        }}
                      >
                        New purchase order
                      </button>
                    </div>
                  )}
                </div>

                <Button
                  variant='ghost'
                  size='icon'
                  className='relative h-9 w-9 rounded-full hover:bg-secondary'
                >
                  <Bell className='h-5 w-5' />
                  <span className='absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background' />
                </Button>

                <button className='flex h-10 items-center gap-2 rounded-full border border-transparent pl-1 pr-2 transition-colors hover:border-border hover:bg-secondary/70 active:scale-95'>
                  <Avatar className='h-8 w-8 ring-2 ring-primary/15'>
                    <AvatarFallback className='bg-gradient-warm text-primary-foreground text-xs font-bold'>
                      AK
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className='hidden h-4 w-4 text-muted-foreground sm:block' />
                </button>
              </div>
            </div>
          </header>

          <main className='flex-1 overflow-auto'>
            <div className='animate-fade-in p-4 md:p-6 lg:p-8'>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
