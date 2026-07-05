let preloadedStream: MediaStream | null = null
let preloadPromise: Promise<void> | null = null
let preloadingFacing: string | null = null

export function preloadCamera(facingMode: 'environment' | 'user' = 'environment') {
  if (preloadingFacing === facingMode && (preloadedStream || preloadPromise)) return
  if (preloadedStream) stopPreloadedCamera()

  preloadingFacing = facingMode
  preloadPromise = navigator.mediaDevices
    .getUserMedia({
      video: { facingMode, width: { ideal: 960 }, height: { ideal: 720 } },
      audio: true,
    })
    .then((stream) => {
      preloadedStream = stream
      preloadPromise = null
    })
    .catch(() => {
      preloadPromise = null
      preloadingFacing = null
    })
}

export async function consumePreloadedStream(
  facingMode: string
): Promise<MediaStream | null> {
  if (preloadPromise && preloadingFacing === facingMode) {
    await preloadPromise
  }

  if (preloadedStream && preloadingFacing === facingMode) {
    const stream = preloadedStream
    preloadedStream = null
    preloadingFacing = null
    return stream
  }
  return null
}

export function stopPreloadedCamera() {
  if (preloadedStream) {
    preloadedStream.getTracks().forEach((t) => t.stop())
    preloadedStream = null
  }
  preloadPromise = null
  preloadingFacing = null
}
