import { useEffect, useRef, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  if (count === 0) return null
  const byId = new Map(chapters.map((c) => [c.id, c]))
  const ordered = chapterOrder.map((id) => byId.get(id)).filter(Boolean) as Chapter[]

  return (
    <div className="selection-bar" role="region" aria-label="Selection actions">
      <span className="sel-count">{count} selected</span>

      <div className="sel-actions">
        <div className="move-menu-wrap" ref={ref}>
          <button className="btn primary" onClick={() => setMenuOpen((o) => !o)}>
            Move to chapter ▾
          </button>
          {menuOpen && (
            <div className="move-menu" role="menu">
              <button
                className="move-menu-item new"
                onClick={() => {
                  setMenuOpen(false)
                  onNewChapter()
                }}
              >
                ＋ New chapter from selection
              </button>
              {ordered.length > 0 && <div className="move-menu-sep" />}
              {ordered.map((c, i) => (
                <button
                  key={c.id}
                  className="move-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onMoveTo(c.id)
                  }}
                >
                  <span className="move-menu-num">{i + 1}</span>
                  {c.title}
                </button>
              ))}
              {ordered.length === 0 && (
                <div className="move-menu-empty">No chapters yet</div>
              )}
            </div>
          )}
        </div>

        <button
          className="btn danger"
          onClick={() => {
            if (confirm(`Delete ${count} photo(s)? This cannot be undone.`)) onDelete()
          }}
        >
          Delete
        </button>
        <button className="btn ghost" onClick={onClear}>
          Deselect
        </button>
      </div>
    </div>
  )
}
