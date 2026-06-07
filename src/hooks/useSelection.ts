import { useCallback, useMemo, useState } from 'react'

/** Multi-select state for photos, with shift-range support within an ordered list. */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [anchor, setAnchor] = useState<string | null>(null)

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setAnchor(id)
  }, [])

  const selectRange = useCallback(
    (id: string, orderedIds: string[]) => {
      if (!anchor) {
        setSelected(new Set([id]))
        setAnchor(id)
        return
      }
      const a = orderedIds.indexOf(anchor)
      const b = orderedIds.indexOf(id)
      if (a === -1 || b === -1) {
        setSelected(new Set([id]))
        setAnchor(id)
        return
      }
      const [lo, hi] = a < b ? [a, b] : [b, a]
      setSelected((prev) => {
        const next = new Set(prev)
        for (let i = lo; i <= hi; i++) next.add(orderedIds[i])
        return next
      })
    },
    [anchor],
  )

  const clear = useCallback(() => {
    setSelected(new Set())
    setAnchor(null)
  }, [])

  const setOnly = useCallback((ids: string[]) => {
    setSelected(new Set(ids))
    setAnchor(ids[ids.length - 1] ?? null)
  }, [])

  return useMemo(
    () => ({ selected, count: selected.size, toggle, selectRange, clear, setOnly }),
    [selected, toggle, selectRange, clear, setOnly],
  )
}
