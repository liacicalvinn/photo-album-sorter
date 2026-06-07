import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getOriginalBlob, getThumbBlob } from '../db/repo'

// Ref-counted object-URL cache. Multiple consumers of the same photo's thumb
// share ONE object URL; it's revoked only when the last consumer unmounts (or
// the underlying blob changes). createObjectURL is NEVER called in render.
class ObjectUrlCache {
  private entries = new Map<string, { url: string; blob: Blob; refs: number }>()

  acquire(key: string, blob: Blob): string {
    const e = this.entries.get(key)
    if (e && e.blob === blob) {
      e.refs++
      return e.url
    }
    if (e) URL.revokeObjectURL(e.url) // blob changed → replace
    const url = URL.createObjectURL(blob)
    this.entries.set(key, { url, blob, refs: 1 })
    return url
  }

  release(key: string, blob: Blob) {
    const e = this.entries.get(key)
    if (!e || e.blob !== blob) return
    e.refs--
    if (e.refs <= 0) {
      URL.revokeObjectURL(e.url)
      this.entries.delete(key)
    }
  }
}

const thumbCache = new ObjectUrlCache()

/** Reactive thumbnail object URL for a photo (undefined until the thumb exists). */
export function useThumbUrl(photoId: string): string | undefined {
  const blob = useLiveQuery(() => getThumbBlob(photoId), [photoId])
  const [url, setUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (!blob) {
      setUrl(undefined)
      return
    }
    const u = thumbCache.acquire(photoId, blob)
    setUrl(u)
    return () => thumbCache.release(photoId, blob)
  }, [photoId, blob])
  return url
}

/**
 * Full-resolution object URL for a single photo, created on demand and revoked
 * on unmount. Used ONLY by the lightbox so at most a couple of full-res URLs
 * are ever live at once.
 */
export function useOriginalUrl(photoId: string | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    let revoked = false
    let created: string | undefined
    if (!photoId) {
      setUrl(undefined)
      return
    }
    getOriginalBlob(photoId).then((blob) => {
      if (!blob || revoked) return
      created = URL.createObjectURL(blob)
      setUrl(created)
    })
    return () => {
      revoked = true
      if (created) URL.revokeObjectURL(created)
      setUrl(undefined)
    }
  }, [photoId])
  return url
}
