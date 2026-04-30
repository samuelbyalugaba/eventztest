export const formatTimeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Handle future dates (shouldn't happen for posts, but safe fallback)
    if (diffInSeconds < 0) return '0s';

    if (diffInSeconds < 60) {
      return `${Math.max(1, diffInSeconds)}s`;
    }
    
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h`;
    }
    
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d`;
    }
    
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  } catch {
    return '';
  }
};

/**
 * Formats a date string to DD-MM-YYYY format
 */
export const formatDateDMY = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';
  
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};
