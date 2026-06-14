import { memo } from 'react'
import type { CSSProperties } from 'react'
import { useThumbUrl } from '../hooks/useObjectUrlCache'
import { Grip, Check } from './icons/Icons'
import type { Photo } from '../db/types'

export interface PhotoCellProps {
  photo: Photo
  selected: boolean
  selectionActive: boolean
  onToggleSelect: (id: string, shiftKey: boolean) => void
  onOpen: (id: string) => void
  /** 1-based position within its chapter (book order). Hidden in Unsorted. */
  position?: number
  /** 1-based global page number across the whole book (shown only with 2+ chapters). */
  page?: number
  isUnsorted?: boolean
  // DnD wiring (provided by SortablePhotoCell)
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
  position,
  page,
  isUnsorted,
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
          if (selectionActive) onToggleSelect(photo.id, e.shiftKey)
          else onOpen(photo.id)
        }}
        aria-label={selectionActive ? `Select ${photo.name}` : `Open ${photo.name}`}
        tabIndex={overlay ? -1 : 0}
      >
        {url ? (
          <img src={url} alt={photo.name} draggable={false} loading="lazy" decoding="async" />
        ) : (
          <span className="cell-shimmer" aria-hidden />
        )}
      </button>

      {/* select checkbox — top-left */}
      <label
        className={'cell-check' + (selected ? ' on' : '')}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelect(photo.id, (e.nativeEvent as MouseEvent).shiftKey)}
          aria-label={`Select ${photo.name}`}
          tabIndex={overlay ? -1 : 0}
        />
        <span className="cell-check-box" aria-hidden>
          {selected && <Check size={14} />}
        </span>
      </label>

      {/* drag affordance — top-right (whole tile is draggable; this is the hint) */}
      {!overlay && (
        <span className="cell-grip" aria-hidden>
          <Grip size={16} />
        </span>
      )}

      {/* position within chapter — bottom-left */}
      {position != null && !isUnsorted && (
        <span className="cell-pos" aria-hidden>
          {position}
        </span>
      )}

      {/* global book page — bottom-right (only when multiple chapters) */}
      {page != null && !isUnsorted && (
        <span className="cell-page" aria-hidden>
          p{page}
        </span>
      )}
    </div>
  )
}

export const PhotoCell = memo(PhotoCellImpl)
