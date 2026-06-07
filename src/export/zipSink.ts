// Where a generated ZIP Response goes. On Chromium desktop we stream straight
// to disk (flat RAM, handles many GB). Everywhere else (Firefox, all iOS) we
// fall back to materializing a Blob and triggering a normal download.

interface SaveFilePickerWindow {
  showSaveFilePicker?: (opts: {
    suggestedName?: string
    types?: { description?: string; accept: Record<string, string[]> }[]
  }) => Promise<FileSystemFileHandle>
}

export function canStreamToDisk(): boolean {
  return typeof (window as unknown as SaveFilePickerWindow).showSaveFilePicker === 'function'
}

export async function saveResponse(response: Response, filename: string): Promise<void> {
  const w = window as unknown as SaveFilePickerWindow
  if (w.showSaveFilePicker && response.body) {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }],
      })
      const writable = await handle.createWritable()
      await response.body.pipeTo(writable)
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return // cancelled
      // otherwise fall through to blob download
    }
  }
  const blob = await response.blob()
  triggerDownload(blob, filename)
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 15000)
}

export function safeFilename(s: string): string {
  return s.replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'photobook'
}
