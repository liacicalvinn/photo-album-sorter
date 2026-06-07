// Off-main-thread thumbnailing. ONE reused OffscreenCanvas, bmp.close() every
// time, canvas shrunk to 1x1 after each job to hint memory release (respects
// iOS' ~384MB canvas ceiling). EXIF orientation honored via imageOrientation.

const MAX_EDGE = 420

interface JobIn {
  id: string
  blob: Blob
}
interface JobOut {
  id: string
  ok: boolean
  thumb?: Blob
  width?: number
  height?: number
  error?: string
}

let canvas: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null

const ctxGlobal = self as unknown as {
  postMessage: (msg: JobOut) => void
  onmessage: ((e: MessageEvent<JobIn>) => void) | null
}

ctxGlobal.onmessage = async (e: MessageEvent<JobIn>) => {
  const { id, blob } = e.data
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    const ow = bmp.width
    const oh = bmp.height
    const scale = Math.min(1, MAX_EDGE / Math.max(ow, oh))
    const w = Math.max(1, Math.round(ow * scale))
    const h = Math.max(1, Math.round(oh * scale))

    if (!canvas) {
      canvas = new OffscreenCanvas(w, h)
      ctx = canvas.getContext('2d', { alpha: false })
    } else {
      canvas.width = w
      canvas.height = h
    }
    if (!ctx) throw new Error('no 2d context')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, 0, 0, w, h)
    bmp.close()

    const thumb = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 })

    // hint release
    canvas.width = 1
    canvas.height = 1

    ctxGlobal.postMessage({ id, ok: true, thumb, width: ow, height: oh })
  } catch (err) {
    ctxGlobal.postMessage({ id, ok: false, error: String(err) })
  }
}
