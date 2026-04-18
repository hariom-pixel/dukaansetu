// Mock data for the Friendly Retail ERP demo
export const KPIS = {
  todaySales: 248930,
  yesterdaySales: 212400,
  cashInHand: 48210,
  onlineOrders: 142,
  pendingApprovals: 7,
  lowStock: 23,
  expiringSoon: 11,
  outstanding: 318450,
}

export const SALES_TREND = [
  { day: 'Mon', in: 142000, ret: 8400 },
  { day: 'Tue', in: 168200, ret: 6100 },
  { day: 'Wed', in: 191500, ret: 9200 },
  { day: 'Thu', in: 175800, ret: 7400 },
  { day: 'Fri', in: 224300, ret: 11200 },
  { day: 'Sat', in: 286400, ret: 14100 },
  { day: 'Sun', in: 248930, ret: 10500 },
]

export const CHANNEL_MIX = [
  { name: 'POS Walk-in', value: 58, color: 'hsl(16 78% 52%)' },
  { name: 'Online', value: 24, color: 'hsl(38 88% 56%)' },
  { name: 'B2B Wholesale', value: 13, color: 'hsl(152 52% 40%)' },
  { name: 'Phone/WhatsApp', value: 5, color: 'hsl(22 92% 64%)' },
]

export const BRANCHES = [
  {
    id: 'BR01',
    name: 'Mumbai - Bandra Flagship',
    sales: 89400,
    health: 96,
    alerts: 2,
  },
  { id: 'BR02', name: 'Mumbai - Andheri', sales: 62100, health: 88, alerts: 5 },
  {
    id: 'BR03',
    name: 'Pune - Koregaon Park',
    sales: 47800,
    health: 91,
    alerts: 3,
  },
  {
    id: 'BR04',
    name: 'Bengaluru - Indiranagar',
    sales: 41600,
    health: 84,
    alerts: 6,
  },
  {
    id: 'BR05',
    name: 'Delhi - Connaught Place',
    sales: 8030,
    health: 72,
    alerts: 9,
  },
]

export const TOP_PRODUCTS = [
  {
    sku: 'SKU-1042',
    name: 'Amul Gold Milk 1L',
    qty: 412,
    revenue: 28840,
    margin: 12,
  },
  {
    sku: 'SKU-2210',
    name: 'Britannia Marie Gold 250g',
    qty: 388,
    revenue: 15520,
    margin: 18,
  },
  {
    sku: 'SKU-3198',
    name: 'Tata Salt 1kg',
    qty: 301,
    revenue: 8128,
    margin: 9,
  },
  {
    sku: 'SKU-7741',
    name: 'Surf Excel 1kg',
    qty: 224,
    revenue: 33824,
    margin: 22,
  },
  {
    sku: 'SKU-5520',
    name: 'Colgate MaxFresh 150g',
    qty: 198,
    revenue: 17820,
    margin: 26,
  },
  {
    sku: 'SKU-9001',
    name: 'Dettol Handwash 200ml',
    qty: 167,
    revenue: 14195,
    margin: 31,
  },
]

export interface Invoice {
  id: string
  customer: string
  channel: string
  amount: number
  status: 'Paid' | 'Pending' | 'Credit'
  time: string
}
export const RECENT_INVOICES: Invoice[] = [
  {
    id: 'INV-24081',
    customer: 'Rohit Sharma',
    channel: 'POS',
    amount: 1842,
    status: 'Paid',
    time: '2 min ago',
  },
  {
    id: 'INV-24080',
    customer: 'Priya Distributors',
    channel: 'B2B',
    amount: 48200,
    status: 'Credit',
    time: '8 min ago',
  },
  {
    id: 'INV-24079',
    customer: 'Walk-in',
    channel: 'POS',
    amount: 318,
    status: 'Paid',
    time: '12 min ago',
  },
  {
    id: 'INV-24078',
    customer: 'Anjali Kumar',
    channel: 'Online',
    amount: 1240,
    status: 'Paid',
    time: '16 min ago',
  },
  {
    id: 'INV-24077',
    customer: 'Greenline Pharmacy',
    channel: 'B2B',
    amount: 22480,
    status: 'Pending',
    time: '24 min ago',
  },
  {
    id: 'INV-24076',
    customer: 'Walk-in',
    channel: 'POS',
    amount: 642,
    status: 'Paid',
    time: '31 min ago',
  },
]

export const LOW_STOCK = [
  {
    sku: 'SKU-1042',
    name: 'Amul Gold Milk 1L',
    branch: 'Bandra',
    qty: 8,
    reorder: 50,
  },
  {
    sku: 'SKU-7741',
    name: 'Surf Excel 1kg',
    branch: 'Andheri',
    qty: 3,
    reorder: 30,
  },
  {
    sku: 'SKU-2210',
    name: 'Britannia Marie Gold 250g',
    branch: 'Pune',
    qty: 12,
    reorder: 60,
  },
  {
    sku: 'SKU-9001',
    name: 'Dettol Handwash 200ml',
    branch: 'Indiranagar',
    qty: 5,
    reorder: 25,
  },
]

export const EXPIRING = [
  {
    sku: 'SKU-4502',
    name: 'Yogurt Cup 200g',
    batch: 'B-2241',
    qty: 42,
    days: 3,
  },
  { sku: 'SKU-4509', name: 'Bread Loaf', batch: 'B-7720', qty: 18, days: 2 },
  { sku: 'SKU-3380', name: 'Paneer 200g', batch: 'B-1840', qty: 24, days: 5 },
]

