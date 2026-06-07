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
import { useBoard } from './hooks/useBoard'
import { useDurableStorage } from './hooks/useDurableStorage'
import { useThumbnailQueue } from './hooks/useThumbnailQueue'
import { useStorageEstimate } from './hooks/useStorageEstimate'
import { useSelection } from './hooks/useSelection'
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

  const [lightbox, setLightbox] = useState<{ ids: string[]; index: number } | null>(null)
  const [busy, setBusy] = useState<Busy | null>(null)
  const [quotaError, setQuotaError] = useState(false)
  const [exportPlan, setExportPlan] = useState<ExportPlan | null>(null)
  const [showNag, setShowNag] = useState(false)
  const naggedRef = useRef(false)

  useEffect(() => {
    ensureMeta()
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
      !confirm(
        'Importing a backup will REPLACE the current project on this device. Continue?',
      )
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

  // ---- render ----
  if (!board || !meta) {
    return (
      <main className="app-loading">
        <span className="spinner big" />
      </main>
    )
  }

  const chapters = board.chapterOrder
    .map((id) => board.chaptersById[id])
    .filter(Boolean)
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
      <TopBar
        projectTitle={board.projectTitle}
        totalPhotos={board.totalPhotos}
        exportableCount={exportableCount}
        est={storage}
        persisted={durable.persisted}
        canInstall={durable.canInstall}
        onRenameProject={renameProject}
        onImport={handleImport}
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
          selectedIds={selection.selected}
          selectionCount={selection.count}
          onToggleSelect={handleToggleSelect}
          onOpen={(id, ids) => setLightbox({ ids, index: ids.indexOf(id) })}
          onSelectAll={selection.setOnly}
          onRenameChapter={(id, t) => void renameChapter(id, t)}
          onDeleteChapter={(id) => void deleteChapter(id)}
          onMoveChapter={handleMoveChapter}
          onMoveSelectedHere={(cid) => void handleMoveSelectedHere(cid)}
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
