import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MoreHorizontal, Plus, Mic, Send, Image as ImageIcon, Trash2, CheckCheck } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Message, Profile, getMessages, sendMessage, subscribeToMessages, markMessagesAsRead, uploadImage, deleteMessage } from '../utils/supabase/api';
import { toast } from 'sonner';
import { useVisualViewport } from '../utils/useVisualViewport';

interface ChatDetailProps {
  conversationId: number;
  recipient: Profile;
  currentUser: { id: string };
  onBack: () => void;
  isOnline?: boolean;
  onViewProfile?: () => void;
}

export function ChatDetail({ conversationId, recipient, currentUser, onBack, isOnline, onViewProfile }: ChatDetailProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { offsetTop, offsetBottom } = useVisualViewport();
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Fetch initial messages
    getMessages(conversationId).then(msgs => {
      setMessages(msgs || []);
      scrollToBottom();
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

  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    const toastId = toast.loading('Sending image...');
    try {
      const imageUrl = await uploadImage(file, 'posts'); 
      if (imageUrl) {
        await sendMessage(conversationId, 'Sent an image', imageUrl);
        toast.success('Image sent', { id: toastId });
        scrollToBottom();
      }
    } catch (error) {
      toast.error('Failed to send image', { id: toastId });
    }
  };

  const handleSend = async () => {
    if (isSending) return;
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
    } catch (error: any) {
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
    if (!confirm('Delete this message?')) return;
    
    // Optimistic update
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    try {
      await deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (error) {
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

  const handleBlockUser = () => {
    toast.success('User blocked');
    setShowMenu(false);
  };

  return (
    <div className="fixed inset-0 h-[100dvh] bg-white z-[70] flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div
        className="fixed left-0 right-0 h-14 px-4 border-b border-gray-100 flex items-center justify-between bg-white z-20"
        style={{ top: offsetTop }}
      >
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Back" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          
          <div className="relative">
            <UserAvatar
              src={recipient.avatar_url}
              name={recipient.full_name || recipient.username}
              className="w-10 h-10 rounded-full"
            />
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-1">
              <h2 className="text-base font-bold text-gray-900">{recipient.full_name || recipient.username}</h2>
              {recipient.verified && (
                <svg className="w-3.5 h-3.5 text-blue-500 fill-current" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="text-xs text-gray-500">@{recipient.username?.replace(/^@/, '')} • {isOnline ? 'Active now' : 'Offline'}</p>
          </div>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
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
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4"
        style={{ paddingTop: 56 + offsetTop, paddingBottom: 76 + offsetBottom }}
      >
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id;
            const msgDate = new Date(msg.created_at);
            const prevMsgDate = index > 0 ? new Date(messages[index - 1].created_at) : null;
            
            const showDateHeader = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();
            const dateHeader = showDateHeader ? formatDateHeader(msg.created_at) : null;
            
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
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-900 shadow-sm rounded-bl-none border border-gray-100'
                    }`}
                  >
                    {msg.image_url && (
                      <div className="mb-2">
                        <img 
                          src={msg.image_url} 
                          alt="Shared" 
                          className="rounded-lg max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(msg.image_url, '_blank')}
                        />
                      </div>
                    )}
                    {msg.content}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                     <span className="text-[10px] text-gray-400 font-medium">
                       {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                     {isMe && (
                       <button 
                         onClick={() => handleDeleteMessage(msg.id)}
                         className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                         title="Delete message"
                       >
                         <Trash2 className="w-3 h-3" />
                       </button>
                     )}
                     {isMe && msg.is_read && (
                       <CheckCheck className="w-3 h-3 text-blue-500" />
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
        className="fixed left-0 right-0 p-3 bg-white border-t border-gray-100 z-20"
        style={{ bottom: offsetBottom }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePlusClick}
            className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
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
               onClick={handleImageClick}
               className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
             >
               <ImageIcon className="w-5 h-5 text-gray-500" />
             </button>
          </div>

          {messageText.trim() ? (
            <button 
              type="button"
              onClick={handleSend}
              className="p-2.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex-shrink-0"
              disabled={isSending}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          ) : (
            <button 
              onClick={toggleListening}
              className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Mic className={`w-5 h-5 ${isListening ? 'animate-bounce' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
