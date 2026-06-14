import { useEffect, useRef, useState } from 'react'
import { StorageMeter } from './StorageMeter'
import { Menu, MenuItem, MenuSep, MenuLabel } from './Menu'
import {
  Book,
  Plus,
  FolderPlus,
  Download,
  Save,
  FolderOpen,
  MoreHorizontal,
  Install,
  Sun,
  Moon,
  Monitor,
  Check,
} from './icons/Icons'
import type { StorageEstimate } from '../hooks/useStorageEstimate'
import type { Theme } from '../hooks/useTheme'
import type { Density } from '../hooks/useGridDensity'

export interface TopBarProps {
  projectTitle: string
  totalPhotos: number
  exportableCount: number
  est: StorageEstimate | null
  persisted: boolean
  canInstall: boolean
  theme: Theme
  density: Density
  onSetTheme: (t: Theme) => void
  onCycleTheme: () => void
  onSetDensity: (d: Density) => void
  onRenameProject: (t: string) => void
  onAddPhotos: () => void
  onAddChapter: () => void
  onExportZip: () => void
  onExportBundle: () => void
  onImportBundle: (file: File) => void
  onInstall: () => void
}

export function TopBar(props: TopBarProps) {
  const bundleRef = useRef<HTMLInputElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(props.projectTitle)

  useEffect(() => setDraft(props.projectTitle), [props.projectTitle])

  const commit = () => {
    setEditing(false)
    if (draft.trim()) props.onRenameProject(draft)
    else setDraft(props.projectTitle)
  }

  const ThemeIcon = props.theme === 'light' ? Sun : props.theme === 'dark' ? Moon : Monitor

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="brand" aria-hidden>
          <Book size={20} />
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
        {props.totalPhotos > 0 && (
          <span className="topbar-meta">
            {props.totalPhotos} {props.totalPhotos === 1 ? 'photo' : 'photos'}
          </span>
        )}
      </div>

      <div className="topbar-right">
        <StorageMeter est={props.est} persisted={props.persisted} />

        <div className="segmented" role="group" aria-label="Thumbnail size">
          {(['S', 'M', 'L'] as Density[]).map((d) => (
            <button
              key={d}
              className={'seg' + (props.density === d ? ' on' : '')}
              aria-pressed={props.density === d}
              onClick={() => props.onSetDensity(d)}
              title={d === 'S' ? 'Small thumbnails' : d === 'L' ? 'Large thumbnails' : 'Medium thumbnails'}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          className="btn ghost icon"
          onClick={props.onCycleTheme}
          aria-label={`Theme: ${props.theme}. Click to change.`}
          title={`Appearance: ${props.theme}`}
        >
          <ThemeIcon size={18} />
        </button>

        <span className="topbar-sep" aria-hidden />

        <button className="btn" onClick={props.onAddChapter}>
          <FolderPlus size={18} />
          <span className="btn-text">Chapter</span>
        </button>

        <button className="btn primary" onClick={props.onAddPhotos}>
          <Plus size={18} />
          <span>Add photos</span>
        </button>

        <button
          className="btn"
          disabled={props.exportableCount === 0}
          onClick={props.onExportZip}
          title="Export the final sorted photos as a numbered ZIP"
        >
          <Download size={18} />
          <span className="btn-text">Export ZIP</span>
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

        <Menu
          align="right"
          trigger={({ toggle }) => (
            <button className="btn ghost icon" onClick={toggle} aria-label="More options" title="More">
              <MoreHorizontal size={18} />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Appearance</MenuLabel>
              {(
                [
                  ['system', 'System', Monitor],
                  ['light', 'Light', Sun],
                  ['dark', 'Dark', Moon],
                ] as [Theme, string, typeof Sun][]
              ).map(([val, label, Icon]) => (
                <MenuItem
                  key={val}
                  icon={<Icon size={16} />}
                  onClick={() => props.onSetTheme(val)}
                >
                  <span className="menu-item-row">
                    {label}
                    {props.theme === val && <Check size={15} />}
                  </span>
                </MenuItem>
              ))}
              <MenuSep />
              {props.canInstall && (
                <MenuItem
                  icon={<Install size={16} />}
                  onClick={() => {
                    close()
                    props.onInstall()
                  }}
                >
                  Install app
                </MenuItem>
              )}
              <MenuItem
                icon={<Save size={16} />}
                disabled={props.totalPhotos === 0}
                onClick={() => {
                  close()
                  props.onExportBundle()
                }}
              >
                Export project backup…
              </MenuItem>
              <MenuItem
                icon={<FolderOpen size={16} />}
                onClick={() => {
                  close()
                  bundleRef.current?.click()
                }}
              >
                Import project backup…
              </MenuItem>
            </>
          )}
        </Menu>
      </div>
    </header>
  )
}
