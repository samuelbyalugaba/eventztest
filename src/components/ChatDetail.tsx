import React, { useCallback } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import { useVisualViewport } from '../utils/useVisualViewport';
import { isVideoMedia } from '../utils/media';
import type { Profile } from '../utils/supabase/api';
import { ConfirmDialog } from './ui/confirm-dialog';
import { useChatMessages } from '../hooks/useChatMessages';
import { useChatActions } from '../hooks/useChatActions';
import { useChatKeyboard } from '../hooks/useChatKeyboard';
import { ChatHeader } from './chat/ChatHeader';
import { ChatBubble } from './chat/ChatBubble';
import { ChatDateDivider } from './chat/ChatDateDivider';
import { ChatInput } from './chat/ChatInput';
import { ChatEmptyState } from './chat/ChatEmptyState';

interface ChatDetailProps {
  conversationId: number;
  recipient: Profile;
  currentUser: { id: string };
  onBack: () => void;
  isOnline?: boolean;
  onViewProfile?: () => void;
}

export function ChatDetail({ conversationId, recipient, currentUser, onBack, isOnline, onViewProfile }: ChatDetailProps) {
  const { offsetTop, offsetBottom } = useVisualViewport();

  const {
    messages, setMessages, isSending, isUploadingMedia,
    messagesEndRef, messagesScrollerRef,
    handleSend, handleFileChange,
  } = useChatMessages(conversationId, currentUser.id);

  const {
    showMenu, setShowMenu,
    messagePendingDelete, setMessagePendingDelete,
    selectedMediaUrl, setSelectedMediaUrl,
    handleBlockUser, handleReportUser,
    handleDeleteMessage, handleReportMessage,
  } = useChatActions(recipient, conversationId, onBack, setMessages);

  const {
    messageText, setMessageText,
    isListening,
    inputRef, fileInputRef,
    toggleListening,
  } = useChatKeyboard();

  const handleSendMessage = useCallback(async () => {
    const text = messageText;
    if (!text.trim()) return;
    setMessageText('');
    const success = await handleSend(text);
    if (!success) {
      setMessageText(text);
    } else {
      inputRef.current?.focus();
    }
  }, [messageText, handleSend, setMessageText, inputRef]);

  return (
    <div className="fixed inset-0 h-[100dvh] overflow-hidden overscroll-none bg-white z-[70] flex flex-col animate-in slide-in-from-right duration-300">
      <ChatHeader
        recipient={recipient}
        isOnline={isOnline}
        onBack={onBack}
        onViewProfile={onViewProfile}
        offsetTop={offsetTop}
        showMenu={showMenu}
        onToggleMenu={() => setShowMenu((prev) => !prev)}
        onBlockUser={handleBlockUser}
        onReportUser={handleReportUser}
        onViewProfileFromMenu={() => {
          setShowMenu(false);
          onViewProfile?.();
        }}
      />

      <div
        ref={messagesScrollerRef}
        className="flex-1 overflow-y-auto overscroll-y-contain bg-gray-50 px-4 py-4"
        style={{
          paddingTop: `calc(3.5rem + ${offsetTop}px + var(--eventz-safe-area-top))`,
          paddingBottom: `calc(6rem + ${offsetBottom}px + var(--eventz-safe-area-bottom))`,
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        {messages.length === 0 ? (
          <ChatEmptyState />
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isMe = msg.sender_id === currentUser.id;
              const msgDate = new Date(msg.created_at);
              const prevMsgDate = index > 0 ? new Date(messages[index - 1].created_at) : null;
              const showDateHeader = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();

              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && <ChatDateDivider dateString={msg.created_at} />}
                  <ChatBubble
                    msg={msg}
                    isMe={isMe}
                    onDelete={(m) => setMessagePendingDelete(m)}
                    onReport={handleReportMessage}
                    onMediaClick={(url) => setSelectedMediaUrl(url)}
                  />
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput
        messageText={messageText}
        onMessageTextChange={setMessageText}
        onSend={handleSendMessage}
        onFileChange={handleFileChange}
        onToggleListening={toggleListening}
        isSending={isSending}
        isUploadingMedia={isUploadingMedia}
        isListening={isListening}
        offsetBottom={offsetBottom}
        inputRef={inputRef}
        fileInputRef={fileInputRef}
      />

      {selectedMediaUrl && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black">
          <div className="flex items-center justify-between px-3 pb-3 pt-[calc(0.75rem+var(--eventz-safe-area-top))] text-white">
            <button
              type="button"
              onClick={() => setSelectedMediaUrl(null)}
              aria-label="Close media preview"
              className="rounded-full p-2 transition hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <a
                href={selectedMediaUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open media in new tab"
                className="rounded-full p-2 transition hover:bg-white/10"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
              <a
                href={selectedMediaUrl}
                download
                aria-label="Download media"
                className="rounded-full p-2 transition hover:bg-white/10"
              >
                <Download className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-2">
            {isVideoMedia(selectedMediaUrl) ? (
              <video
                src={selectedMediaUrl}
                controls
                autoPlay
                playsInline
                className="max-h-full max-w-full"
              />
            ) : (
              <img
                src={selectedMediaUrl}
                alt="Shared media"
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={messagePendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setMessagePendingDelete(null);
        }}
        title="Delete message?"
        description="This will remove this message from the conversation."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!messagePendingDelete) return;
          const messageId = messagePendingDelete.id;
          setMessagePendingDelete(null);
          await handleDeleteMessage(messageId);
        }}
      />
    </div>
  );
}
