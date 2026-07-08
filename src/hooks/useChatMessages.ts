import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, getMessages, sendMessage, subscribeToMessages, markMessagesAsRead, uploadImage } from '../utils/supabase/api';
import { toast } from 'sonner';

export function useChatMessages(conversationId: number, userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  useEffect(() => {
    getMessages(conversationId).then(msgs => {
      setMessages(msgs || []);
      scrollToBottom('auto');
      markMessagesAsRead(conversationId, userId).catch(console.error);
    });

    const subscription = subscribeToMessages(conversationId, (newMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();
      if (newMessage.sender_id !== userId) {
        markMessagesAsRead(conversationId, userId).catch(console.error);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, userId, scrollToBottom]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length, scrollToBottom]);

  const handleSend = useCallback(async (text: string): Promise<boolean> => {
    if (isSending || isUploadingMedia) return false;
    const trimmed = text.trim();
    if (!trimmed) return false;
    setIsSending(true);
    try {
      const sent = await sendMessage(conversationId, trimmed);
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
      scrollToBottom();
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      return false;
    } finally {
      setIsSending(false);
    }
  }, [conversationId, isSending, isUploadingMedia, scrollToBottom]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadingMedia || isSending) return;
    const file = e.target.files?.[0];
    if (!file) return;
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
  }, [conversationId, isUploadingMedia, isSending, scrollToBottom]);

  return {
    messages,
    setMessages,
    isSending,
    isUploadingMedia,
    messagesEndRef,
    messagesScrollerRef,
    handleSend,
    handleFileChange,
    scrollToBottom,
  };
}
