import type { StorageEstimate } from '../hooks/useStorageEstimate'
import { formatBytes } from '../lib/fileTypes'

export function StorageMeter({
  est,
  persisted,
}: {
  est: StorageEstimate | null
  persisted: boolean
}) {
  if (!est || !est.quota) return null
  const pct = Math.min(100, Math.round(est.ratio * 100))
  const warn = est.ratio > 0.8
  return (
    <div className="storage-meter" title={persisted ? 'Storage is persistent' : 'Storage not yet persistent'}>
      <div className="storage-bar">
        <div
          className={'storage-fill' + (warn ? ' warn' : '')}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <span className="storage-text">
        {formatBytes(est.usage)} used {persisted ? '· 🔒' : ''}
      </span>
    </div>
  )
}
