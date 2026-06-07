import { downloadZip } from 'client-zip'
import { db, getMeta } from '../db/db'
import { getOriginalBlob, markBackup } from '../db/repo'
import type { BundleManifest } from '../db/types'
import { extForMime } from '../lib/fileTypes'
import { safeFilename, saveResponse } from './zipSink'

export interface BundleProgress {
  done: number
  total: number
}

/**
 * Export the WHOLE project as a portable backup: every original under
 * originals/<id>.<ext> plus a manifest.json describing chapters + order. This
 * is the true backup and the only honest cross-device transfer.
 */
export async function exportProjectBundle(
  onProgress?: (p: BundleProgress) => void,
): Promise<void> {
  const meta = await getMeta()
  const chapters = await db.chapters.toArray()
  const photos = await db.photos.toArray()
  const total = photos.length

  const manifest: BundleManifest = {
    format: 'photo-album-sorter',
    version: 1,
    exportedAt: Date.now(),
    projectTitle: meta.projectTitle,
    chapterOrder: meta.chapterOrder,
    chapters: chapters.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt })),
    photos: photos.map((p) => ({
      id: p.id,
      chapterId: p.chapterId,
      order: p.order,
      name: p.name,
      type: p.type,
      size: p.size,
      file: `originals/${p.id}.${extForMime(p.type, p.name)}`,
      width: p.width,
      height: p.height,
      exifDate: p.exifDate,
    })),
  }

  let i = 0
  async function* files() {
    yield {
      name: 'manifest.json',
      input: JSON.stringify(manifest, null, 2),
      lastModified: new Date(),
    }
    for (const p of photos) {
      const blob = await getOriginalBlob(p.id)
      i++
      onProgress?.({ done: i, total })
      if (!blob) continue
      yield {
        name: `originals/${p.id}.${extForMime(p.type, p.name)}`,
        input: blob,
        lastModified: new Date(p.exifDate ?? p.importedAt),
      }
    }
  }

  const response = downloadZip(files())
  await saveResponse(response, `${safeFilename(meta.projectTitle)}_backup.zip`)
  await markBackup(total)
}
