type Product = {
  id: string
  name: string
  price: number
  stock: number
}

type InvoiceLine = {
  productId: string
  qty: number
  price: number
}

type Invoice = {
  id: string
  customerId: string
  lines: InvoiceLine[]
  total: number
  status: 'DRAFT' | 'FINAL'
}

const get = (key: string) => JSON.parse(localStorage.getItem(key) || '[]')
const set = (key: string, val: any) =>
  localStorage.setItem(key, JSON.stringify(val))

export const store = {
  getProducts: () => get('products'),
  setProducts: (p: Product[]) => set('products', p),

  getInvoices: () => get('invoices'),
  setInvoices: (i: Invoice[]) => set('invoices', i),
}
