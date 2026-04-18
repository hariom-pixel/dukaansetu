import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Bell, Search, Plus, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className='min-h-screen flex w-full bg-background'>
        <AppSidebar />
        <div className='flex-1 flex flex-col min-w-0'>
          <header className='h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 flex items-center gap-3 px-4'>
            <SidebarTrigger className='text-muted-foreground hover:text-foreground' />
            <div className='hidden md:flex items-center gap-2 flex-1 max-w-md'>
              <div className='relative w-full'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Search products, invoices, customers…'
                  className='pl-9 bg-secondary/60 border-transparent focus-visible:bg-card h-10 rounded-xl'
                />
                <kbd className='hidden lg:inline-flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border'>
                  ⌘ K
                </kbd>
              </div>
            </div>
            <div className='flex-1 md:hidden' />
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className='hidden sm:flex items-center gap-1.5 border-success/30 bg-success/10 text-success font-medium'
              >
                <span className='h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft' />
                Live
              </Badge>
              <Button
                size='sm'
                className='bg-gradient-primary hover:opacity-90 shadow-glow gap-1.5 hidden sm:flex'
              >
                <Plus className='h-4 w-4' /> New
              </Button>
              <Button variant='ghost' size='icon' className='relative'>
                <Bell className='h-5 w-5' />
                <span className='absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary' />
              </Button>
              <button className='flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-secondary transition-smooth'>
                <Avatar className='h-8 w-8 ring-2 ring-primary/20'>
                  <AvatarFallback className='bg-gradient-warm text-primary-foreground text-xs font-bold'>
                    AK
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className='h-4 w-4 text-muted-foreground hidden sm:block' />
              </button>
            </div>
          </header>
          <main className='flex-1 overflow-auto'>
            <div className='p-4 md:p-6 lg:p-8 animate-fade-in'>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
