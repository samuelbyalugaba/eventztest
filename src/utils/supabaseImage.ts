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
  _options: TransformOptions = {}
): string {
  if (!url) return '';

  // Image transforms require Supabase Pro plan.
  // On free tier, return the original URL unchanged.
  return url;
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
