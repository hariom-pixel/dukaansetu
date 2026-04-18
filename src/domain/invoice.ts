import { store } from './store'

export function createInvoice(invoice) {
  const invoices = store.getInvoices()

  invoice.status = 'FINAL'
  invoice.id = Date.now().toString()

  // 🔻 reduce stock
  const products = store.getProducts()

  invoice.lines.forEach((line) => {
    const p = products.find((x) => x.id === line.productId)
    if (p) p.stock -= line.qty
  })

  store.setProducts(products)
  store.setInvoices([...invoices, invoice])
}
