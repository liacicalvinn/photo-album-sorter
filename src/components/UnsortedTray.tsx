import { useState } from 'react'
import { PhotoGrid } from './PhotoGrid'
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
          className="btn ghost icon chapter-collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className={'chevron' + (collapsed ? ' collapsed' : '')}>▾</span>
        </button>
        <span className="chapter-title unsorted-title">📥 Unsorted</span>
        <span className="chapter-count">{photoIds.length}</span>
        <div className="chapter-actions">
          <button className="btn sm ghost" onClick={() => onSelectAll(photoIds)}>
            Select all
          </button>
        </div>
      </header>

      {hasChapters && !collapsed && (
        <p className="unsorted-hint">
          Select photos below, then use the bar at the bottom to move them into a chapter.
          Unsorted photos are <strong>excluded</strong> from the final export.
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
        />
      )}
    </section>
  )
}
