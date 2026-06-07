import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PhotoCell, type PhotoCellProps } from './PhotoCell'

type Props = Omit<PhotoCellProps, 'innerRef' | 'style' | 'handleProps' | 'dragging' | 'overlay'>

export function SortablePhotoCell(props: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.photo.id })

  return (
    <PhotoCell
      {...props}
      innerRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      handleProps={{ ...attributes, ...listeners }}
      dragging={isDragging}
    />
  )
}