export const APPROVALS = [
  {
    id: 'APR-118',
    type: 'Discount > 15%',
    by: 'Cashier · Riya',
    value: '₹4,200',
    time: '5m',
  },
  {
    id: 'APR-117',
    type: 'Credit limit raise',
    by: 'Mgr · Anil',
    value: '₹50,000',
    time: '22m',
  },
  {
    id: 'APR-116',
    type: 'Stock write-off',
    by: 'Mgr · Sunita',
    value: '12 units',
    time: '1h',
  },
]

export interface Supplier {
  id: string
  name: string
  outstanding: number
  leadDays: number
  rating: number
}
export const SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-01',
    name: 'Hindustan Unilever',
    outstanding: 184200,
    leadDays: 4,
    rating: 4.6,
  },
  {
    id: 'SUP-02',
    name: 'ITC Foods',
    outstanding: 92800,
    leadDays: 3,
    rating: 4.4,
  },
  {
    id: 'SUP-03',
    name: 'Britannia Industries',
    outstanding: 41100,
    leadDays: 5,
    rating: 4.7,
  },
  {
    id: 'SUP-04',
    name: 'Amul Cooperative',
    outstanding: 218400,
    leadDays: 1,
    rating: 4.9,
  },
]

export interface Customer {
  id: string
  name: string
  visits: number
  spent: number
  loyalty: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  last: string
}
export const CUSTOMERS: Customer[] = [
  {
    id: 'C-1024',
    name: 'Rohit Sharma',
    visits: 38,
    spent: 42100,
    loyalty: 'Gold',
    last: 'Today',
  },
  {
    id: 'C-1025',
    name: 'Anjali Kumar',
    visits: 24,
    spent: 28900,
    loyalty: 'Silver',
    last: 'Yesterday',
  },
  {
    id: 'C-1026',
    name: 'Priya Distributors',
    visits: 112,
    spent: 482000,
    loyalty: 'Platinum',
    last: 'Today',
  },
  {
    id: 'C-1027',
    name: 'Vikram Singh',
    visits: 9,
    spent: 8400,
    loyalty: 'Bronze',
    last: '3 days',
  },
]

export interface Product {
  id: string // same as sku
  sku: string
  name: string
  price: number
  stock: number
}
export const POS_PRODUCTS: Product[] = [
  {
    id: 'SKU-1042',
    sku: 'SKU-1042',
    name: 'Amul Gold Milk 1L',
    price: 70,
    stock: 142,
  },
  {
    id: 'SKU-2210',
    sku: 'SKU-2210',
    name: 'Britannia Marie Gold 250g',
    price: 40,
    stock: 88,
  },
  {
    id: 'SKU-3198',
    sku: 'SKU-3198',
    name: 'Tata Salt 1kg',
    price: 27,
    stock: 220,
  },
  {
    id: 'SKU-7741',
    sku: 'SKU-7741',
    name: 'Surf Excel 1kg',
    price: 151,
    stock: 32,
  },
  {
    id: 'SKU-5520',
    sku: 'SKU-5520',
    name: 'Colgate MaxFresh 150g',
    price: 90,
    stock: 64,
  },
  {
    id: 'SKU-9001',
    sku: 'SKU-9001',
    name: 'Dettol Handwash 200ml',
    price: 85,
    stock: 41,
  },
  {
    id: 'SKU-4502',
    sku: 'SKU-4502',
    name: 'Yogurt Cup 200g',
    price: 35,
    stock: 58,
  },
  {
    id: 'SKU-3380',
    sku: 'SKU-3380',
    name: 'Paneer 200g',
    price: 95,
    stock: 24,
  },
]

export interface PurchaseOrder {
  id: string
  supplier: string
  items: number
  value: number
  status: 'Draft' | 'Approval' | 'In transit' | 'Delivered'
  eta: string
}
export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-7741',
    supplier: 'Amul Cooperative',
    items: 24,
    value: 184200,
    status: 'In transit',
    eta: 'Tomorrow',
  },
  {
    id: 'PO-7740',
    supplier: 'Hindustan Unilever',
    items: 48,
    value: 92400,
    status: 'Delivered',
    eta: 'Today',
  },
  {
    id: 'PO-7739',
    supplier: 'ITC Foods',
    items: 18,
    value: 41800,
    status: 'Approval',
    eta: '—',
  },
  {
    id: 'PO-7738',
    supplier: 'Britannia Industries',
    items: 12,
    value: 22400,
    status: 'Draft',
    eta: '—',
  },
]

export interface JournalEntry {
  id: string
  date: string
  desc: string
  debit: number
  credit: number
}
export const JOURNAL_SEED: JournalEntry[] = [
  {
    id: 'J-001',
    date: '18 Apr',
    desc: 'POS Sales · Bandra',
    debit: 0,
    credit: 89400,
  },
  {
    id: 'J-002',
    date: '18 Apr',
    desc: 'Supplier payment · Amul',
    debit: 184200,
    credit: 0,
  },
  {
    id: 'J-003',
    date: '18 Apr',
    desc: 'B2B invoice · Greenline',
    debit: 0,
    credit: 22480,
  },
  {
    id: 'J-004',
    date: '17 Apr',
    desc: 'Cash deposit · HDFC',
    debit: 50000,
    credit: 0,
  },
  { id: 'J-005', date: '17 Apr', desc: 'GST payment', debit: 42100, credit: 0 },
  {
    id: 'J-006',
    date: '17 Apr',
    desc: 'Online sales settlement',
    debit: 0,
    credit: 38400,
  },
]

export const fmtINR = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
