import { useEffect, useRef } from 'react'
import { useOriginalUrl } from '../hooks/useObjectUrlCache'
import type { Photo, PhotoId } from '../db/types'

export interface LightboxProps {
  photoIds: PhotoId[]
  index: number
  photosById: Record<PhotoId, Photo>
  onIndex: (i: number) => void
  onClose: () => void
}

export function Lightbox({ photoIds, index, photosById, onIndex, onClose }: LightboxProps) {
  const id = photoIds[index]
  const url = useOriginalUrl(id ?? null)
  const photo = id ? photosById[id] : undefined
  const touch = useRef<{ x: number; y: number } | null>(null)

  const prev = () => onIndex((index - 1 + photoIds.length) % photoIds.length)
  const next = () => onIndex((index + 1) % photoIds.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photoIds.length])

  if (!id) return null

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={photo?.name}
      onClick={onClose}
      onTouchStart={(e) => {
        const t = e.touches[0]
        touch.current = { x: t.clientX, y: t.clientY }
      }}
      onTouchEnd={(e) => {
        const start = touch.current
        if (!start) return
        const t = e.changedTouches[0]
        const dx = t.clientX - start.x
        const dy = t.clientY - start.y
        touch.current = null
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) next()
          else prev()
        } else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
          onClose()
        }
      }}
    >
      <div className="lightbox-top" onClick={(e) => e.stopPropagation()}>
        <span className="lightbox-counter">
          {index + 1} / {photoIds.length}
        </span>
        <span className="lightbox-name">{photo?.name}</span>
        <button className="btn ghost icon lightbox-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {photoIds.length > 1 && (
        <button
          className="lightbox-nav prev"
          onClick={(e) => {
            e.stopPropagation()
            prev()
          }}
          aria-label="Previous"
        >
          ‹
        </button>
      )}

      <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {url ? (
          <img src={url} alt={photo?.name ?? ''} className="lightbox-img" draggable={false} />
        ) : (
          <span className="spinner big" />
        )}
      </div>

      {photoIds.length > 1 && (
        <button
          className="lightbox-nav next"
          onClick={(e) => {
            e.stopPropagation()
            next()
          }}
          aria-label="Next"
        >
          ›
        </button>
      )}
    </div>
  )
}
