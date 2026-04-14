/**
 * Image optimization utility using wsrv.nl (free image CDN proxy).
 *
 * Rewrites any image URL to go through wsrv.nl, which serves
 * resized, WebP-converted images on-the-fly — no Supabase Pro plan needed.
 *
 * Before: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * After:  https://wsrv.nl/?url=<encoded-url>&w=W&q=Q&output=webp
 */

interface TransformOptions {
  /** Target width in CSS pixels (will be multiplied by DPR) */
  width?: number;
  /** Target height */
  height?: number;
  /** Quality 1-100, default 75 */
  quality?: number;
  /** Resize mode */
  resize?: 'cover' | 'contain' | 'fill';
  /** Device pixel ratio multiplier, default uses window.devicePixelRatio */
  dpr?: number;
}

export function getOptimizedImageUrl(
  url: string | undefined | null,
  options: TransformOptions = {}
): string {
  if (!url) return '';

  // Don't double-proxy
  if (url.includes('wsrv.nl')) return url;

  // Only proxy http(s) URLs
  if (!url.startsWith('http')) return url;

  const {
    width,
    height,
    quality = 75,
    resize = 'cover',
    dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1,
  } = options;

  const params = new URLSearchParams();
  params.set('url', url);
  if (width) params.set('w', String(Math.round(width * dpr)));
  if (height) params.set('h', String(Math.round(height * dpr)));
  params.set('q', String(quality));
  params.set('output', 'webp');

  // Map resize mode to wsrv.nl fit parameter
  if (resize === 'cover') params.set('fit', 'cover');
  else if (resize === 'contain') params.set('fit', 'contain');
  else if (resize === 'fill') params.set('fit', 'fill');

  return `https://wsrv.nl/?${params.toString()}`;
}

/**
 * Preset sizes for common use cases.
 */
export const IMAGE_SIZES = {
  avatar: 80,
  thumbnail: 300,
  card: 600,
  hero: 1200,
  eventCard: 400,
} as const;
