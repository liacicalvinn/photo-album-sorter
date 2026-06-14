import { Menu, MenuItem, MenuSep } from './Menu'
import { FolderPlus, Plus, Trash, X, ChevronDown } from './icons/Icons'
import type { Chapter, ChapterId } from '../db/types'

export interface SelectionBarProps {
  count: number
  chapters: Chapter[]
  chapterOrder: ChapterId[]
  onMoveTo: (chapterId: string) => void
  onNewChapter: () => void
  onDelete: () => void
  onClear: () => void
}

export function SelectionBar({
  count,
  chapters,
  chapterOrder,
  onMoveTo,
  onNewChapter,
  onDelete,
  onClear,
}: SelectionBarProps) {
  if (count === 0) return null
  const byId = new Map(chapters.map((c) => [c.id, c]))
  const ordered = chapterOrder.map((id) => byId.get(id)).filter(Boolean) as Chapter[]

  return (
    <div className="selection-bar" role="region" aria-label="Selection actions">
      <span className="sel-count">
        <strong>{count}</strong> selected
      </span>

      <div className="sel-actions">
        <Menu
          align="left"
          up
          trigger={({ toggle }) => (
            <button className="btn primary" onClick={toggle}>
              <FolderPlus size={17} />
              <span>Move to chapter</span>
              <ChevronDown size={15} />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                icon={<Plus size={16} />}
                onClick={() => {
                  close()
                  onNewChapter()
                }}
              >
                New chapter from selection
              </MenuItem>
              {ordered.length > 0 && <MenuSep />}
              {ordered.map((c, i) => (
                <MenuItem
                  key={c.id}
                  icon={<span className="menu-num">{i + 1}</span>}
                  onClick={() => {
                    close()
                    onMoveTo(c.id)
                  }}
                >
                  {c.title}
                </MenuItem>
              ))}
              {ordered.length === 0 && <div className="menu-empty">No chapters yet</div>}
            </>
          )}
        </Menu>

        <button
          className="btn ghost danger"
          onClick={() => {
            if (confirm(`Delete ${count} photo(s)? This cannot be undone.`)) onDelete()
          }}
        >
          <Trash size={17} />
          <span className="btn-text">Delete</span>
        </button>
        <button className="btn ghost icon" onClick={onClear} aria-label="Clear selection" title="Deselect">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
