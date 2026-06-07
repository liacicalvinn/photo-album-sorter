import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getMissingThumbPhotoIds, getOriginalBlob, setThumb } from '../db/repo'

const CONCURRENCY = 2

interface WorkerOut {
  id: string
  ok: boolean
  thumb?: Blob
  width?: number
  height?: number
}

export interface ThumbProgress {
  done: number
  total: number
}

/**
 * Drives a small worker pool that fills in missing thumbnails. Reacts to a
 * liveQuery of photos-without-thumbs, so newly imported photos are picked up
 * automatically and progress is reported for a toast.
 */
export function useThumbnailQueue(): ThumbProgress | null {
  const missing = useLiveQuery(getMissingThumbPhotoIds, [], undefined)
  const [progress, setProgress] = useState<ThumbProgress | null>(null)

  const workersRef = useRef<Worker[]>([])
  const idle = useRef<boolean[]>([])
  const queue = useRef<string[]>([])
  const inFlight = useRef<Set<string>>(new Set())
  const enqueued = useRef<Set<string>>(new Set())
  const total = useRef(0)
  const done = useRef(0)

  // pump assigns queued jobs to idle workers (refs only → safe from any closure)
  const pump = useRef(() => {})
  pump.current = () => {
    const ws = workersRef.current
    for (let i = 0; i < ws.length; i++) {
      if (idle.current[i] && queue.current.length) {
        const id = queue.current.shift()!
        idle.current[i] = false
        inFlight.current.add(id)
        void dispatch(ws[i], i, id)
      }
    }
    if (!queue.current.length && inFlight.current.size === 0) {
      total.current = 0
      done.current = 0
      setProgress(null)
    } else {
      setProgress({ done: done.current, total: total.current })
    }
  }

  async function dispatch(w: Worker, i: number, id: string) {
    const blob = await getOriginalBlob(id)
    if (!blob) {
      inFlight.current.delete(id)
      idle.current[i] = true
      done.current++
      pump.current()
      return
    }
    w.postMessage({ id, blob })
  }

  useEffect(() => {
    const ws: Worker[] = []
    for (let i = 0; i < CONCURRENCY; i++) {
      const w = new Worker(
        new URL('../workers/thumbnail.worker.ts', import.meta.url),
        { type: 'module' },
      )
      const idx = i
      w.onmessage = async (e: MessageEvent<WorkerOut>) => {
        const data = e.data
        if (data.ok && data.thumb) {
          try {
            await setThumb(
              data.id,
              data.thumb,
              data.width && data.height
                ? { width: data.width, height: data.height }
                : undefined,
            )
          } catch {
            /* quota etc — skip; thumb stays missing, grid falls back */
          }
        }
        inFlight.current.delete(data.id)
        enqueued.current.delete(data.id)
        idle.current[idx] = true
        done.current++
        pump.current()
      }
      idle.current[idx] = true
      ws.push(w)
    }
    workersRef.current = ws
    pump.current()
    return () => {
      ws.forEach((w) => w.terminate())
      workersRef.current = []
      idle.current = []
      inFlight.current.clear()
      enqueued.current.clear()
      queue.current = []
    }
  }, [])

  useEffect(() => {
    if (!missing) return
    let added = false
    for (const id of missing) {
      if (!enqueued.current.has(id)) {
        enqueued.current.add(id)
        queue.current.push(id)
        total.current++
        added = true
      }
    }
    if (added) pump.current()
  }, [missing])

  return progress
}
