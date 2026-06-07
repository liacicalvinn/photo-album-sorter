/** Stable UUID generation. Used for every photo & chapter id. */
export function newId(): string {
  const c: Crypto = globalThis.crypto
  // crypto.randomUUID is available in all modern browsers over HTTPS/localhost.
  if (typeof c.randomUUID === 'function') {
    return c.randomUUID()
  }
  // Fallback (very old engines): RFC4122-ish from getRandomValues.
  const b = new Uint8Array(16)
  c.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'))
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h
    .slice(6, 8)
    .join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`
}
