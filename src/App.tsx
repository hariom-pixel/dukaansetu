import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Inventory from './pages/Inventory'
import Purchase from './pages/Purchase'
import Sales from './pages/Sales'
import Customers from './pages/Customers'
import Accounting from './pages/Accounting'
import Reports from './pages/Reports'
import Integrations from './pages/Integrations'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound.tsx'

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path='/' element={<Dashboard />} />
            <Route path='/pos' element={<POS />} />
            <Route path='/inventory' element={<Inventory />} />
            <Route path='/purchase' element={<Purchase />} />
            <Route path='/sales' element={<Sales />} />
            <Route path='/customers' element={<Customers />} />
            <Route path='/accounting' element={<Accounting />} />
            <Route path='/reports' element={<Reports />} />
            <Route path='/integrations' element={<Integrations />} />
            <Route path='/settings' element={<Settings />} />
          </Route>
          <Route path='*' element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
