import { useCallback, useEffect, useState } from 'react'

/** localStorage-backed list store with CRUD helpers. */
export function useLocalStore<T extends { id: string }>(
  key: string,
  seed: T[]
) {
  const [items, setItems] = useState<T[]>(() => {
    if (typeof window === 'undefined') return seed
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T[]
    } catch {
      /* ignore */
    }
    window.localStorage.setItem(key, JSON.stringify(seed))
    return seed
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(items))
    } catch {
      /* ignore quota */
    }
  }, [key, items])

  const add = useCallback((item: T) => setItems((s) => [item, ...s]), [])
  const update = useCallback(
    (id: string, patch: Partial<T>) =>
      setItems((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    []
  )
  const remove = useCallback(
    (id: string) => setItems((s) => s.filter((i) => i.id !== id)),
    []
  )
  const reset = useCallback(() => {
    setItems(seed)
    try {
      window.localStorage.setItem(key, JSON.stringify(seed))
    } catch {
      /* ignore */
    }
  }, [key, seed])

  return { items, setItems, add, update, remove, reset }
}

/** Single-object localStorage store (e.g., settings, org profile). */
export function useLocalObject<T>(key: string, seed: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return seed
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T
    } catch {
      /* ignore */
    }
    return seed
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [key, value])

  return [value, setValue] as const
}

export const newId = (prefix = 'ID') =>
  `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
