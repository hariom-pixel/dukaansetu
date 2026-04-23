export type StockLedgerEntry = {
  id: string
  date: string
  sku: string
  productName: string
  qty: number
  direction: 'IN' | 'OUT'
  reason: 'SALE' | 'PURCHASE_RECEIVE' | 'RETURN' | 'VOID'
  refId: string
  note?: string
}

const STORAGE_KEY = 'erp.stockLedger'

export function getStockLedger(): StockLedgerEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function addStockLedgerEntry(entry: StockLedgerEntry) {
  const current = getStockLedger()
  current.unshift(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export function createStockLedgerEntry(
  input: Omit<StockLedgerEntry, 'id' | 'date'>
): StockLedgerEntry {
  return {
    id: `STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toLocaleString(),
    ...input,
  }
}
