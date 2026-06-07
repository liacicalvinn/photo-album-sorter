import Dexie, { type EntityTable } from 'dexie'
import type { Chapter, Meta, Original, Photo, Thumb } from './types'

// Dexie subclass. The schema is declarative and versioned — Dexie handles
// migrations, which avoids the #1 source of raw-IndexedDB corruption.
//
// Index notes:
//  - photos compound index [chapterId+order] returns one chapter already
//    ordered, in O(log n), without materializing arrays.
//  - originals/thumbs are keyed by photoId and hold native Blobs (no base64).
export class PhotoAlbumDB extends Dexie {
  meta!: EntityTable<Meta, 'key'>
  chapters!: EntityTable<Chapter, 'id'>
  photos!: EntityTable<Photo, 'id'>
  originals!: EntityTable<Original, 'photoId'>
  thumbs!: EntityTable<Thumb, 'photoId'>

  constructor() {
    super('photo-album-sorter')
    this.version(1).stores({
      meta: '&key',
      chapters: '&id',
      photos: '&id, chapterId, [chapterId+order], order, importedAt',
      originals: '&photoId',
      thumbs: '&photoId',
    })
  }
}

export const db = new PhotoAlbumDB()

export const SCHEMA_VERSION = 1

const DEFAULT_META: Meta = {
  key: 'app',
  schemaVersion: SCHEMA_VERSION,
  projectTitle: 'My Photobook',
  chapterOrder: [],
  lastBackupAt: null,
  lastBackupPhotoCount: null,
  persistGranted: false,
  onboarded: false,
}

/** Ensure the single meta row exists; returns it. */
export async function ensureMeta(): Promise<Meta> {
  const existing = await db.meta.get('app')
  if (existing) return existing
  await db.meta.put(DEFAULT_META)
  return DEFAULT_META
}

export async function getMeta(): Promise<Meta> {
  return (await db.meta.get('app')) ?? DEFAULT_META
}

export async function patchMeta(patch: Partial<Meta>): Promise<void> {
  const updated = await db.meta.update('app', patch)
  // If the row didn't exist yet (init race), upsert a merged row so the patch
  // is never silently lost.
  if (!updated) {
    const current = await getMeta()
    await db.meta.put({ ...current, ...patch, key: 'app' })
  }
}
