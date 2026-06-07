import { Modal } from '../Modal'

export function QuotaErrorModal({
  onExportBundle,
  onClose,
}: {
  onExportBundle: () => void
  onClose: () => void
}) {
  return (
    <Modal
      title="⚠️ Storage is full"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="btn primary"
            onClick={() => {
              onClose()
              onExportBundle()
            }}
          >
            Export a backup
          </button>
        </>
      }
    >
      <p>
        Your device’s browser storage is full, so not all photos could be saved. The
        photos that were already saved are safe.
      </p>
      <p>
        Export a project backup to keep a copy off this device, then delete some photos or
        free up disk space before importing more.
      </p>
    </Modal>
  )
}
