import { Modal } from '../Modal'
import type { ExportPlan } from '../../db/repo'

export function ExportConfirmModal({
  plan,
  onConfirm,
  onCancel,
}: {
  plan: ExportPlan
  onConfirm: () => void
  onCancel: () => void
}) {
  const excluded = plan.unsorted.length
  const sample = plan.unsorted.slice(0, 6).map((p) => p.name)

  return (
    <Modal
      title="Export numbered ZIP"
      onClose={onCancel}
      footer={
        <>
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={onConfirm}
            disabled={plan.totalIncluded === 0}
          >
            Export {plan.totalIncluded} photo(s)
          </button>
        </>
      }
    >
      <p>
        Photos will be exported as <code>001_name.jpg</code>, <code>002_…</code> in this
        order, at original quality:
      </p>
      <ol className="export-chapter-list">
        {plan.chapters.map(({ chapter, photos }) => (
          <li key={chapter.id}>
            <strong>{chapter.title}</strong> — {photos.length} photo(s)
          </li>
        ))}
        {plan.chapters.length === 0 && <li className="muted">No chapters with photos yet.</li>}
      </ol>

      {excluded > 0 && (
        <div className="exclude-warn">
          <strong>⚠️ {excluded} unsorted photo(s) will NOT be included.</strong>
          <p className="muted">
            Only photos placed in a chapter are exported. Move them into a chapter first if
            you want them in the book.
          </p>
          <p className="muted small">
            Excluded: {sample.join(', ')}
            {excluded > sample.length ? `, +${excluded - sample.length} more` : ''}
          </p>
        </div>
      )}
    </Modal>
  )
}
