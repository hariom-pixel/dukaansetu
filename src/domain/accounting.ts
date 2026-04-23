export type JournalRecord = {
  id: string | number
  date: string
  desc: string
  debit: number
  credit: number
}

export function createJournalEntry(
  desc: string,
  debit: number,
  credit: number
): JournalRecord {
  return {
    id: `J-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toLocaleDateString(),
    desc,
    debit,
    credit,
  }
}
