import { useState } from 'react'
import { PhotoGrid } from './PhotoGrid'
import type { Chapter, Photo, PhotoId } from '../db/types'

export interface ChapterSectionProps {
  chapter: Chapter
  photoIds: PhotoId[]
  photosById: Record<PhotoId, Photo>
  index: number
  columns: number
  selected: Set<string>
  selectionActive: boolean
  selectionCount: number
  onToggleSelect: (id: string, shiftKey: boolean, orderedIds: string[]) => void
  onOpen: (id: string, orderedIds: string[]) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onMoveSelectedHere: (chapterId: string) => void
  onMoveChapter: (id: string, dir: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
}

export function ChapterSection({
  chapter,
  photoIds,
  photosById,
  index,
  columns,
  selected,
  selectionActive,
  selectionCount,
  onToggleSelect,
  onOpen,
  onRename,
  onDelete,
  onMoveSelectedHere,
  onMoveChapter,
  canMoveUp,
  canMoveDown,
}: ChapterSectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(chapter.title)

  const commit = () => {
    setEditing(false)
    if (draft.trim() && draft !== chapter.title) onRename(chapter.id, draft)
    else setDraft(chapter.title)
  }

  return (
    <section className="chapter">
      <header className="chapter-head">
        <button
          className="btn ghost icon chapter-collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand chapter' : 'Collapse chapter'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <span className={'chevron' + (collapsed ? ' collapsed' : '')}>▾</span>
        </button>

        <span className="chapter-num">{index + 1}</span>

        {editing ? (
          <input
            className="chapter-title-input"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(chapter.title)
                setEditing(false)
              }
            }}
          />
        ) : (
          <button
            className="chapter-title"
            onClick={() => {
              setDraft(chapter.title)
              setEditing(true)
            }}
            title="Rename chapter"
          >
            {chapter.title}
          </button>
        )}

        <span className="chapter-count">{photoIds.length}</span>

        <div className="chapter-actions">
          {selectionCount > 0 && (
            <button
              className="btn sm primary"
              onClick={() => onMoveSelectedHere(chapter.id)}
              title="Move selected photos into this chapter"
            >
              Move {selectionCount} here
            </button>
          )}
          <button
            className="btn ghost icon"
            disabled={!canMoveUp}
            onClick={() => onMoveChapter(chapter.id, -1)}
            aria-label="Move chapter up"
            title="Move chapter up"
          >
            ↑
          </button>
          <button
            className="btn ghost icon"
            disabled={!canMoveDown}
            onClick={() => onMoveChapter(chapter.id, 1)}
            aria-label="Move chapter down"
            title="Move chapter down"
          >
            ↓
          </button>
          <button
            className="btn ghost icon danger-hover"
            onClick={() => {
              if (
                confirm(
                  `Delete “${chapter.title}”?\nIts ${photoIds.length} photo(s) will move back to Unsorted (not deleted).`,
                )
              ) {
                onDelete(chapter.id)
              }
            }}
            aria-label="Delete chapter"
            title="Delete chapter"
          >
            🗑
          </button>
        </div>
      </header>

      {!collapsed && (
        <PhotoGrid
          containerId={chapter.id}
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
