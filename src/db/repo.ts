import Dexie from 'dexie'
import { db, ensureMeta, getMeta, patchMeta } from './db'
import { UNSORTED, type Chapter, type ChapterId, type Photo, type PhotoId } from './types'
import { newId } from '../lib/ids'
import { chronoCompare } from '../lib/order'
import { isAcceptedFile, normalizedMime } from '../lib/fileTypes'
import { readExifDate } from '../lib/exif'

const now = () => Date.now()

export class QuotaError extends Error {
  constructor() {
    super('Storage quota exceeded')
    this.name = 'QuotaError'
  }
}
function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.code === 22)
  )
}

// ---------- queries ----------
/** Photos in a container, already ordered by `order` (uses compound index). */
export async function photosInContainer(containerId: string): Promise<Photo[]> {
  return db.photos
    .where('[chapterId+order]')
    .between([containerId, Dexie.minKey], [containerId, Dexie.maxKey])
    .toArray()
}

async function nextOrder(containerId: string): Promise<number> {
  const arr = await photosInContainer(containerId)
  return arr.length ? arr[arr.length - 1].order + 1 : 0
}

export async function getOriginalBlob(photoId: PhotoId): Promise<Blob | undefined> {
  return (await db.originals.get(photoId))?.blob
}
export async function getThumbBlob(photoId: PhotoId): Promise<Blob | undefined> {
  return (await db.thumbs.get(photoId))?.blob
}

// ---------- import ----------
export interface ImportResult {
  importedIds: PhotoId[]
  quotaExceeded: boolean
  skipped: number
}

export async function importPhotos(
  files: File[],
  onProgress?: (done: number, total: number, phase: 'reading' | 'saving') => void,
): Promise<ImportResult> {
  await ensureMeta()
  const accepted = files.filter(isAcceptedFile)
  const skipped = files.length - accepted.length
  if (!accepted.length) return { importedIds: [], quotaExceeded: false, skipped }

  // Phase 1: read EXIF dates (cheap header parse) so we can place chronologically.
  const entries: { file: File; exifDate?: number; id: PhotoId }[] = []
  for (let i = 0; i < accepted.length; i++) {
    const file = accepted[i]
    const exifDate = await readExifDate(file)
    entries.push({ file, exifDate, id: newId() })
    onProgress?.(i + 1, accepted.length, 'reading')
  }

  // Default chronological order for the newly added batch.
  entries.sort((a, b) =>
    chronoCompare(
      { exifDate: a.exifDate, name: a.file.name, importedAt: 0 } as Photo,
      { exifDate: b.exifDate, name: b.file.name, importedAt: 0 } as Photo,
    ),
  )

  // Phase 2: persist. Per-file transactions so a mid-batch quota error keeps
  // everything already written intact.
  let order = await nextOrder(UNSORTED)
  const importedIds: PhotoId[] = []
  let quotaExceeded = false
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    const photo: Photo = {
      id: e.id,
      chapterId: UNSORTED,
      order: order,
      name: e.file.name,
      type: normalizedMime(e.file),
      size: e.file.size,
      exifDate: e.exifDate,
      importedAt: now(),
    }
    try {
      await db.transaction('rw', db.photos, db.originals, async () => {
        await db.photos.add(photo)
        await db.originals.add({ photoId: e.id, blob: e.file })
      })
      importedIds.push(e.id)
      order++
      onProgress?.(i + 1, entries.length, 'saving')
    } catch (err) {
      if (isQuotaError(err)) {
        quotaExceeded = true
        break
      }
      throw err
    }
  }
  return { importedIds, quotaExceeded, skipped }
}

// ---------- chapters ----------
export async function addChapter(title?: string): Promise<ChapterId> {
  const id = newId()
  // Read-modify-write of chapterOrder happens INSIDE the transaction so rapid
  // double-clicks serialize instead of racing (which would orphan a chapter).
  await db.transaction('rw', db.chapters, db.meta, async () => {
    const meta = await getMeta()
    const chapter: Chapter = {
      id,
      title: title?.trim() || `Chapter ${meta.chapterOrder.length + 1}`,
      createdAt: now(),
    }
    await db.chapters.add(chapter)
    await patchMeta({ chapterOrder: [...meta.chapterOrder, id] })
  })
  return id
}

export async function renameChapter(id: ChapterId, title: string): Promise<void> {
  await db.chapters.update(id, { title: title.trim() || 'Untitled' })
}

export async function renameProject(title: string): Promise<void> {
  await patchMeta({ projectTitle: title.trim() || 'My Photobook' })
}

export async function reorderChapters(newOrder: ChapterId[]): Promise<void> {
  await patchMeta({ chapterOrder: newOrder })
}

/** Delete a chapter; its photos move (non-destructively) to the Unsorted tray. */
export async function deleteChapter(id: ChapterId): Promise<void> {
  await db.transaction('rw', db.photos, db.chapters, db.meta, async () => {
    const meta = await getMeta()
    const photos = await photosInContainer(id)
    let base = await nextOrder(UNSORTED)
    const moved: Photo[] = photos.map((p) => ({
      ...p,
      chapterId: UNSORTED,
      order: base++,
    }))
    if (moved.length) await db.photos.bulkPut(moved)
    await db.chapters.delete(id)
    await patchMeta({ chapterOrder: meta.chapterOrder.filter((c) => c !== id) })
  })
}

