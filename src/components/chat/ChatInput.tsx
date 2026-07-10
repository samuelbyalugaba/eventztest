import { Plus, Send, Image as ImageIcon, Mic } from 'lucide-react';
import type React from 'react';

interface ChatInputProps {
  messageText: string;
  onMessageTextChange: (value: string) => void;
  onSend: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleListening: () => void;
  isSending: boolean;
  isUploadingMedia: boolean;
  isListening: boolean;
  offsetBottom: number;
  inputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function ChatInput({
  messageText,
  onMessageTextChange,
  onSend,
  onFileChange,
  onToggleListening,
  isSending,
  isUploadingMedia,
  isListening,
  offsetBottom,
  inputRef,
  fileInputRef,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSend();
    }
  };

  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className="fixed left-0 right-0 border-t border-gray-100 bg-white px-3 pt-3 pb-[calc(0.9rem+var(--eventz-safe-area-bottom))] z-20"
      style={{ bottom: offsetBottom }}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*"
        onChange={onFileChange}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePlusClick}
          disabled={isUploadingMedia || isSending}
          aria-label="Attach media"
          className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={(e) => onMessageTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full bg-gray-100 rounded-full py-2.5 pl-4 pr-10 text-gray-900 placeholder-gray-500"
          />
          <button
            type="button"
            onClick={handleImageClick}
            disabled={isUploadingMedia || isSending}
            aria-label="Attach image or video"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImageIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {messageText.trim() ? (
          <button
            type="button"
            onClick={onSend}
            aria-label="Send message"
            className="p-2.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSending || isUploadingMedia}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleListening}
            disabled={isUploadingMedia || isSending}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
              isListening
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Mic className={`w-5 h-5 ${isListening ? 'animate-bounce' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}
