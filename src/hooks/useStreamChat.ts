import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase, type StreamMessage, getStreamMessages, subscribeToStreamMessages, getEventLikes, subscribeToEventLikes, sendStreamMessage, reportContent } from '../utils/supabase/api';
import { generateHeart } from '../components/livestream/HeartAnimations';
import type { FloatingHeart } from '../components/livestream/types';
import { useReportReason } from '../contexts/ReportReasonContext';

const appendStreamMessage = (prev: StreamMessage[], message: StreamMessage) => {
  if (message.id && prev.some((item) => item.id === message.id)) return prev;
  const next = [...prev, message];
  return next.length > 200 ? next.slice(-200) : next;
};

export function useStreamChat(eventId: number, isLive: boolean) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [chatMessage, setChatMessage] = useState('');
  const [likes, setLikes] = useState(0);
  const [likesAnimation, setLikesAnimation] = useState<FloatingHeart[]>([]);
  const { askReportReason } = useReportReason();

  useEffect(() => {
    const loadChat = async () => {
      try {
        const [msgs, initialLikes] = await Promise.all([
          isLive ? getStreamMessages(eventId) : Promise.resolve([]),
          getEventLikes(eventId),
        ]);
        setMessages((msgs || []).slice(-200));
        setLikes(initialLikes);
      } catch {
        console.warn('Failed to load stream chat or likes', eventId);
      }
    };
    loadChat();

    const sub = subscribeToStreamMessages(eventId, (msg) => {
      setMessages((prev) => appendStreamMessage(prev, msg));
    });

    const likesSub = subscribeToEventLikes(eventId, ({ delta }) => {
      setLikes((p) => Math.max(0, p + delta));
      if (delta > 0) setLikesAnimation((p) => [...p, generateHeart()]);
    });

    return () => { sub.unsubscribe(); likesSub.unsubscribe(); };
  }, [eventId, isLive]);

  useEffect(() => {
    if (likesAnimation.length === 0) return;
    const timer = setTimeout(() => {
      setLikesAnimation((p) => p.filter((h) => Date.now() - h.id < 2000));
    }, 2000);
    return () => clearTimeout(timer);
  }, [likesAnimation]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = chatMessage.trim();
    if (!text) return;
    setChatMessage('');
    try {
      const savedMessage = await sendStreamMessage(eventId, text);
      setMessages((prev) => appendStreamMessage(prev, savedMessage));
    } catch {
      setChatMessage(text);
      toast.error('Failed to send message');
    }
  };

  const handleReportStreamMessage = async (chatMessage: { id?: number; userId?: string; user: string; text: string }) => {
    if (!chatMessage.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id && chatMessage.userId === user.id) {
      toast.error('You cannot report your own message');
      return;
    }
    const reason = await askReportReason('this live chat message');
    if (!reason) return;
    try {
      await reportContent({
        contentType: 'stream',
        contentId: chatMessage.id,
        reason,
        details: chatMessage.text,
        reportedUserId: chatMessage.userId,
      });
      toast.success('Report submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  };

  const chatMessages = messages.map((m) => ({
    id: m.id,
    userId: m.user_id,
    user: m.user?.full_name || (m.user as any)?.username || 'Guest',
    text: m.message,
    avatar: m.user?.avatar_url,
    isGift: m.message.startsWith('[Gift]'),
  }));

  return {
    messages,
    chatMessage,
    setChatMessage,
    likes,
    likesAnimation,
    chatMessages,
    handleSendMessage,
    handleReportStreamMessage,
  };
}
