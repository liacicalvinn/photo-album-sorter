import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/**
 * Split sensors so each input feels native:
 *
 * - MouseSensor (distance 5px): on desktop a drag starts the instant you move
 *   ~5px — no hold delay. A stationary click still opens the lightbox / toggles
 *   the checkbox, so there's zero ambiguity with tap-to-open.
 * - TouchSensor (delay 180ms, tolerance 8px): on a phone a quick vertical flick
 *   keeps scrolling the grid; a short long-press arms the drag.
 * - KeyboardSensor: accessible reordering (Space to pick up, arrows, Space drop).
 *
 * This replaces the old single PointerSensor{delay:200}, whose delay branch
 * always won over distance and made every mouse drag feel sluggish.
 */
export function useBoardSensors() {
  return useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
}
