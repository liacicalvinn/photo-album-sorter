import { Modal } from '../Modal'

export function FirstRunModal({
  ios,
  standalone,
  onGetStarted,
}: {
  ios: boolean
  standalone: boolean
  onGetStarted: () => void
}) {
  return (
    <Modal
      title="Welcome to Photo Album Sorter"
      footer={
        <button className="btn primary" onClick={onGetStarted}>
          Got it — let’s start
        </button>
      }
    >
      <p>
        Upload your photos, sort them into chapters, and export a print-ready ZIP in the
        exact order you want — all in your browser. <strong>Your photos never leave your
        device.</strong>
      </p>
      <h3 className="mini-h">Keeping your work safe</h3>
      <ul className="bullets">
        <li>
          Everything is saved locally and survives reloads. We’ll ask the browser to keep
          your storage persistent.
        </li>
        {ios && !standalone && (
          <li className="warn-li">
            <strong>On iPhone/iPad:</strong> add this app to your Home Screen (Share →
            “Add to Home Screen”). Otherwise Safari can delete your photos after about a
            week.
          </li>
        )}
        <li>
          The real backup is <strong>Export project backup</strong> (in the ⋯ menu): one
          file with all your photos + order. Use it to move between devices or restore
          after loss. There’s no automatic cloud sync.
        </li>
      </ul>
    </Modal>
  )
}
