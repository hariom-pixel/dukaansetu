export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

export type CustomerRecord = {
  id: string | number
  name: string
  visits: number
  spent: number
  loyalty: LoyaltyTier
  last: string
  phone?: string
  outstanding?: number
}

export function upsertCustomerFromSale(
  customers: CustomerRecord[],
  customer: { name: string; phone?: string },
  total: number,
  isCredit: boolean
) {
  const existing = customers.find((c) => c.name === customer.name)

  if (existing) {
    existing.visits = (existing.visits || 0) + 1
    existing.spent = (existing.spent || 0) + total
    existing.last = 'Today'
    if (customer.phone) existing.phone = customer.phone
    if (isCredit) {
      existing.outstanding = (existing.outstanding || 0) + total
    }
    return existing
  }

  const created: CustomerRecord = {
    id: `C-${Date.now()}`,
    name: customer.name,
    phone: customer.phone || '',
    visits: 1,
    spent: total,
    loyalty: 'Bronze',
    last: 'Today',
    outstanding: isCredit ? total : 0,
  }

  customers.push(created)
  return created
}

export function collectCustomerPayment(
  customers: CustomerRecord[],
  customerId: string | number,
  amount: number
) {
  const customer = customers.find((c) => c.id === customerId)
  if (!customer) {
    throw new Error('Customer not found')
  }

  const currentOutstanding = customer.outstanding || 0
  const applied = Math.min(amount, currentOutstanding)

  customer.outstanding = Math.max(currentOutstanding - applied, 0)
  customer.last = 'Today'

  return {
    customer,
    applied,
    remaining: customer.outstanding,
  }
}
