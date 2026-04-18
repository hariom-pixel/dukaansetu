import { useEffect, useState } from 'react'

export default function DraftsPage({ onOpen }) {
  const [drafts, setDrafts] = useState([])

  useEffect(() => {
    const d = JSON.parse(localStorage.getItem('drafts') || '[]')
    setDrafts(d)
  }, [])

  return (
    <div>
      <h2>Draft Invoices</h2>

      {drafts.map((d: any) => (
        <div key={d.id} style={{ padding: 10, borderBottom: '1px solid #eee' }}>
          Draft #{d.id} - ₹{d.total}
          <button onClick={() => onOpen(d)}>Open</button>
        </div>
      ))}
    </div>
  )
}
