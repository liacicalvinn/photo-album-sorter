import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PhotoGrid } from './PhotoGrid'
import { Menu, MenuItem, MenuSep } from './Menu'
import {
  Grip,
  ChevronDown,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Trash,
  Check,
} from './icons/Icons'
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
  pageBase: number
  showGlobalPage: boolean
  onToggleSelect: (id: string, shiftKey: boolean, orderedIds: string[]) => void
  onOpen: (id: string, orderedIds: string[]) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onMoveSelectedHere: (chapterId: string) => void
  onMoveChapter: (id: string, dir: -1 | 1) => void
  onSelectAll: (orderedIds: string[]) => void
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
  pageBase,
  showGlobalPage,
  onToggleSelect,
  onOpen,
  onRename,
  onDelete,
  onMoveSelectedHere,
  onMoveChapter,
  onSelectAll,
  canMoveUp,
  canMoveDown,
}: ChapterSectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(chapter.title)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: 'chapter:' + chapter.id })

  const commit = () => {
    setEditing(false)
    if (draft.trim() && draft !== chapter.title) onRename(chapter.id, draft)
    else setDraft(chapter.title)
  }

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={'chapter' + (isDragging ? ' dragging' : '')}
    >
      <header className="chapter-head">
        <button
          className="chapter-grip"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${chapter.title}`}
          title="Drag to reorder chapter"
        >
          <Grip size={16} />
        </button>

        <button
          className="btn ghost icon sm chapter-collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand chapter' : 'Collapse chapter'}
        >
          <span className={'chevron' + (collapsed ? ' collapsed' : '')}>
            <ChevronDown size={18} />
          </span>
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

          <Menu
            align="right"
            trigger={({ toggle }) => (
              <button
                className="btn ghost icon sm"
                onClick={toggle}
                aria-label="Chapter options"
                title="Chapter options"
              >
                <MoreHorizontal size={18} />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon={<ArrowUp size={16} />}
                  disabled={!canMoveUp}
                  onClick={() => {
                    close()
                    onMoveChapter(chapter.id, -1)
                  }}
                >
                  Move up
                </MenuItem>
                <MenuItem
                  icon={<ArrowDown size={16} />}
                  disabled={!canMoveDown}
                  onClick={() => {
                    close()
                    onMoveChapter(chapter.id, 1)
                  }}
                >
                  Move down
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    close()
                    setDraft(chapter.title)
                    setEditing(true)
                  }}
                >
                  Rename…
                </MenuItem>
                <MenuItem
                  icon={<Check size={16} />}
                  disabled={photoIds.length === 0}
                  onClick={() => {
                    close()
                    onSelectAll(photoIds)
                  }}
                >
                  Select all in chapter
                </MenuItem>
                <MenuSep />
                <MenuItem
                  icon={<Trash size={16} />}
                  danger
                  onClick={() => {
                    close()
                    if (
                      confirm(
                        `Delete “${chapter.title}”?\nIts ${photoIds.length} photo(s) will move back to Unsorted (not deleted).`,
                      )
                    ) {
                      onDelete(chapter.id)
                    }
                  }}
                >
                  Delete chapter
                </MenuItem>
              </>
            )}
          </Menu>
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
          pageBase={pageBase}
          showGlobalPage={showGlobalPage}
        />
      )}
    </section>
  )
}
