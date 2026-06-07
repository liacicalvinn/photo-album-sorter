import { memo } from 'react'
import type { CSSProperties } from 'react'
import { useThumbUrl } from '../hooks/useObjectUrlCache'
import type { Photo } from '../db/types'

export interface PhotoCellProps {
  photo: Photo
  selected: boolean
  selectionActive: boolean
  onToggleSelect: (id: string, shiftKey: boolean) => void
  onOpen: (id: string) => void
  // DnD wiring (provided by SortablePhotoCell in M4)
  innerRef?: (el: HTMLElement | null) => void
  style?: CSSProperties
  handleProps?: Record<string, unknown>
  dragging?: boolean
  overlay?: boolean
}

function PhotoCellImpl({
  photo,
  selected,
  selectionActive,
  onToggleSelect,
  onOpen,
  innerRef,
  style,
  handleProps,
  dragging,
  overlay,
}: PhotoCellProps) {
  const url = useThumbUrl(photo.id)
  return (
    <div
      ref={innerRef as never}
      className={
        'cell' +
        (selected ? ' selected' : '') +
        (dragging ? ' dragging' : '') +
        (overlay ? ' overlay' : '')
      }
      style={style}
      data-photo-id={photo.id}
      {...handleProps}
    >
      <button
        type="button"
        className="cell-img-btn"
        onClick={(e) => {
          if (selectionActive) {
            onToggleSelect(photo.id, e.shiftKey)
          } else {
            onOpen(photo.id)
          }
        }}
        aria-label={selectionActive ? `Select ${photo.name}` : `Open ${photo.name}`}
      >
        {url ? (
          <img src={url} alt={photo.name} draggable={false} loading="lazy" decoding="async" />
        ) : (
          <span className="cell-ph" aria-hidden>
            <span className="spinner" />
          </span>
        )}
      </button>

      <label
        className={'cell-check' + (selected ? ' on' : '')}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) =>
            onToggleSelect(photo.id, (e.nativeEvent as MouseEvent).shiftKey)
          }
          aria-label={`Select ${photo.name}`}
        />
        <span className="cell-check-box" aria-hidden />
      </label>
    </div>
  )
}

export const PhotoCell = memo(PhotoCellImpl)
