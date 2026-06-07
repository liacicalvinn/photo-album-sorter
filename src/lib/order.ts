import type { Photo } from '../db/types'

/** Pure array move (immutable). */
export function arrayMove<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * Chronological comparator: EXIF capture date first (oldest → newest),
 * falling back to filename (natural-ish), then importedAt as a last resort.
 * This is the photobook default order before any manual drag.
 */
export function chronoCompare(a: Photo, b: Photo): number {
  const da = a.exifDate ?? null
  const dbb = b.exifDate ?? null
  if (da != null && dbb != null && da !== dbb) return da - dbb
  if (da != null && dbb == null) return -1
  if (da == null && dbb != null) return 1
  const byName = a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
  if (byName !== 0) return byName
  return a.importedAt - b.importedAt
}

/**
 * Given a desired id sequence, produce the minimal set of {id, order} rows
 * whose `order` actually changed, assigning contiguous 0..n-1.
 */
export function reindex(
  orderedIds: string[],
  current: Record<string, Photo>,
): { id: string; order: number }[] {
  const changed: { id: string; order: number }[] = []
  orderedIds.forEach((id, i) => {
    const p = current[id]
    if (p && p.order !== i) changed.push({ id, order: i })
  })
  return changed
}
