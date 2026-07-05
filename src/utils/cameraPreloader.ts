let pending: Promise<MediaStream | null> | null = null

export function preloadCamera() {
  if (pending) return
  pending = navigator.mediaDevices
    .getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 960 }, height: { ideal: 720 } },
      audio: true,
    })
    .then((stream) => stream)
    .catch(() => null)
}

export async function takePreloaded(): Promise<MediaStream | null> {
  const p = pending
  pending = null
  return p ? await p : null
}
