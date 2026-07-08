interface ChatDateDividerProps {
  dateString: string;
}

export function ChatDateDivider({ dateString }: ChatDateDividerProps) {
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex justify-center mb-6 mt-2">
      <span className="bg-white px-3 py-1 rounded-lg text-xs font-medium text-gray-500 shadow-sm">
        {formatDateHeader(dateString)}
      </span>
    </div>
  );
}
