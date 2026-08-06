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

/** Stops and drops any camera stream held by the preloader so other consumers
 *  (e.g. the livestream broadcaster) can open the device. */
export function releasePreloadedCamera() {
  const p = pending
  pending = null
  if (!p) return
  void p.then((stream) => stream?.getTracks().forEach((t) => t.stop())).catch(() => {})
}

