import { useState } from 'react'
import { PhotoGrid } from './PhotoGrid'
import { Inbox, Info, ChevronDown } from './icons/Icons'
import { UNSORTED, type Photo, type PhotoId } from '../db/types'

export interface UnsortedTrayProps {
  photoIds: PhotoId[]
  photosById: Record<PhotoId, Photo>
  columns: number
  hasChapters: boolean
  selected: Set<string>
  selectionActive: boolean
  onToggleSelect: (id: string, shiftKey: boolean, orderedIds: string[]) => void
  onOpen: (id: string, orderedIds: string[]) => void
  onSelectAll: (orderedIds: string[]) => void
}

export function UnsortedTray({
  photoIds,
  photosById,
  columns,
  hasChapters,
  selected,
  selectionActive,
  onToggleSelect,
  onOpen,
  onSelectAll,
}: UnsortedTrayProps) {
  const [collapsed, setCollapsed] = useState(false)
  if (photoIds.length === 0) return null

  return (
    <section className="chapter unsorted">
      <header className="chapter-head">
        <button
          className="btn ghost icon sm chapter-collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className={'chevron' + (collapsed ? ' collapsed' : '')}>
            <ChevronDown size={18} />
          </span>
        </button>
        <span className="unsorted-icon" aria-hidden>
          <Inbox size={18} />
        </span>
        <span className="chapter-title unsorted-title">Unsorted</span>
        <span className="chapter-count">{photoIds.length}</span>
        <div className="chapter-actions">
          <button className="btn sm ghost" onClick={() => onSelectAll(photoIds)}>
            Select all
          </button>
        </div>
      </header>

      {hasChapters && !collapsed && (
        <p className="info-strip">
          <Info size={16} />
          <span>
            Select photos and move them into a chapter. Unsorted photos are{' '}
            <strong>not included</strong> in the export.
          </span>
        </p>
      )}

      {!collapsed && (
        <PhotoGrid
          containerId={UNSORTED}
          photoIds={photoIds}
          photosById={photosById}
          columns={columns}
          selected={selected}
          selectionActive={selectionActive}
          onToggleSelect={onToggleSelect}
          onOpen={onOpen}
          isUnsorted
        />
      )}
    </section>
  )
}
