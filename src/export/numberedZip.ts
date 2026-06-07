import { downloadZip } from 'client-zip'
import { getOrderedForExport, getOriginalBlob, type ExportPlan } from '../db/repo'
import { extForMime } from '../lib/fileTypes'
import { safeFilename, saveResponse } from './zipSink'

export interface ZipProgress {
  done: number
  total: number
}

/**
 * Build the final numbered ZIP. Photos are emitted in book order
 * (chapters by sequence, photos by their order within each chapter — the
 * Unsorted tray is excluded by getOrderedForExport). Files are named
 * 001_<name>, 002_<name>, … zero-padded, and stored uncompressed so JPEG/PNG
 * stay at original quality.
 */
export async function exportNumberedZip(
  plan: ExportPlan,
  onProgress?: (p: ZipProgress) => void,
): Promise<void> {
  const ordered = plan.chapters.flatMap((c) => c.photos)
  const total = ordered.length
  if (!total) return
  const width = Math.max(3, String(total).length)
  let i = 0

  async function* files() {
    for (const p of ordered) {
      const blob = await getOriginalBlob(p.id)
      i++
      onProgress?.({ done: i, total })
      if (!blob) continue
      const num = String(i).padStart(width, '0')
      const base = p.name.replace(/\.[^.]+$/, '')
      const ext = extForMime(p.type, p.name)
      yield {
        name: `${num}_${base}.${ext}`,
        input: blob,
        lastModified: new Date(p.exifDate ?? p.importedAt),
      }
    }
  }

  const response = downloadZip(files())
  await saveResponse(response, `${safeFilename(plan.projectTitle)}_ordered.zip`)
}

export async function buildExportPlan(): Promise<ExportPlan> {
  return getOrderedForExport()
}
