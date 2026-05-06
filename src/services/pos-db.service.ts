import { invoke } from '@tauri-apps/api/core'

export type SaleInput = {
  customerId?: number | null
  customerName: string
  customerPhone?: string
  subtotal: number
  discount: number
  discountValue: number
  discountType: 'percent' | 'flat'
  tax: number
  gstRate: number
  gstMode: 'with' | 'without'
  total: number
  paymentMode: string
  saleMode: 'paid' | 'credit'
}

export type SaleItemInput = {
  sku: string
  name: string
  price: number
  qty: number
  hsnCode?: string | null
  gstRate?: number
  taxAmount?: number
  taxableAmount?: number
  taxInclusive?: boolean
}

export async function createSale(
  sale: SaleInput,
  items: SaleItemInput[]
): Promise<string> {
  const result = await invoke<{ invoiceId: string }>('create_sale_atomic', {
    payload: {
      ...sale,
      items,
    },
  })

  return result.invoiceId
}