// ---------- ordering / moves ----------
/**
 * Generic persistence for any set of containers given their desired id order.
 * Writes ONLY the rows whose chapterId/order actually changed. Used by both
 * drag-and-drop and the move-to-chapter menu.
 */
export async function persistOrder(
  updates: { containerId: string; orderedIds: string[] }[],
): Promise<void> {
  const allIds = updates.flatMap((u) => u.orderedIds)
  if (!allIds.length) return
  const rows = await db.photos.bulkGet(allIds)
  const map = new Map<string, Photo>()
  rows.forEach((p) => p && map.set(p.id, p))
  const changed: Photo[] = []
  for (const u of updates) {
    u.orderedIds.forEach((id, i) => {
      const p = map.get(id)
      if (!p) return
      if (p.chapterId !== u.containerId || p.order !== i) {
        changed.push({ ...p, chapterId: u.containerId, order: i })
      }
    })
  }
  if (changed.length) await db.photos.bulkPut(changed)
}

async function reindexContainer(containerId: string): Promise<void> {
  const arr = await photosInContainer(containerId)
  const changed = arr
    .map((p, i) => (p.order !== i ? { ...p, order: i } : null))
    .filter(Boolean) as Photo[]
  if (changed.length) await db.photos.bulkPut(changed)
}

/** Move photos into a container, appended at the end in chronological order. */
export async function moveToChapter(
  photoIds: PhotoId[],
  target: string,
): Promise<void> {
  const set = new Set(photoIds)
  const moving = ((await db.photos.bulkGet([...set])).filter(Boolean) as Photo[]).sort(
    chronoCompare,
  )
  if (!moving.length) return
  const targetCurrent = (await photosInContainer(target)).filter((p) => !set.has(p.id))
  const targetIds = [...targetCurrent.map((p) => p.id), ...moving.map((p) => p.id)]
  const updates: { containerId: string; orderedIds: string[] }[] = [
    { containerId: target, orderedIds: targetIds },
  ]
  const sources = new Set(moving.map((p) => p.chapterId))
  sources.delete(target)
  for (const src of sources) {
    const remaining = (await photosInContainer(src))
      .filter((p) => !set.has(p.id))
      .map((p) => p.id)
    updates.push({ containerId: src, orderedIds: remaining })
  }
  await persistOrder(updates)
}

export async function newChapterFromSelection(
  photoIds: PhotoId[],
  title?: string,
): Promise<ChapterId> {
  const id = await addChapter(title)
  await moveToChapter(photoIds, id)
  return id
}

export async function deletePhotos(ids: PhotoId[]): Promise<void> {
  const set = new Set(ids)
  const photos = (await db.photos.bulkGet([...set])).filter(Boolean) as Photo[]
  const containers = new Set(photos.map((p) => p.chapterId))
  await db.transaction('rw', db.photos, db.originals, db.thumbs, async () => {
    await db.photos.bulkDelete([...set])
    await db.originals.bulkDelete([...set])
    await db.thumbs.bulkDelete([...set])
  })
  for (const c of containers) await reindexContainer(c)
}

// ---------- thumbnails ----------
export async function setThumb(
  photoId: PhotoId,
  blob: Blob,
  dims?: { width: number; height: number },
): Promise<void> {
  await db.transaction('rw', db.thumbs, db.photos, async () => {
    await db.thumbs.put({ photoId, blob })
    if (dims) await db.photos.update(photoId, { width: dims.width, height: dims.height })
  })
}

/** Photo ids that still need a thumbnail generated. */
export async function getMissingThumbPhotoIds(): Promise<PhotoId[]> {
  const [photoIds, thumbKeys] = await Promise.all([
    db.photos.toCollection().primaryKeys() as Promise<PhotoId[]>,
    db.thumbs.toCollection().primaryKeys() as Promise<PhotoId[]>,
  ])
  const have = new Set(thumbKeys)
  return photoIds.filter((id) => !have.has(id))
}

// ---------- export query ----------
export interface ExportPlan {
  projectTitle: string
  chapters: { chapter: Chapter; photos: Photo[] }[]
  unsorted: Photo[]
  totalIncluded: number
}

export async function getOrderedForExport(): Promise<ExportPlan> {
  const meta = await getMeta()
  const chapterRows = await db.chapters.bulkGet(meta.chapterOrder)
  const chapters: { chapter: Chapter; photos: Photo[] }[] = []
  let totalIncluded = 0
  for (let i = 0; i < meta.chapterOrder.length; i++) {
    const chapter = chapterRows[i]
    if (!chapter) continue
    const photos = await photosInContainer(chapter.id)
    totalIncluded += photos.length
    chapters.push({ chapter, photos })
  }
  const unsorted = await photosInContainer(UNSORTED)
  return { projectTitle: meta.projectTitle, chapters, unsorted, totalIncluded }
}

// ---------- backup bookkeeping ----------
export async function markBackup(photoCount: number): Promise<void> {
  await patchMeta({ lastBackupAt: now(), lastBackupPhotoCount: photoCount })
}
