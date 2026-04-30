import {
  createProduct,
  getAllProducts,
  updateProductStock,
} from '@/services/product-db.service'

const products = [
  ['MILK-001', 'Amul Milk 1L', '8901234500011', 68, 40, 10],
  ['BREAD-001', 'Britannia Bread Large', '8901234500012', 45, 25, 12],
  ['RICE-001', 'Basmati Rice 5kg', '8901234500013', 420, 10, 5],
  ['ATTA-001', 'Aashirvaad Atta 5kg', '8901234500014', 295, 12, 6],
  ['OIL-001', 'Fortune Oil 1L', '8901234500015', 165, 20, 8],
  ['SUGAR-001', 'Sugar 1kg', '8901234500016', 52, 35, 15],
  ['SALT-001', 'Tata Salt 1kg', '8901234500017', 28, 60, 20],
  ['TEA-001', 'Tata Tea 500g', '8901234500018', 210, 15, 6],
  ['BIS-001', 'Parle-G Biscuit', '8901234500021', 10, 100, 40],
  ['CHIPS-001', 'Lays Classic', '8901234500022', 20, 80, 30],
  ['MAGGI-001', 'Maggi 2-Minute Noodles', '8901234500023', 16, 120, 50],
  ['CHOC-001', 'Dairy Milk Small', '8901234500024', 20, 70, 35],
  ['COLA-001', 'Coca Cola 750ml', '8901234500031', 40, 45, 20],
  ['WATER-001', 'Bisleri 1L', '8901234500032', 20, 60, 25],
  ['JUICE-001', 'Real Mango Juice 1L', '8901234500033', 120, 25, 10],
  ['SOAP-001', 'Lux Soap', '8901234500041', 38, 50, 20],
  ['SHAMP-001', 'Clinic Plus Shampoo Sachet', '8901234500042', 3, 200, 100],
  ['TOOTH-001', 'Colgate Toothpaste 200g', '8901234500043', 110, 30, 12],
  ['DETER-001', 'Surf Excel 1kg', '8901234500044', 180, 18, 8],
  ['MATCH-001', 'Ship Matchbox Pack', '8901234500045', 10, 90, 30],
]

export async function seedProducts() {
  const existing = await getAllProducts()

  for (const [sku, name, barcode, price, stock, reorderLevel] of products) {
    const found = existing.find((p) => p.sku === sku)

    if (!found) {
      await createProduct({
        sku: String(sku),
        name: String(name),
        barcode: String(barcode),
        price: Number(price),
        stock: Number(stock),
        reorderLevel: Number(reorderLevel),
      })
    } else {
      await updateProductStock(Number(found.id), Number(stock))
    }
  }

  return await getAllProducts()
}
