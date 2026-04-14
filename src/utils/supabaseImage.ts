/**
 * Supabase Storage image transform utility.
 *
 * Rewrites public object URLs to use the /render/image endpoint,
 * which serves resized, WebP-converted images on-the-fly.
 *
 * Before: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * After:  https://<ref>.supabase.co/storage/v1/render/image/public/<bucket>/<path>?width=W&quality=Q&format=origin (or resize=...)
 *
 * If the URL is not a Supabase storage URL, it is returned unchanged.
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

const SUPABASE_STORAGE_OBJECT = '/storage/v1/object/public/';
const SUPABASE_STORAGE_RENDER = '/storage/v1/render/image/public/';

export function getOptimizedImageUrl(
  url: string | undefined | null,
  options: TransformOptions = {}
): string {
  if (!url) return '';

  // Only transform Supabase storage public URLs
  const idx = url.indexOf(SUPABASE_STORAGE_OBJECT);
  if (idx === -1) return url;

  const {
    width,
    height,
    quality = 75,
    resize = 'cover',
    dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1,
  } = options;

  // Build render URL
  const base = url.substring(0, idx);
  const objectPath = url.substring(idx + SUPABASE_STORAGE_OBJECT.length);
  const renderUrl = `${base}${SUPABASE_STORAGE_RENDER}${objectPath}`;

  const params = new URLSearchParams();
  if (width) params.set('width', String(Math.round(width * dpr)));
  if (height) params.set('height', String(Math.round(height * dpr)));
  params.set('quality', String(quality));
  params.set('resize', resize);

  return `${renderUrl}?${params.toString()}`;
}

/**
 * Preset sizes for common use cases.
 * Returns the optimal width for a given context.
 */
export const IMAGE_SIZES = {
  /** Avatar / profile picture */
  avatar: 80,
  /** Small card thumbnail */
  thumbnail: 300,
  /** Feed card image */
  card: 600,
  /** Full-width hero / detail */
  hero: 1200,
  /** Event card in grid */
  eventCard: 400,
} as const;
