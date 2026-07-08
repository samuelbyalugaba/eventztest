export function MediaPreviews({
  capturedMedia,
}: {
  capturedMedia: { file: File; url: string; kind: 'image' | 'video' } | null;
}) {
  if (!capturedMedia) return null;

  return capturedMedia.kind === 'video' ? (
    <video src={capturedMedia.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls />
  ) : (
    <img src={capturedMedia.url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  );
}
