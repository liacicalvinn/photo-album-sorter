import { useEffect, useRef, useState } from 'react'
import { StorageMeter } from './StorageMeter'
import { ACCEPT_ATTR } from '../lib/fileTypes'
import type { StorageEstimate } from '../hooks/useStorageEstimate'

export interface TopBarProps {
  projectTitle: string
  totalPhotos: number
  exportableCount: number
  est: StorageEstimate | null
  persisted: boolean
  canInstall: boolean
  onRenameProject: (t: string) => void
  onImport: (files: File[]) => void
  onAddChapter: () => void
  onExportZip: () => void
  onExportBundle: () => void
  onImportBundle: (file: File) => void
  onInstall: () => void
}

export function TopBar(props: TopBarProps) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const bundleRef = useRef<HTMLInputElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(props.projectTitle)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setDraft(props.projectTitle), [props.projectTitle])
  useEffect(() => {
    if (!menu) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menu])

  const commit = () => {
    setEditing(false)
    if (draft.trim()) props.onRenameProject(draft)
    else setDraft(props.projectTitle)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="brand" aria-hidden>
          📚
        </span>
        {editing ? (
          <input
            className="project-title-input"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(props.projectTitle)
                setEditing(false)
              }
            }}
          />
        ) : (
          <button className="project-title" onClick={() => setEditing(true)} title="Rename project">
            {props.projectTitle}
          </button>
        )}
      </div>

      <div className="topbar-right">
        <StorageMeter est={props.est} persisted={props.persisted} />

        {props.canInstall && (
          <button className="btn sm" onClick={props.onInstall} title="Install app">
            ⤓ Install
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length) props.onImport(files)
          }}
        />
        <button className="btn primary" onClick={() => fileRef.current?.click()}>
          ＋ Add photos
        </button>

        <button className="btn" onClick={props.onAddChapter}>
          ＋ Chapter
        </button>

        <button
          className="btn"
          disabled={props.exportableCount === 0}
          onClick={props.onExportZip}
          title="Export the final sorted ZIP"
        >
          ⤓ Export ZIP
        </button>

        <div className="move-menu-wrap" ref={menuRef}>
          <button className="btn ghost icon" onClick={() => setMenu((m) => !m)} aria-label="Backup menu" title="Backup / restore">
            ⋯
          </button>
          {menu && (
            <div className="move-menu right" role="menu">
              <button
                className="move-menu-item"
                disabled={props.totalPhotos === 0}
                onClick={() => {
                  setMenu(false)
                  props.onExportBundle()
                }}
              >
                💾 Export project backup…
              </button>
              <input
                ref={bundleRef}
                type="file"
                accept=".zip,application/zip"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) props.onImportBundle(f)
                }}
              />
              <button
                className="move-menu-item"
                onClick={() => {
                  setMenu(false)
                  bundleRef.current?.click()
                }}
              >
                📂 Import project backup…
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
