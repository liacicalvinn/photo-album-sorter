import { Camera, Plus } from './icons/Icons'

/** Full-board empty state: a friendly drop zone + a 3-step rail. */
export function EmptyBoard({ onAddPhotos }: { onAddPhotos: () => void }) {
  return (
    <div className="empty-board">
      <button type="button" className="empty-drop" onClick={onAddPhotos}>
        <span className="empty-art" aria-hidden>
          <Camera size={40} />
        </span>
        <h2>Start your photobook</h2>
        <p>Drag photos anywhere on this page, or click to choose JPEG / PNG files.</p>
        <span className="btn primary empty-cta">
          <Plus size={18} /> Add photos
        </span>
      </button>

      <ol className="empty-steps" aria-hidden>
        <li>
          <span className="step-n">1</span>
          <div>
            <strong>Import</strong>
            <span>Add all your photos — they stay on your device.</span>
          </div>
        </li>
        <li>
          <span className="step-n">2</span>
          <div>
            <strong>Sort</strong>
            <span>Group into chapters and drag into book order.</span>
          </div>
        </li>
        <li>
          <span className="step-n">3</span>
          <div>
            <strong>Export</strong>
            <span>Download a numbered ZIP for your print service.</span>
          </div>
        </li>
      </ol>
    </div>
  )
}
