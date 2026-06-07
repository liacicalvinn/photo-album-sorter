import { registerSW } from 'virtual:pwa-register'

// Lightweight wrapper around the generated service-worker registration.
// We use registerType:'prompt' so a freshly deployed version never reloads the
// page mid-sort. Components can subscribe to these signals to show a toast.
type SwListeners = {
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
}

let updateSW: ((reload?: boolean) => Promise<void>) | undefined
const listeners: SwListeners = {}

export function initPwa() {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      listeners.onNeedRefresh?.()
    },
    onOfflineReady() {
      listeners.onOfflineReady?.()
    },
  })
}

export function onPwaNeedRefresh(cb: () => void) {
  listeners.onNeedRefresh = cb
}
export function onPwaOfflineReady(cb: () => void) {
  listeners.onOfflineReady = cb
}

/** Apply the waiting service worker and reload. */
export function applyPwaUpdate() {
  return updateSW?.(true)
}
