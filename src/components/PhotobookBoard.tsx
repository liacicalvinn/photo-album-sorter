import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useEffect, useReducer, useRef, useState } from 'react'
import { UNSORTED, type BoardState } from '../db/types'
import { useBoardSensors } from '../dnd/sensors'
import { persistOrder } from '../db/repo'
import { useColumns } from '../hooks/useColumns'
import { ChapterSection } from './ChapterSection'
import { UnsortedTray } from './UnsortedTray'
import { PhotoCell } from './PhotoCell'

type Containers = Record<string, string[]>

function build(b: BoardState): Containers {
  const c: Containers = { [UNSORTED]: [...b.unsorted] }
  for (const id of b.chapterOrder) c[id] = [...(b.photosByChapter[id] ?? [])]
  return c
}

export interface PhotobookBoardProps {
  board: BoardState
  selectedIds: Set<string>
  selectionCount: number
  onToggleSelect: (id: string, shiftKey: boolean, orderedIds: string[]) => void
  onOpen: (id: string, orderedIds: string[]) => void
  onSelectAll: (orderedIds: string[]) => void
  onRenameChapter: (id: string, title: string) => void
  onDeleteChapter: (id: string) => void
  onMoveChapter: (id: string, dir: -1 | 1) => void
  onMoveSelectedHere: (chapterId: string) => void
}

export function PhotobookBoard(props: PhotobookBoardProps) {
  const { board } = props
  const sensors = useBoardSensors()
  const { ref: colRef, cols } = useColumns(140, 8, 2, 12)

  const containersRef = useRef<Containers>(build(board))
  const [, force] = useReducer((x) => x + 1, 0)
  const setContainers = (c: Containers) => {
    containersRef.current = c
    force()
  }

  const [activeId, setActiveId] = useState<string | null>(null)
  const activeRef = useRef<string | null>(null)
  const startRef = useRef<string | null>(null)

  // Sync optimistic state from the DB whenever the board changes and we're not
  // in the middle of a drag.
  useEffect(() => {
    if (!activeRef.current) setContainers(build(board))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board])

  const findContainer = (id: string): string | undefined => {
    const c = containersRef.current
    if (id in c) return id
    return Object.keys(c).find((k) => c[k].includes(id))
  }

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    activeRef.current = id
    startRef.current = findContainer(id) ?? null
    setActiveId(id)
  }

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return
    const c = containersRef.current
    const activeId = String(active.id)
    const overId = String(over.id)
    const from = findContainer(activeId)
    const to = findContainer(overId)
    if (!from || !to || from === to) return
    const toItems = c[to]
    const overIsContainer = overId in c
    const overIndex = overIsContainer ? toItems.length : toItems.indexOf(overId)
    const insertAt = overIndex < 0 ? toItems.length : overIndex
    setContainers({
      ...c,
      [from]: c[from].filter((x) => x !== activeId),
      [to]: [...toItems.slice(0, insertAt), activeId, ...toItems.slice(insertAt)],
    })
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    const activeId = String(active.id)
    const start = startRef.current
    const end = findContainer(activeId)
    activeRef.current = null
    startRef.current = null
    setActiveId(null)
    if (!end) return

    if (start && start !== end) {
      // moved into a different container
      void persistOrder([
        { containerId: end, orderedIds: containersRef.current[end] },
        { containerId: start, orderedIds: containersRef.current[start] },
      ])
      return
    }
    // same-container reorder
    if (over) {
      const overId = String(over.id)
      const items = containersRef.current[end]
      const oldIndex = items.indexOf(activeId)
      const newIndex =
        overId in containersRef.current ? items.length - 1 : items.indexOf(overId)
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const next = { ...containersRef.current, [end]: arrayMove(items, oldIndex, newIndex) }
        setContainers(next)
        void persistOrder([{ containerId: end, orderedIds: next[end] }])
      }
    }
  }

  const onDragCancel = () => {
    activeRef.current = null
    startRef.current = null
    setActiveId(null)
    setContainers(build(board))
  }

  const containers = containersRef.current
  const activePhoto = activeId ? board.photosById[activeId] : undefined
  const selectionActive = props.selectionCount > 0

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="board" ref={colRef}>
        <UnsortedTray
          photoIds={containers[UNSORTED] ?? []}
          photosById={board.photosById}
          columns={cols}
          hasChapters={board.chapterOrder.length > 0}
          selected={props.selectedIds}
          selectionActive={selectionActive}
          onToggleSelect={props.onToggleSelect}
          onOpen={props.onOpen}
          onSelectAll={props.onSelectAll}
        />

        {board.chapterOrder.map((id, i) => {
          const chapter = board.chaptersById[id]
          if (!chapter) return null
          return (
            <ChapterSection
              key={id}
              chapter={chapter}
              photoIds={containers[id] ?? []}
              photosById={board.photosById}
              index={i}
              columns={cols}
              selected={props.selectedIds}
              selectionActive={selectionActive}
              selectionCount={props.selectionCount}
              onToggleSelect={props.onToggleSelect}
              onOpen={props.onOpen}
              onRename={props.onRenameChapter}
              onDelete={props.onDeleteChapter}
              onMoveSelectedHere={props.onMoveSelectedHere}
              onMoveChapter={props.onMoveChapter}
              canMoveUp={i > 0}
              canMoveDown={i < board.chapterOrder.length - 1}
            />
          )
        })}

        {board.totalPhotos === 0 && (
          <div className="board-empty">
            <div className="board-empty-art" aria-hidden>
              🖼️
            </div>
            <h2>No photos yet</h2>
            <p>Click “＋ Add photos” to import your JPEG/PNG photos and start sorting.</p>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activePhoto ? (
          <PhotoCell
            photo={activePhoto}
            selected={false}
            selectionActive={false}
            onToggleSelect={() => {}}
            onOpen={() => {}}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
