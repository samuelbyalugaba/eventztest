/**
 * Client-side image optimization utility.
 * Resizes images before upload and generates thumbnails for feed display.
 */

interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp';
}

/**
 * Resize an image file on the client before uploading.
 * Returns a new File object with the resized image.
 */
export async function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    format = 'image/jpeg',
  } = options;

  // Decode off the main thread (createImageBitmap) so a large photo doesn't
  // freeze the UI; only the resized draw + encode below touch the main thread.
  let source: ImageBitmap | HTMLImageElement;
  try {
    if (typeof createImageBitmap === 'undefined') throw new Error('createImageBitmap unsupported');
    source = await createImageBitmap(file);
  } catch {
    // Fallback: keep decoding on the main thread via an <img> element.
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }

  let { width, height } = source;

  // Skip resize if already smaller
  if (width <= maxWidth && height <= maxHeight) {
    (source as ImageBitmap).close?.();
    return file;
  }

  // Calculate new dimensions maintaining aspect ratio
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    (source as ImageBitmap).close?.();
    throw new Error('Canvas context not available');
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  (source as ImageBitmap).close?.();

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, format, quality));
  if (!blob) throw new Error('Failed to create blob');

  const ext = format === 'image/webp' ? '.webp' : '.jpg';
  const newName = file.name.replace(/\.[^.]+$/, ext);
  return new File([blob], newName, { type: format });
}

/**
 * Generate a thumbnail from a File.
 * Returns a smaller File suitable for feed previews.
 */
export async function generateThumbnail(
  file: File,
  size = 400
): Promise<File> {
  return resizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'image/jpeg',
  });
}

/**
 * Optimize image before upload - resize to reasonable dimensions.
 * Use this in upload handlers to reduce upload size and storage costs.
 */
export async function optimizeForUpload(file: File): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith('image/')) return file;
  
  // Skip SVGs and GIFs (can't/shouldn't rasterize)
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  // Always compress — cap at 1200px and quality 0.75 for fast uploads & smaller storage
  return resizeImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.75,
    format: 'image/jpeg',
  });
}
