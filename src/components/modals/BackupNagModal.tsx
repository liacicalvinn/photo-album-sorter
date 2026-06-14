import { Modal } from '../Modal'

export function BackupNagModal({
  photoCount,
  daysSince,
  onBackupNow,
  onDismiss,
}: {
  photoCount: number
  daysSince: number | null
  onBackupNow: () => void
  onDismiss: () => void
}) {
  return (
    <Modal
      title="Time to back up"
      onClose={onDismiss}
      footer={
        <>
          <button className="btn ghost" onClick={onDismiss}>
            Later
          </button>
          <button
            className="btn primary"
            onClick={() => {
              onDismiss()
              onBackupNow()
            }}
          >
            Export backup now
          </button>
        </>
      }
    >
      <p>
        You have <strong>{photoCount}</strong> photo(s) in this project
        {daysSince == null
          ? ' and no backup yet.'
          : ` and your last backup was ${daysSince} day(s) ago.`}
      </p>
      <p>
        A backup is a single file you keep — it’s the only way to recover your photobook if
        this device’s storage is cleared or lost.
      </p>
    </Modal>
  )
}
