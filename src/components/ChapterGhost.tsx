import { Grip } from './icons/Icons'

/** Compact card shown in the DragOverlay while a chapter is being dragged. */
export function ChapterGhost({
  title,
  index,
  count,
}: {
  title: string
  index: number
  count: number
}) {
  return (
    <div className="chapter-ghost">
      <span className="chapter-grip" aria-hidden>
        <Grip size={16} />
      </span>
      <span className="chapter-num">{index}</span>
      <span className="chapter-ghost-title">{title}</span>
      <span className="chapter-count">{count}</span>
    </div>
  )
}
