import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ensureMeta, getMeta, patchMeta } from './db/db'
import {
  addChapter,
  deleteChapter,
  deletePhotos,
  importPhotos,
  moveToChapter,
  newChapterFromSelection,
  renameChapter,
  renameProject,
  reorderChapters,
} from './db/repo'
import type { ExportPlan } from './db/repo'
import { arrayMove } from './lib/order'
import { ACCEPT_ATTR } from './lib/fileTypes'
import { useBoard } from './hooks/useBoard'
import { useDurableStorage } from './hooks/useDurableStorage'
import { useThumbnailQueue } from './hooks/useThumbnailQueue'
import { useStorageEstimate } from './hooks/useStorageEstimate'
import { useSelection } from './hooks/useSelection'
import { useTheme } from './hooks/useTheme'
import { useGridDensity } from './hooks/useGridDensity'
import { useFileDrop } from './hooks/useFileDrop'
import { buildExportPlan, exportNumberedZip } from './export/numberedZip'
import { exportProjectBundle } from './export/projectBundle'
import { importProjectBundle } from './export/importBundle'
import { TopBar } from './components/TopBar'
import { PhotobookBoard } from './components/PhotobookBoard'
import { SelectionBar } from './components/SelectionBar'
import { Lightbox } from './components/Lightbox'
import { DurabilityBanner } from './components/DurabilityBanner'
import { StatusPill } from './components/StatusPill'
import { ProgressOverlay } from './components/ProgressOverlay'
import { ImageIcon } from './components/icons/Icons'
import { FirstRunModal } from './components/modals/FirstRunModal'
import { QuotaErrorModal } from './components/modals/QuotaErrorModal'
import { BackupNagModal } from './components/modals/BackupNagModal'
import { ExportConfirmModal } from './components/modals/ExportConfirmModal'

interface Busy {
  label: string
  done: number
  total: number
}

