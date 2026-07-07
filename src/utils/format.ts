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
  } catch (error) {
    console.warn('Failed to format time:', error);
    return '';
  }
};

const toDateValue = (dateInput?: string | Date | null): Date | null => {
  if (!dateInput) return null;

  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  const dateOnlyMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(dateInput);

  return isNaN(date.getTime()) ? null : date;
};

/**
 * Formats a date string to DD-MM-YYYY format
 */
export const formatDateDMY = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';

  const date = toDateValue(dateInput);
  if (!date) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

export const formatDateWithWeekday = (dateInput?: string | Date | null): string => {
  if (!dateInput) return '';

  const date = toDateValue(dateInput);
  if (!date) return String(dateInput);

  const weekday = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(date);
  return `${weekday}, ${formatDateDMY(date)}`;
};
