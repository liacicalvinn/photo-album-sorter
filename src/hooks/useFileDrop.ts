import { useEffect, useRef, useState } from 'react'
import { isAcceptedFile } from '../lib/fileTypes'

/**
 * Window-level file drag & drop. Uses a dragenter/dragleave counter so the
 * full-screen overlay doesn't flicker as the pointer crosses child elements.
 * Filters to accepted image types before calling onDrop.
 */
export function useFileDrop(onDrop: (files: File[]) => void) {
  const [isDragging, setDragging] = useState(false)
  const counter = useRef(0)
  const cb = useRef(onDrop)
  cb.current = onDrop

  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      counter.current++
      setDragging(true)
    }
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      counter.current = Math.max(0, counter.current - 1)
      if (counter.current === 0) setDragging(false)
    }
    const onDropEv = (e: DragEvent) => {
      if (!e.dataTransfer) return
      e.preventDefault()
      counter.current = 0
      setDragging(false)
      const files = Array.from(e.dataTransfer.files).filter(isAcceptedFile)
      if (files.length) cb.current(files)
    }

    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDropEv)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDropEv)
    }
  }, [])

  return isDragging
}
