import { store } from './store'

export function createPurchase(purchase) {
  const products = store.getProducts()

  purchase.lines.forEach((line) => {
    const p = products.find((x) => x.id === line.productId)
    if (p) p.stock += line.qty
  })

  store.setProducts(products)
}
