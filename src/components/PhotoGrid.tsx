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
}: PhotoGridProps) {
  // The whole grid is a droppable so photos can be dropped onto empty space /
  // an empty chapter (closestCorners then resolves to this container).
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  return (
    <SortableContext id={containerId} items={photoIds} strategy={rectSortingStrategy}>
      <div
        ref={setNodeRef}
        className={'photo-grid' + (isOver ? ' drop-over' : '') + (photoIds.length === 0 ? ' empty' : '')}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {photoIds.map((id) => {
          const p = photosById[id]
          if (!p) return null
          return (
            <SortablePhotoCell
              key={id}
              photo={p}
              selected={selected.has(id)}
              selectionActive={selectionActive}
              onToggleSelect={(pid, shift) => onToggleSelect(pid, shift, photoIds)}
              onOpen={(pid) => onOpen(pid, photoIds)}
            />
          )
        })}
        {photoIds.length === 0 && <div className="grid-empty-drop">Drop photos here</div>}
      </div>
    </SortableContext>
  )
}
