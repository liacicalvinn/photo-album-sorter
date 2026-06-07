// ====================================================================
// Domain types. IDs are stable UUIDs generated once and survive every
// reorder. Photo BYTES never live on the Photo metadata row — they are
// in separate `originals` / `thumbs` tables (see db.ts) so the board can
// list/sort hundreds of photos without pulling GBs into memory.
// ====================================================================

export type PhotoId = string
export type ChapterId = string

/** Sentinel chapterId for the "Unsorted / Inbox" tray. */
export const UNSORTED = 'unsorted' as const
export type UnsortedId = typeof UNSORTED

export interface Meta {
  key: 'app'
  schemaVersion: number
  projectTitle: string
  /** Source of truth for chapter sequence (does NOT include the Unsorted tray). */
  chapterOrder: ChapterId[]
  lastBackupAt: number | null
  lastBackupPhotoCount: number | null
  persistGranted: boolean
  /** First-run durability modal has been acknowledged. */
  onboarded: boolean
}

export interface Chapter {
  id: ChapterId
  title: string
  createdAt: number
}

export interface Photo {
  id: PhotoId
  /** Container this photo lives in. UNSORTED === the Unsorted/Inbox tray. */
  chapterId: ChapterId | UnsortedId
  /** Position within its container. 0-based, contiguous. */
  order: number
  name: string
  type: 'image/jpeg' | 'image/png'
  size: number
  width?: number
  height?: number
  /** Epoch ms from EXIF DateTimeOriginal; drives chronological default order. */
  exifDate?: number
  importedAt: number
}

export interface Original {
  photoId: PhotoId
  blob: Blob
}

export interface Thumb {
  photoId: PhotoId
  blob: Blob
}

// ---- Derived, in-memory view fed to the UI / dnd-kit (NOT persisted) ----
export interface BoardState {
  projectTitle: string
  chapterOrder: ChapterId[]
  chaptersById: Record<ChapterId, Chapter>
  /** photo ids per chapter, each already sorted by photo.order */
  photosByChapter: Record<ChapterId, PhotoId[]>
  /** Unsorted tray photo ids, sorted by order */
  unsorted: PhotoId[]
  photosById: Record<PhotoId, Photo>
  totalPhotos: number
}

// ---- Project bundle (the only honest cross-device + true backup) ----
export interface BundleManifest {
  format: 'photo-album-sorter'
  version: 1
  exportedAt: number
  projectTitle: string
  chapterOrder: ChapterId[]
  chapters: { id: ChapterId; title: string; createdAt: number }[]
  photos: {
    id: PhotoId
    chapterId: ChapterId | UnsortedId
    order: number
    name: string
    type: string
    size: number
    file: string
    width?: number
    height?: number
    exifDate?: number
  }[]
}
