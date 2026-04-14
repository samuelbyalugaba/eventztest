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
  _options: TransformOptions = {}
): string {
  // Bypass wsrv.nl proxy — return original URL directly
  if (!url) return '';
  return url;
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
