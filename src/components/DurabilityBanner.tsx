import { useState } from 'react'

export function DurabilityBanner({
  show,
  ios,
  canInstall,
  onInstall,
}: {
  show: boolean
  ios: boolean
  canInstall: boolean
  onInstall: () => void
}) {
  const [dismissed, setDismissed] = useState(false)
  if (!show || dismissed) return null
  return (
    <div className="durability-banner" role="status">
      <span className="db-icon" aria-hidden>
        🔒
      </span>
      <span className="db-text">
        {ios
          ? 'Tip: tap Share → “Add to Home Screen” so iOS keeps your photos safe long-term.'
          : 'Install this app to keep your photos durable and use it offline.'}
      </span>
      {canInstall && (
        <button className="btn sm primary" onClick={onInstall}>
          Install
        </button>
      )}
      <button
        className="btn ghost icon db-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
