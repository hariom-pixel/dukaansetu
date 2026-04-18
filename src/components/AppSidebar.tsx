import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ScanBarcode,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  BarChart3,
  Plug,
  Settings,
  Store,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar'

const operate = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'POS / Billing', url: '/pos', icon: ScanBarcode },
  { title: 'Inventory', url: '/inventory', icon: Package },
]
const commerce = [
  { title: 'Sales', url: '/sales', icon: ShoppingCart },
  { title: 'Purchase', url: '/purchase', icon: Truck },
  { title: 'Customers', url: '/customers', icon: Users },
]
const finance = [
  { title: 'Accounting', url: '/accounting', icon: Wallet },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
]
const system = [
  { title: 'Integrations', url: '/integrations', icon: Plug },
  { title: 'Settings', url: '/settings', icon: Settings },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'
  const { pathname } = useLocation()

  const renderGroup = (label: string, items: typeof operate) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className='text-sidebar-foreground/50 text-[10px] uppercase tracking-widest font-semibold px-3'>
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = pathname === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className='h-10 rounded-lg data-[active=true]:bg-sidebar-accent'
                >
                  <NavLink
                    to={item.url}
                    end
                    className={`flex items-center gap-3 px-3 transition-smooth ${
                      active
                        ? 'bg-gradient-primary text-sidebar-primary-foreground font-semibold shadow-glow'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <item.icon className='h-4 w-4 shrink-0' />
                    {!collapsed && (
                      <span className='text-sm'>{item.title}</span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )

  return (
    <Sidebar collapsible='icon' className='border-r-0'>
      <SidebarHeader className='border-b border-sidebar-border/50 py-4'>
        <div className='flex items-center gap-2 px-3'>
          <div className='h-9 w-9 rounded-xl bg-gradient-warm flex items-center justify-center shadow-glow shrink-0'>
            <Store className='h-5 w-5 text-primary-foreground' />
          </div>
          {!collapsed && (
            <div className='leading-tight'>
              <div className='font-display font-extrabold text-sidebar-foreground text-base'>
                Kirana<span className='text-primary-glow'>.</span>OS
              </div>
              <div className='text-[10px] text-sidebar-foreground/50 uppercase tracking-widest'>
                Retail ERP
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className='py-2'>
        {renderGroup('Operate', operate)}
        {renderGroup('Commerce', commerce)}
        {renderGroup('Finance', finance)}
        {renderGroup('System', system)}
      </SidebarContent>
    </Sidebar>
  )
}
