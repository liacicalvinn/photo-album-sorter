import { db, getMeta } from './db'
import { UNSORTED, type BoardState, type Chapter, type ChapterId, type Photo, type PhotoId } from './types'

/**
 * Build the in-memory BoardState from metadata-only rows. Reads `meta`,
 * `chapters` and `photos` (NOT originals/thumbs), so this stays cheap even
 * with thousands of photos and is safe to run inside a Dexie liveQuery.
 */
export async function loadBoardState(): Promise<BoardState> {
  const [meta, chapters, photos] = await Promise.all([
    getMeta(),
    db.chapters.toArray(),
    db.photos.toArray(),
  ])

  const chaptersById: Record<ChapterId, Chapter> = {}
  chapters.forEach((c) => (chaptersById[c.id] = c))

  const photosById: Record<PhotoId, Photo> = {}
  const buckets: Record<string, Photo[]> = {}
  const unsorted: Photo[] = []
  for (const p of photos) {
    photosById[p.id] = p
    if (p.chapterId === UNSORTED) unsorted.push(p)
    else (buckets[p.chapterId] ||= []).push(p)
  }

  const byOrder = (a: Photo, b: Photo) => a.order - b.order
  unsorted.sort(byOrder)

  const photosByChapter: Record<ChapterId, PhotoId[]> = {}
  for (const id of meta.chapterOrder) {
    const list = (buckets[id] ?? []).sort(byOrder)
    photosByChapter[id] = list.map((p) => p.id)
  }

  return {
    projectTitle: meta.projectTitle,
    chapterOrder: meta.chapterOrder.filter((id) => chaptersById[id]),
    chaptersById,
    photosByChapter,
    unsorted: unsorted.map((p) => p.id),
    photosById,
    totalPhotos: photos.length,
  }
}
