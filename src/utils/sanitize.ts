
/**
 * Basic text sanitizer to prevent XSS.
 * Removes HTML tags and risky characters from user input.
 * NOTE: For React apps, simple text content is usually auto-escaped.
 * This function is useful for contexts where auto-escaping might not happen.
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validates if a URL is a valid YouTube URL (standard or shortened).
 */
export const validateYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}([&?].*)?$/;
  return youtubeRegex.test(url);
};

/**
 * Extracts the YouTube Video ID from a valid URL.
 */
export const getYouTubeVideoId = (url: string): string | null => {
  if (!validateYouTubeUrl(url)) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

/**
 * Validates if a URL is safe (http/https).
 * Prevents javascript: URIs.
 */
export const isSafeUrl = (url: string): boolean => {
  if (!url) return true; // Empty is safe (optional field)
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch (e) {
    return false; // Invalid URL format
  }
};
