import { useEffect, useState } from 'react'

export interface StorageEstimate {
  usage: number
  quota: number
  ratio: number
}

/** Polls navigator.storage.estimate(); also re-checks when `trigger` changes. */
export function useStorageEstimate(trigger?: unknown): StorageEstimate | null {
  const [est, setEst] = useState<StorageEstimate | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const e = await navigator.storage?.estimate?.()
        if (!e || cancelled) return
        const usage = e.usage ?? 0
        const quota = e.quota ?? 0
        setEst({ usage, quota, ratio: quota ? usage / quota : 0 })
      } catch {
        /* ignore */
      }
    }
    check()
    const t = setInterval(check, 15000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [trigger])

  return est
}
