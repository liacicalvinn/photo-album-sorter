export function ProgressOverlay({
  title,
  label,
  value,
  max,
}: {
  title: string
  label: string
  value: number
  max: number
}) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="modal-title">{title}</h2>
        <div className="modal-body">
          {max > 0 ? (
            <div className="progress">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          ) : (
            <div className="progress-spinner">
              <span className="spinner big" />
            </div>
          )}
          <p className="muted progress-label">{label}</p>
        </div>
      </div>
    </div>
  )
}
