import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCenter,
  closestCorners,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEffect, useReducer, useRef, useState } from 'react'
import { UNSORTED, type BoardState } from '../db/types'
import { useBoardSensors } from '../dnd/sensors'
import { persistOrder } from '../db/repo'
import { useColumns } from '../hooks/useColumns'
import { ChapterSection } from './ChapterSection'
import { ChapterGhost } from './ChapterGhost'
import { UnsortedTray } from './UnsortedTray'
import { PhotoCell } from './PhotoCell'
import { EmptyBoard } from './EmptyBoard'

const CH = 'chapter:'

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
  tileTarget: number
  onToggleSelect: (id: string, shiftKey: boolean, orderedIds: string[]) => void
  onOpen: (id: string, orderedIds: string[]) => void
  onSelectAll: (orderedIds: string[]) => void
  onRenameChapter: (id: string, title: string) => void
  onDeleteChapter: (id: string) => void
  onMoveChapter: (id: string, dir: -1 | 1) => void
  onReorderChapters: (order: string[]) => void
  onMoveSelectedHere: (chapterId: string) => void
  onAddPhotos: () => void
}

export function PhotobookBoard(props: PhotobookBoardProps) {
  const { board } = props
  const sensors = useBoardSensors()
  const { ref: colRef, cols } = useColumns(props.tileTarget, 8, 2, 12)

  // Optimistic state mirrors the DB so we can splice/renumber live during drags.
  const containersRef = useRef<Containers>(build(board))
  const chapterOrderRef = useRef<string[]>([...board.chapterOrder])
  const [, force] = useReducer((x) => x + 1, 0)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'photo' | 'chapter' | null>(null)
  const activeRef = useRef<string | null>(null)
  const dragTypeRef = useRef<'photo' | 'chapter' | null>(null)
  const startRef = useRef<string | null>(null)

  // Resync from the DB whenever the board changes and we're not mid-drag.
  useEffect(() => {
    if (!activeRef.current) {
      containersRef.current = build(board)
      chapterOrderRef.current = [...board.chapterOrder]
      force()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board])

  const findContainer = (id: string): string | undefined => {
    const c = containersRef.current
    if (id in c) return id
    return Object.keys(c).find((k) => c[k].includes(id))
  }

  // During a chapter drag, only chapters are valid drop targets.
  const collisionDetection: CollisionDetection = (args) => {
    if (dragTypeRef.current === 'chapter') {
      const only = args.droppableContainers.filter((c) =>
        String(c.id).startsWith(CH),
      )
      return closestCenter({ ...args, droppableContainers: only })
    }
    return closestCorners(args)
  }

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id)
    activeRef.current = id
    if (id.startsWith(CH)) {
      dragTypeRef.current = 'chapter'
      setActiveType('chapter')
    } else {
      dragTypeRef.current = 'photo'
      setActiveType('photo')
      startRef.current = findContainer(id) ?? null
    }
    setActiveId(id)
  }

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return

    // Chapters are a single sortable list: let verticalListSortingStrategy
    // animate the shift and apply the reorder on drop. Mutating the items
    // array here (as photos do for CROSS-container moves) would oscillate.
    if (dragTypeRef.current === 'chapter') return

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
    containersRef.current = {
      ...c,
      [from]: c[from].filter((x) => x !== activeId),
      [to]: [...toItems.slice(0, insertAt), activeId, ...toItems.slice(insertAt)],
    }
    force()
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    const type = dragTypeRef.current
    activeRef.current = null
    dragTypeRef.current = null
    startRef.current = null
    setActiveId(null)
    setActiveType(null)

    if (type === 'chapter') {
      if (over) {
        const order = chapterOrderRef.current
        const activeCid = String(active.id).slice(CH.length)
        const overRaw = String(over.id)
        const overCid = overRaw.startsWith(CH) ? overRaw.slice(CH.length) : null
        if (overCid && activeCid !== overCid) {
          const from = order.indexOf(activeCid)
          const to = order.indexOf(overCid)
          if (from >= 0 && to >= 0) props.onReorderChapters(arrayMove(order, from, to))
        }
      }
      return
    }

    const activeId = String(active.id)
    const start = startRef.current
    const end = findContainer(activeId)
    if (!end) return

    if (start && start !== end) {
      void persistOrder([
        { containerId: end, orderedIds: containersRef.current[end] },
        { containerId: start, orderedIds: containersRef.current[start] },
      ])
      return
    }
    if (over) {
      const overId = String(over.id)
      const items = containersRef.current[end]
      const oldIndex = items.indexOf(activeId)
      const newIndex =
        overId in containersRef.current ? items.length - 1 : items.indexOf(overId)
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        containersRef.current = { ...containersRef.current, [end]: arrayMove(items, oldIndex, newIndex) }
        force()
        void persistOrder([{ containerId: end, orderedIds: containersRef.current[end] }])
      }
    }
  }

  const onDragCancel = () => {
    activeRef.current = null
    dragTypeRef.current = null
    startRef.current = null
    setActiveId(null)
    setActiveType(null)
    containersRef.current = build(board)
    chapterOrderRef.current = [...board.chapterOrder]
    force()
  }

  const containers = containersRef.current
  const chapterOrder = chapterOrderRef.current
  const selectionActive = props.selectionCount > 0
  const showGlobalPage = chapterOrder.length >= 2

  // page bases (cumulative photo counts across chapters, in book order)
  const pageBases: Record<string, number> = {}
  let runningBase = 0
  for (const id of chapterOrder) {
    pageBases[id] = runningBase
    runningBase += containers[id]?.length ?? 0
  }

  // overlay specifics
  const activePhoto =
    activeId && activeType === 'photo' ? board.photosById[activeId] : undefined
  const activeContainer = activePhoto ? findContainer(activeId!) : undefined
  const activePos =
    activeContainer && activeContainer !== UNSORTED
      ? (containers[activeContainer]?.indexOf(activeId!) ?? -1) + 1
      : undefined
  const activeChapterId =
    activeId && activeType === 'chapter' ? activeId.slice(CH.length) : null
  const activeChapter = activeChapterId ? board.chaptersById[activeChapterId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 12 }}
      modifiers={activeType === 'chapter' ? [restrictToVerticalAxis] : undefined}
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
          hasChapters={chapterOrder.length > 0}
          selected={props.selectedIds}
          selectionActive={selectionActive}
          onToggleSelect={props.onToggleSelect}
          onOpen={props.onOpen}
          onSelectAll={props.onSelectAll}
        />

        <SortableContext
          items={chapterOrder.map((id) => CH + id)}
          strategy={verticalListSortingStrategy}
        >
          {chapterOrder.map((id, i) => {
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
                pageBase={pageBases[id] ?? 0}
                showGlobalPage={showGlobalPage}
                selected={props.selectedIds}
                selectionActive={selectionActive}
                selectionCount={props.selectionCount}
                onToggleSelect={props.onToggleSelect}
                onOpen={props.onOpen}
                onRename={props.onRenameChapter}
                onDelete={props.onDeleteChapter}
                onMoveSelectedHere={props.onMoveSelectedHere}
                onMoveChapter={props.onMoveChapter}
                onSelectAll={props.onSelectAll}
                canMoveUp={i > 0}
                canMoveDown={i < chapterOrder.length - 1}
              />
            )
          })}
        </SortableContext>

        {board.totalPhotos === 0 && <EmptyBoard onAddPhotos={props.onAddPhotos} />}
      </div>

      <DragOverlay dropAnimation={null} modifiers={[restrictToWindowEdges]}>
        {activeType === 'chapter' && activeChapter ? (
          <ChapterGhost
            title={activeChapter.title}
            index={chapterOrder.indexOf(activeChapterId!) + 1}
            count={containers[activeChapterId!]?.length ?? 0}
          />
        ) : activePhoto ? (
          <PhotoCell
            photo={activePhoto}
            selected={false}
            selectionActive={false}
            onToggleSelect={() => {}}
            onOpen={() => {}}
            position={activePos}
            isUnsorted={activeContainer === UNSORTED}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
