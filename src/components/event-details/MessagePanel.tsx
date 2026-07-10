import { X, ChevronLeft, Star, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { EmptyState } from '../ui/EmptyState';
import { Conversation } from '../../types';

interface MessagePanelProps {
  showMessages: boolean;
  activeConversation: Conversation | null;
  messageText: string;
  globalConversations: Conversation[];
  onClose: () => void;
  onBackToList: () => void;
  onSelectConversation: (conv: Conversation) => void;
  onMessageTextChange: (text: string) => void;
  onSendMessage: () => void;
}

export function MessagePanel({
  showMessages,
  activeConversation,
  messageText,
  globalConversations,
  onClose,
  onBackToList,
  onSelectConversation,
  onMessageTextChange,
  onSendMessage,
}: MessagePanelProps) {
  if (!showMessages) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[70]" onClick={() => {
      if (!activeConversation) onClose();
    }}>
      <div 
        className="absolute right-0 top-0 w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {!activeConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">Messages</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {globalConversations.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title="No messages yet"
                  description="Start a conversation with organizers or other users!"
                />
              ) : (
                globalConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv)}
                    className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  >
                    <div className="relative">
                      <ImageWithFallback
                        src={conv.user.avatar}
                        alt={conv.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {conv.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{conv.unreadCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-900 text-sm font-medium">{conv.user.name}</span>
                          {conv.user.verified && (
                            <CheckCircle2 className="w-4 h-4 text-white fill-primary" />
                          )}
                        </div>
                        <span className="text-gray-400 text-xs">{conv.lastMessage.timestamp}</span>
                      </div>
                      <p className={`text-sm line-clamp-1 ${conv.lastMessage.isRead ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                        {conv.lastMessage.text}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="bg-primary px-5 py-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBackToList}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                
                <div className="relative">
                  <ImageWithFallback
                    src={activeConversation.user.avatar}
                    alt={activeConversation.user.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50"
                  />
                  {activeConversation.user.isOrganizer && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center ring-2 ring-white">
                      <Star className="w-2 h-2 text-white fill-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-white font-bold truncate">
                      {activeConversation.user.name}
                    </h3>
                    {activeConversation.user.verified && (
                      <div className="flex-shrink-0 w-4 h-4 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-white/80 text-xs">{activeConversation.user.username}</p>
                </div>

                <button
                  onClick={() => {
                    onBackToList();
                    onClose();
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-4">
              {activeConversation.messages.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title="Send a message to start the conversation"
                />
              ) : (
                <div className="space-y-4">
                  {activeConversation.messages.map((msg) => {
                    const isMe = msg.senderId === 0;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                          <div
                            className={`rounded-2xl px-4 py-2.5 ${
                              isMe
                                ? 'bg-primary text-white'
                                : 'bg-white text-gray-900 shadow-sm'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                          </div>
                          <span className={`text-xs text-gray-400 mt-1 block ${
                            isMe ? 'text-right' : 'text-left'
                          }`}>
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border-t border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <input
                  aria-label={activeConversation ? `Message ${activeConversation.user.name}` : 'Message'}
                  type="text"
                  value={messageText}
                  onChange={(e) => onMessageTextChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-gray-900 placeholder-gray-500"
                />
                <button
                  onClick={onSendMessage}
                  disabled={!messageText.trim()}
                  className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
