import { useEffect, useRef, useState } from 'react'

/**
 * Responsive column count for the photo grid, derived from the container width
 * and a target tile size. Recomputes on resize via ResizeObserver.
 */
export function useColumns(targetTile = 150, gap = 8, min = 2, max = 10) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [cols, setCols] = useState(min)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width
      const n = Math.max(min, Math.min(max, Math.floor((w + gap) / (targetTile + gap))))
      setCols(n)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [targetTile, gap, min, max])

  return { ref, cols }
}
