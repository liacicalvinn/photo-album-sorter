import exifr from 'exifr'

/**
 * Read the capture date (epoch ms) from a JPEG's EXIF, if present.
 * Returns undefined for PNGs / images without EXIF date tags.
 * Only a tiny header slice is parsed (exifr reads lazily), so this is cheap.
 */
export async function readExifDate(file: File): Promise<number | undefined> {
  // PNGs effectively never carry EXIF DateTimeOriginal — skip the work.
  if (file.type === 'image/png') return undefined
  try {
    const parsed = (await exifr.parse(file, [
      'DateTimeOriginal',
      'CreateDate',
      'ModifyDate',
    ])) as
      | { DateTimeOriginal?: Date; CreateDate?: Date; ModifyDate?: Date }
      | undefined
    const d = parsed?.DateTimeOriginal ?? parsed?.CreateDate ?? parsed?.ModifyDate
    if (d instanceof Date && !Number.isNaN(d.getTime())) return d.getTime()
    return undefined
  } catch {
    return undefined
  }
}