export default function App() {
  const board = useBoard()
  const meta = useLiveQuery(getMeta, [])
  const durable = useDurableStorage()
  const thumbProgress = useThumbnailQueue()
  const storage = useStorageEstimate(board?.totalPhotos)
  const selection = useSelection()
  const theme = useTheme()
  const grid = useGridDensity()

  const [lightbox, setLightbox] = useState<{ ids: string[]; index: number } | null>(null)
  const [busy, setBusy] = useState<Busy | null>(null)
  const [quotaError, setQuotaError] = useState(false)
  const [exportPlan, setExportPlan] = useState<ExportPlan | null>(null)
  const [showNag, setShowNag] = useState(false)
  const naggedRef = useRef(false)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    ensureMeta()
  }, [])

  // dev-only seeding helper for manual/automated verification (stripped in prod)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__seed = async (n = 12) => {
      const files: File[] = []
      for (let i = 1; i <= n; i++) {
        const c = document.createElement('canvas')
        c.width = c.height = 400
        const ctx = c.getContext('2d')!
        ctx.fillStyle = `hsl(${(i * 53) % 360} 62% 55%)`
        ctx.fillRect(0, 0, 400, 400)
        ctx.fillStyle = 'rgba(255,255,255,.95)'
        ctx.font = 'bold 190px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(i), 200, 212)
        const blob: Blob = await new Promise((res) =>
          c.toBlob((b) => res(b!), 'image/jpeg', 0.9),
        )
        files.push(new File([blob], `photo-${String(i).padStart(2, '0')}.jpg`, { type: 'image/jpeg' }))
      }
      const { importedIds } = await importPhotos(files)
      const chapterIds: string[] = []
      for (let i = 0; i < 2; i++) chapterIds.push(await addChapter())
      // leave the first 3 in Unsorted; round-robin the rest into chapters
      const rest = importedIds.slice(3)
      const buckets: Record<string, string[]> = { [chapterIds[0]]: [], [chapterIds[1]]: [] }
      rest.forEach((id, i) => buckets[chapterIds[i % 2]].push(id))
      for (const c of chapterIds) if (buckets[c].length) await moveToChapter(buckets[c], c)
      return `seeded ${n} photos into 2 chapters (3 unsorted)`
    }
  }, [])

  // backup reminder (once per session)
  useEffect(() => {
    if (naggedRef.current || !meta || !board) return
    if (!meta.onboarded || board.totalPhotos < 8) return
    const days =
      meta.lastBackupAt != null
        ? Math.floor((Date.now() - meta.lastBackupAt) / 86_400_000)
        : null
    const grew =
      meta.lastBackupPhotoCount != null &&
      board.totalPhotos - meta.lastBackupPhotoCount >= 25
    const stale = meta.lastBackupAt == null || (days != null && days >= 7) || grew
    if (stale) {
      naggedRef.current = true
      setShowNag(true)
    }
  }, [meta, board])

  // ---- handlers ----
  const openPhotoPicker = () => photoInputRef.current?.click()

  const handleImport = async (files: File[]) => {
    void durable.requestPersist() // first user gesture → persistent storage
    setBusy({ label: 'Reading photos…', done: 0, total: files.length })
    try {
      const res = await importPhotos(files, (done, total, phase) =>
        setBusy({
          label: phase === 'reading' ? 'Reading photo dates…' : 'Saving photos…',
          done,
          total,
        }),
      )
      if (res.quotaExceeded) setQuotaError(true)
    } finally {
      setBusy(null)
    }
  }

  const handleMoveChapter = (id: string, dir: -1 | 1) => {
    if (!board) return
    const order = board.chapterOrder
    const i = order.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    void reorderChapters(arrayMove(order, i, j))
  }

  const handleToggleSelect = (id: string, shiftKey: boolean, orderedIds: string[]) => {
    if (shiftKey) selection.selectRange(id, orderedIds)
    else selection.toggle(id)
  }

  const handleMoveSelectedHere = async (chapterId: string) => {
    await moveToChapter([...selection.selected], chapterId)
    selection.clear()
  }
  const handleNewChapterFromSelection = async () => {
    await newChapterFromSelection([...selection.selected])
    selection.clear()
  }
  const handleDeleteSelected = async () => {
    await deletePhotos([...selection.selected])
    selection.clear()
  }

  const handleExportZip = async () => {
    const plan = await buildExportPlan()
    setExportPlan(plan)
  }
  const confirmExport = async () => {
    const plan = exportPlan
    setExportPlan(null)
    if (!plan) return
    setBusy({ label: 'Building ZIP…', done: 0, total: plan.totalIncluded })
    try {
      await exportNumberedZip(plan, (p) =>
        setBusy({ label: 'Building ZIP…', done: p.done, total: p.total }),
      )
    } finally {
      setBusy(null)
    }
  }

  const handleExportBundle = async () => {
    if (!board) return
    setBusy({ label: 'Creating backup…', done: 0, total: board.totalPhotos })
    try {
      await exportProjectBundle((p) =>
        setBusy({ label: 'Creating backup…', done: p.done, total: p.total }),
      )
    } finally {
      setBusy(null)
    }
  }

  const handleImportBundle = async (file: File) => {
    if (
      !confirm('Importing a backup will REPLACE the current project on this device. Continue?')
    )
      return
    setBusy({ label: 'Restoring backup…', done: 0, total: 0 })
    try {
      void durable.requestPersist()
      await importProjectBundle(file)
      selection.clear()
    } catch (err) {
      alert(`Could not import backup: ${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  const handleGetStarted = async () => {
    await durable.requestPersist()
    await patchMeta({ onboarded: true })
  }

  const isDraggingFile = useFileDrop(handleImport)

  // ---- render ----
  if (!board || !meta) {
    return (
      <main className="app-loading">
        <span className="spinner big" />
      </main>
    )
  }

  const chapters = board.chapterOrder.map((id) => board.chaptersById[id]).filter(Boolean)
  const exportableCount = board.chapterOrder.reduce(
    (n, id) => n + (board.photosByChapter[id]?.length ?? 0),
    0,
  )
  const nagDays =
    meta.lastBackupAt != null
      ? Math.floor((Date.now() - meta.lastBackupAt) / 86_400_000)
      : null

  return (
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) void handleImport(files)
        }}
      />

      <TopBar
        projectTitle={board.projectTitle}
        totalPhotos={board.totalPhotos}
        exportableCount={exportableCount}
        est={storage}
        persisted={durable.persisted}
        canInstall={durable.canInstall}
        theme={theme.theme}
        density={grid.density}
        onSetTheme={theme.setTheme}
        onCycleTheme={theme.cycle}
        onSetDensity={grid.setDensity}
        onRenameProject={renameProject}
        onAddPhotos={openPhotoPicker}
        onAddChapter={() => void addChapter()}
        onExportZip={handleExportZip}
        onExportBundle={handleExportBundle}
        onImportBundle={handleImportBundle}
        onInstall={() => void durable.promptInstall()}
      />

      <DurabilityBanner
        show={!durable.standalone && board.totalPhotos > 0}
        ios={durable.ios}
        canInstall={durable.canInstall}
        onInstall={() => void durable.promptInstall()}
      />

      <main className="app-main">
        <PhotobookBoard
          board={board}
          tileTarget={grid.tileTarget}
          selectedIds={selection.selected}
          selectionCount={selection.count}
          onToggleSelect={handleToggleSelect}
          onOpen={(id, ids) => setLightbox({ ids, index: ids.indexOf(id) })}
          onSelectAll={selection.setOnly}
          onRenameChapter={(id, t) => void renameChapter(id, t)}
          onDeleteChapter={(id) => void deleteChapter(id)}
          onMoveChapter={handleMoveChapter}
          onReorderChapters={(order) => void reorderChapters(order)}
          onMoveSelectedHere={(cid) => void handleMoveSelectedHere(cid)}
          onAddPhotos={openPhotoPicker}
        />
      </main>

      <SelectionBar
        count={selection.count}
        chapters={chapters}
        chapterOrder={board.chapterOrder}
        onMoveTo={(cid) => void handleMoveSelectedHere(cid)}
        onNewChapter={() => void handleNewChapterFromSelection()}
        onDelete={() => void handleDeleteSelected()}
        onClear={selection.clear}
      />

      {thumbProgress && (
        <StatusPill>
          Generating previews {thumbProgress.done}/{thumbProgress.total}
        </StatusPill>
      )}

      {isDraggingFile && (
        <div className="file-drop-overlay">
          <div className="file-drop-card">
            <ImageIcon size={44} />
            <strong>Drop photos to import</strong>
            <span>JPEG or PNG</span>
          </div>
        </div>
      )}

      {lightbox && (
        <Lightbox
          photoIds={lightbox.ids}
          index={lightbox.index}
          photosById={board.photosById}
          onIndex={(i) => setLightbox((lb) => (lb ? { ...lb, index: i } : lb))}
          onClose={() => setLightbox(null)}
        />
      )}

      {busy && (
        <ProgressOverlay
          title={busy.label}
          label={busy.total ? `${busy.done} / ${busy.total}` : 'Please wait…'}
          value={busy.done}
          max={busy.total}
        />
      )}

      {exportPlan && (
        <ExportConfirmModal
          plan={exportPlan}
          onConfirm={() => void confirmExport()}
          onCancel={() => setExportPlan(null)}
        />
      )}

      {quotaError && (
        <QuotaErrorModal
          onExportBundle={() => void handleExportBundle()}
          onClose={() => setQuotaError(false)}
        />
      )}

      {showNag && (
        <BackupNagModal
          photoCount={board.totalPhotos}
          daysSince={nagDays}
          onBackupNow={() => void handleExportBundle()}
          onDismiss={() => setShowNag(false)}
        />
      )}

      {!meta.onboarded && (
        <FirstRunModal
          ios={durable.ios}
          standalone={durable.standalone}
          onGetStarted={() => void handleGetStarted()}
        />
      )}
    </>
  )
}
