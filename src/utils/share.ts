import { toast } from 'sonner';

export interface ShareData {
  title: string;
  text: string;
  url?: string;
}

/**
 * Universal share function that uses native Web Share API on mobile
 * and falls back to showing a custom share modal on desktop
 */
export const handleShare = async (data: ShareData): Promise<boolean> => {
  const shareUrl = data.url || window.location.href;
  
  // Check if Web Share API is available AND if we can use it
  if (navigator.share && navigator.canShare) {
    try {
      // Check if the data can be shared
      const canShare = navigator.canShare({
        title: data.title,
        text: data.text,
        url: shareUrl,
      });
      
      if (canShare) {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: shareUrl,
        });
        return true; // Successfully shared via native
      }
    } catch (err) {
      const error = err as Error;
      // User cancelled the share - don't show modal
      if (error.name === 'AbortError') {
        return true; // Return true to prevent modal from showing
      }
      // Other errors - fall through to show custom modal
    }
  }
  
  // Fallback: return false to trigger custom modal
  return false;
};

/**
 * Share via WhatsApp
 */
export const shareViaWhatsApp = (title: string, text: string, url?: string) => {
  const shareUrl = url || window.location.href;
  const message = `${title}\n\n${text}\n\n${shareUrl}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
};

/**
 * Share via Email
 */
export const shareViaEmail = (title: string, text: string, url?: string) => {
  const shareUrl = url || window.location.href;
  const subject = title;
  const body = `${text}\n\n${shareUrl}`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/**
 * Copy link to clipboard
 */
export const copyLinkToClipboard = async (url?: string): Promise<boolean> => {
  const shareUrl = url || window.location.href;
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard! 🔗');
    return true;
  } catch (err) {
    toast.error('Failed to copy link');
    return false;
  }
};