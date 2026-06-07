import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/**
 * Pointer sensor uses a short long-press (delay) so a quick tap/scroll on a
 * phone is NOT hijacked as a drag — vertical scrolling of a long photo grid
 * keeps working. Keyboard sensor gives accessible reordering.
 */
export function useBoardSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
}
