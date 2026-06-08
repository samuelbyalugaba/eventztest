import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MoreHorizontal, Plus, Mic, Send, Image as ImageIcon, Trash2, CheckCheck, Flag, X, ExternalLink, Download } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Message, Profile, blockUser, getMessages, reportContent, sendMessage, subscribeToMessages, markMessagesAsRead, uploadImage, deleteMessage } from '../utils/supabase/api';
import { toast } from 'sonner';
import { useVisualViewport } from '../utils/useVisualViewport';
import { askForReportReason, confirmBlockUser } from '../utils/moderation';
import { ConfirmDialog } from './ui/confirm-dialog';

interface ChatDetailProps {
  conversationId: number;
  recipient: Profile;
  currentUser: { id: string };
  onBack: () => void;
  isOnline?: boolean;
  onViewProfile?: () => void;
}

const isVideoMedia = (url?: string) => /\.(mp4|webm|ogg|ogv|mov|m4v|3gp|3gpp)(\?|#|$)/i.test(url || '');
const isPlaceholderMediaText = (content?: string) => /^sent an? (image|video|media)$/i.test((content || '').trim());

export function ChatDetail({ conversationId, recipient, currentUser, onBack, isOnline, onViewProfile }: ChatDetailProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [messagePendingDelete, setMessagePendingDelete] = useState<Message | null>(null);
  const { offsetTop, offsetBottom } = useVisualViewport();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setMessageText(transcript);
    };

    recognition.onerror = (_event: any) => {
      setIsListening(false);
      // toast.error('Voice input failed');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  };

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
    };
  }, []);

  useEffect(() => {
    // Fetch initial messages
    getMessages(conversationId).then(msgs => {
      setMessages(msgs || []);
      scrollToBottom('auto');
      // Mark as read when opening
      markMessagesAsRead(conversationId, currentUser.id).catch(console.error);
    });

    // Subscribe to new messages
    const subscription = subscribeToMessages(conversationId, (newMessage) => {
      setMessages(prev => {
        // Avoid duplicates if subscription fires for own message that was just sent
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();
      
      // Mark incoming message as read if we are looking at it
      if (newMessage.sender_id !== currentUser.id) {
         markMessagesAsRead(conversationId, currentUser.id).catch(console.error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, currentUser.id]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length, offsetBottom]);

  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadingMedia || isSending) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Please choose an image or video');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const toastId = toast.loading(isVideo ? 'Sending video...' : 'Sending image...');
    setIsUploadingMedia(true);
    try {
      const mediaUrl = await uploadImage(file, 'posts', `messages/${conversationId}`);
      if (mediaUrl) {
        const sent = await sendMessage(conversationId, isVideo ? 'Sent a video' : 'Sent an image', mediaUrl);
        if (sent) {
          setMessages(prev => {
            if (prev.some(m => m.id === sent.id)) return prev;
            return [...prev, sent];
          });
        }
        getMessages(conversationId).then((msgs) => {
          if (Array.isArray(msgs)) {
            setMessages(msgs);
            scrollToBottom();
          }
        }).catch(() => {});
        toast.success(isVideo ? 'Video sent' : 'Image sent', { id: toastId });
        scrollToBottom();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send media', { id: toastId });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleSend = async () => {
    if (isSending || isUploadingMedia) return;
    const text = messageText.trim();
    if (!text) return;
    setIsSending(true);
    setMessageText('');
    try {
      const sent = await sendMessage(conversationId, text);
      if (sent) {
        setMessages(prev => {
          if (prev.some(m => m.id === sent.id)) return prev;
          return [...prev, sent];
        });
      }
      // Fallback refresh to ensure UI consistency even if Realtime is delayed
      getMessages(conversationId).then((msgs) => {
        if (Array.isArray(msgs)) {
          setMessages(msgs);
          scrollToBottom();
        }
      }).catch(() => {});
      scrollToBottom();
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to send message');
      setMessageText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    // Optimistic update
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    try {
      await deleteMessage(messageId);
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
      getMessages(conversationId).then(setMessages);
    }
  };

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

  const handleBlockUser = async () => {
    if (!confirmBlockUser(recipient.full_name || recipient.username || 'this user')) return;
    try {
      await blockUser(recipient.id);
      toast.success('User blocked');
      setShowMenu(false);
      onBack();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to block user');
    }
  };

  const handleReportUser = async () => {
    const reason = askForReportReason(recipient.full_name || recipient.username || 'this user');
    if (!reason) return;

    try {
      await reportContent({
        contentType: 'profile',
        contentId: recipient.id,
        reason,
        reportedUserId: recipient.id,
      });
      toast.success('Report submitted');
      setShowMenu(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] overflow-hidden overscroll-none bg-white z-[70] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div
        className="fixed left-0 right-0 px-4 border-b border-gray-100 flex items-center justify-between bg-white z-20"
        style={{
          top: offsetTop,
          height: 'calc(3.5rem + var(--eventz-safe-area-top))',
          paddingTop: 'var(--eventz-safe-area-top)',
        }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Back" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          
          <button
            type="button"
            onClick={onViewProfile}
            aria-label="View profile"
            className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <UserAvatar
              src={recipient.avatar_url}
              name={recipient.full_name || recipient.username}
              className="w-10 h-10 rounded-full"
            />
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </button>
          
          <button
            type="button"
            onClick={onViewProfile}
            className="min-w-0 text-left focus:outline-none"
          >
            <div className="flex min-w-0 items-center gap-1">
              <h2 className="truncate text-base font-bold text-gray-900">{recipient.full_name || recipient.username}</h2>
              {recipient.verified && (
                <svg className="h-3.5 w-3.5 shrink-0 fill-current text-blue-500" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="truncate text-xs text-gray-500">@{recipient.username?.replace(/^@/, '')} - {isOnline ? 'Active now' : 'Offline'}</p>
          </button>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Conversation options"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-6 h-6 text-gray-900" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={() => {
                  setShowMenu(false);
                  onViewProfile?.();
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                View Profile
              </button>
              <button 
                onClick={handleBlockUser}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Block User
              </button>
              <button
                onClick={handleReportUser}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Flag className="w-4 h-4" />
                Report User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
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
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id;
            const msgDate = new Date(msg.created_at);
            const prevMsgDate = index > 0 ? new Date(messages[index - 1].created_at) : null;
            
            const showDateHeader = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();
            const dateHeader = showDateHeader ? formatDateHeader(msg.created_at) : null;
            const hasMedia = Boolean(msg.image_url);
            const mediaIsVideo = isVideoMedia(msg.image_url);
            const visibleContent = hasMedia && isPlaceholderMediaText(msg.content) ? '' : msg.content;
            
            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex justify-center mb-6 mt-2">
                    <span className="bg-white px-3 py-1 rounded-lg text-xs font-medium text-gray-500 shadow-sm">
                      {dateHeader}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`${hasMedia && !visibleContent ? 'p-1' : 'px-4 py-3'} min-w-8 rounded-2xl text-sm leading-relaxed ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-900 shadow-sm rounded-bl-none border border-gray-100'
                    }`}
                  >
                    {msg.image_url && (
                      <div className={visibleContent ? 'mb-2' : ''}>
                        <button
                          type="button"
                          onClick={() => setSelectedMediaUrl(msg.image_url || null)}
                          aria-label={mediaIsVideo ? 'Open shared video' : 'Open shared image'}
                          className="block overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        >
                          {mediaIsVideo ? (
                            <video
                              src={`${msg.image_url}#t=0.1`}
                              className="max-h-64 max-w-full bg-black object-contain"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={msg.image_url}
                              alt="Shared media"
                              className="max-h-64 max-w-full object-cover"
                              loading="lazy"
                            />
                          )}
                        </button>
                      </div>
                    )}
                    {visibleContent}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                     <span className="text-[10px] text-gray-400 font-medium">
                       {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                     {isMe && (
                       <button 
                         onClick={() => setMessagePendingDelete(msg)}
                         aria-label="Delete message"
                         className="ml-2 text-gray-400 opacity-100 transition-colors hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                       >
                         <Trash2 className="w-3 h-3" />
                       </button>
                     )}
                     {isMe && msg.is_read && (
                       <CheckCheck className="w-3 h-3 text-blue-500" />
                     )}
                     {!isMe && (
                       <button
                         onClick={async () => {
                           const reason = askForReportReason('this message');
                           if (!reason) return;
                           try {
                             await reportContent({
                               contentType: 'message',
                               contentId: msg.id,
                               reason,
                               details: msg.content,
                               reportedUserId: msg.sender_id,
                             });
                             toast.success('Report submitted');
                           } catch (error: any) {
                             toast.error(error?.message || 'Failed to submit report');
                           }
                         }}
                         aria-label="Report message"
                         className="ml-2 text-gray-400 opacity-100 transition-colors hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                       >
                         <Flag className="w-3 h-3" />
                       </button>
                     )}
                  </div>
                </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div
        className="fixed left-0 right-0 border-t border-gray-100 bg-white px-3 pt-3 pb-[calc(0.9rem+var(--eventz-safe-area-bottom))] z-20"
        style={{ bottom: offsetBottom }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*,video/*"
          onChange={handleFileChange}
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
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-gray-100 rounded-full py-2.5 pl-4 pr-10 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {/* Sticker Icon inside input */}
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
              onClick={handleSend}
              aria-label="Send message"
              className="p-2.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSending || isUploadingMedia}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          ) : (
            <button 
              type="button"
              onClick={toggleListening}
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
