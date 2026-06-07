import { useCallback, useEffect, useState } from 'react'
import { patchMeta } from '../db/db'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac; detect touch
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export interface DurableStorage {
  persisted: boolean
  standalone: boolean
  canInstall: boolean
  ios: boolean
  requestPersist: () => Promise<boolean>
  promptInstall: () => Promise<boolean>
}

export function useDurableStorage(): DurableStorage {
  const [persisted, setPersisted] = useState(false)
  const [standalone, setStandalone] = useState(isStandalone())
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {})

    const onBip = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstallEvent(null)
      setStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)

    const mq = window.matchMedia('(display-mode: standalone)')
    const onMq = () => setStandalone(isStandalone())
    mq.addEventListener?.('change', onMq)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
      mq.removeEventListener?.('change', onMq)
    }
  }, [])

  const requestPersist = useCallback(async () => {
    try {
      const granted = (await navigator.storage?.persist?.()) ?? false
      setPersisted(granted)
      await patchMeta({ persistGranted: granted })
      return granted
    } catch {
      return false
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!installEvent) return false
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    setInstallEvent(null)
    return outcome === 'accepted'
  }, [installEvent])

  return {
    persisted,
    standalone,
    canInstall: !!installEvent,
    ios: isIOS(),
    requestPersist,
    promptInstall,
  }
}
