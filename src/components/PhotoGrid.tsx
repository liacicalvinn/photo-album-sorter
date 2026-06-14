import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { SortablePhotoCell } from './SortablePhotoCell'
import type { Photo, PhotoId } from '../db/types'

export interface PhotoGridProps {
  containerId: string
  photoIds: PhotoId[]
  photosById: Record<PhotoId, Photo>
  columns: number
  selected: Set<string>
  selectionActive: boolean
  onToggleSelect: (id: string, shiftKey: boolean, orderedIds: string[]) => void
  onOpen: (id: string, orderedIds: string[]) => void
  /** when true, hide per-photo position badges (Unsorted has no book order) */
  isUnsorted?: boolean
  /** running page count BEFORE this chapter (for the global page number) */
  pageBase?: number
  /** show the subtle global page number (only meaningful with 2+ chapters) */
  showGlobalPage?: boolean
}

export function PhotoGrid({
  containerId,
  photoIds,
  photosById,
  columns,
  selected,
  selectionActive,
  onToggleSelect,
  onOpen,
  isUnsorted,
  pageBase = 0,
  showGlobalPage,
}: PhotoGridProps) {
  // The whole grid is a droppable so photos can be dropped onto empty space /
  // an empty chapter (closestCorners then resolves to this container).
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  return (
    <SortableContext id={containerId} items={photoIds} strategy={rectSortingStrategy}>
      <div
        ref={setNodeRef}
        className={
          'photo-grid' +
          (isOver ? ' drop-over' : '') +
          (photoIds.length === 0 ? ' empty' : '')
        }
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {photoIds.map((id, i) => {
          const p = photosById[id]
          if (!p) return null
          return (
            <SortablePhotoCell
              key={id}
              photo={p}
              position={i + 1}
              page={showGlobalPage ? pageBase + i + 1 : undefined}
              isUnsorted={isUnsorted}
              selected={selected.has(id)}
              selectionActive={selectionActive}
              onToggleSelect={(pid, shift) => onToggleSelect(pid, shift, photoIds)}
              onOpen={(pid) => onOpen(pid, photoIds)}
            />
          )
        })}
        {photoIds.length === 0 && (
          <div className="grid-empty-drop">Drag photos here</div>
        )}
      </div>
    </SortableContext>
  )
}
