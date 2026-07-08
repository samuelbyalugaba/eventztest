export function ChatEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <p className="text-sm font-medium">No messages yet</p>
      <p className="text-xs mt-1">Send a message to start the conversation</p>
    </div>
  );
}
