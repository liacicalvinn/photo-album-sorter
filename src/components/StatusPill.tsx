export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="status-pill" role="status">
      <span className="spinner" />
      <span>{children}</span>
    </div>
  )
}
