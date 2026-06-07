import { unzipSync, strFromU8 } from 'fflate'
import { db, patchMeta } from '../db/db'
import type { BundleManifest, Photo } from '../db/types'

export interface ImportBundleResult {
  added: number
  projectTitle: string
}

/**
 * Restore a project from a backup .zip. REPLACES the current project. Thumbnails
 * are NOT stored in the bundle — they regenerate automatically afterwards via
 * the thumbnail queue (which watches for photos lacking a thumb).
 *
 * NOTE: fflate's unzipSync materializes the archive in memory. Originals are
 * stored uncompressed, so this is extraction (not slow inflate), but a very
 * large bundle will use RAM proportional to its size — acceptable for the
 * occasional restore; flagged as a known mobile limitation.
 */
export async function importProjectBundle(file: File): Promise<ImportBundleResult> {
  const buf = new Uint8Array(await file.arrayBuffer())
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(buf)
  } catch {
    throw new Error('That file is not a valid ZIP backup.')
  }

  const manifestRaw = entries['manifest.json']
  if (!manifestRaw) throw new Error('Not a valid backup — manifest.json is missing.')

  let manifest: BundleManifest
  try {
    manifest = JSON.parse(strFromU8(manifestRaw))
  } catch {
    throw new Error('The backup manifest is corrupted.')
  }
  if (manifest.format !== 'photo-album-sorter') {
    throw new Error('Unrecognized backup format.')
  }

  const importedAt = Date.now()
  const photoRows: Photo[] = []
  const originalRows: { photoId: string; blob: Blob }[] = []
  for (const mp of manifest.photos) {
    const bytes = entries[mp.file]
    if (!bytes) continue
    photoRows.push({
      id: mp.id,
      chapterId: mp.chapterId,
      order: mp.order,
      name: mp.name,
      type: (mp.type === 'image/png' ? 'image/png' : 'image/jpeg') as Photo['type'],
      size: mp.size,
      width: mp.width,
      height: mp.height,
      exifDate: mp.exifDate,
      importedAt,
    })
    originalRows.push({
      photoId: mp.id,
      blob: new Blob([bytes as BlobPart], { type: mp.type }),
    })
  }

  await db.transaction(
    'rw',
    [db.meta, db.chapters, db.photos, db.originals, db.thumbs],
    async () => {
      await Promise.all([
        db.chapters.clear(),
        db.photos.clear(),
        db.originals.clear(),
        db.thumbs.clear(),
      ])
      await patchMeta({
        projectTitle: manifest.projectTitle,
        chapterOrder: manifest.chapterOrder,
        lastBackupAt: importedAt,
        lastBackupPhotoCount: photoRows.length,
      })
      await db.chapters.bulkAdd(
        manifest.chapters.map((c) => ({
          id: c.id,
          title: c.title,
          createdAt: c.createdAt,
        })),
      )
      if (photoRows.length) await db.photos.bulkAdd(photoRows)
      if (originalRows.length) await db.originals.bulkAdd(originalRows)
    },
  )

  return { added: photoRows.length, projectTitle: manifest.projectTitle }
}
