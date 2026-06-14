import { useCallback, useState } from 'react'

export type Density = 'S' | 'M' | 'L'
const KEY = 'pas-density'
/** target tile width (px) fed to the ResizeObserver column calc */
const TARGET: Record<Density, number> = { S: 116, M: 168, L: 224 }

function read(): Density {
  const v = localStorage.getItem(KEY)
  return v === 'S' || v === 'M' || v === 'L' ? v : 'M'
}

export function useGridDensity() {
  const [density, setDensityState] = useState<Density>(() => read())

  const setDensity = useCallback((d: Density) => {
    localStorage.setItem(KEY, d)
    setDensityState(d)
  }, [])

  return { density, setDensity, tileTarget: TARGET[density] }
}
