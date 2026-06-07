export const ACCEPTED_MIME = ['image/jpeg', 'image/png'] as const
export type AcceptedMime = (typeof ACCEPTED_MIME)[number]

export const ACCEPT_ATTR = 'image/jpeg,image/png,.jpg,.jpeg,.png'

export function isAcceptedFile(file: File): file is File & { type: AcceptedMime } {
  if (ACCEPTED_MIME.includes(file.type as AcceptedMime)) return true
  // Some browsers leave type empty for files from certain pickers — sniff ext.
  const ext = file.name.toLowerCase().split('.').pop()
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png'
}

export function normalizedMime(file: File): AcceptedMime {
  if (file.type === 'image/png') return 'image/png'
  if (file.type === 'image/jpeg') return 'image/jpeg'
  const ext = file.name.toLowerCase().split('.').pop()
  return ext === 'png' ? 'image/png' : 'image/jpeg'
}

export function extForMime(mime: string, fallbackName: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  const ext = fallbackName.toLowerCase().split('.').pop()
  return ext || 'jpg'
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`
}
