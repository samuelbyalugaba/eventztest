import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getStreamMessages,
  sendStreamMessage,
  subscribeToStreamMessages,
  reportContent,
  type StreamMessage,
} from '../utils/supabase/api';
import type { LiveStreamData, GiftBanner } from '../components/livestream/types';
import { GIFT_OPTIONS } from '../components/livestream/types';
import { useReportReason } from '../contexts/ReportReasonContext';

type ViewerChatMessage = {
  id?: number;
  userId?: string;
  user: string;
  text: string;
  avatar?: string;
  isGift?: boolean;
};

const mapStreamMessageToViewerChat = (msg: StreamMessage): ViewerChatMessage => ({
  id: msg.id,
  userId: msg.user_id,
  user: msg.user?.full_name || (msg.user as any)?.username || 'User',
  text: msg.message,
  avatar: msg.user?.avatar_url,
  isGift: msg.message?.startsWith('[Gift]'),
});

const appendViewerChatMessage = (prev: ViewerChatMessage[], message: ViewerChatMessage) => {
  if (message.id && prev.some((item) => item.id === message.id)) return prev;
  const next = [...prev, message];
  return next.length > 200 ? next.slice(next.length - 200) : next;
};

export function useViewerChat(stream: LiveStreamData, currentUserId: string | null) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ViewerChatMessage[]>([]);
  const [giftBanners, setGiftBanners] = useState<GiftBanner[]>([]);
  const { askReportReason } = useReportReason();

  useEffect(() => {
    const loadChat = async () => {
      try {
        const msgs = await getStreamMessages(stream.id);
        if (msgs) {
          setMessages(msgs.slice(-200).map(mapStreamMessageToViewerChat));
        }
      } catch (error) {
        console.warn('Failed to load chat messages', error);
      }
    };
    loadChat();

    const sub = subscribeToStreamMessages(stream.id, (msg) => {
      const newMsg = mapStreamMessageToViewerChat(msg);
      setMessages((prev) => appendViewerChatMessage(prev, newMsg));

      if (msg.message?.startsWith('[Gift]')) {
        const giftMatch = GIFT_OPTIONS.find((g) => msg.message.includes(g.amount.toString()));
        if (giftMatch) {
          setGiftBanners((prev) => [
            ...prev.slice(-2),
            { id: Date.now(), senderName: msg.user?.full_name || 'Someone', gift: giftMatch, timestamp: Date.now() },
          ]);
        }
      }
    });

    return () => { sub.unsubscribe(); };
  }, [stream.id]);

  useEffect(() => {
    if (giftBanners.length === 0) return;
    const timer = setTimeout(() => {
      setGiftBanners((p) => p.filter((b) => Date.now() - b.timestamp < 5000));
    }, 5000);
    return () => clearTimeout(timer);
  }, [giftBanners]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessage('');
    try {
      const savedMessage = await sendStreamMessage(stream.id, text);
      setMessages((prev) => appendViewerChatMessage(prev, mapStreamMessageToViewerChat(savedMessage)));
    } catch (error) {
      setMessage(text);
      toast.error('Failed to send message');
      console.warn('Failed to send message', error);
    }
  };

  const handleReportStreamMessage = async (chatMessage: { id?: number; userId?: string; user: string; text: string }) => {
    if (!chatMessage.id) return;
    if (chatMessage.userId && chatMessage.userId === currentUserId) {
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

  return {
    messages,
    message,
    setMessage,
    handleSendMessage,
    handleReportStreamMessage,
    giftBanners,
  };
}
