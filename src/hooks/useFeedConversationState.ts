import { useEffect, useState } from 'react';
import { getMessages } from '../utils/supabase/api';
import type { Conversation, Message } from '../types';

export function useFeedConversationState(params: {
  globalConversations: Conversation[];
  currentUserId?: string;
  onMarkAsRead?: (conversationId: number) => void;
}) {
  const { globalConversations, currentUserId, onMarkAsRead } = params;
  const [showMessages, setShowMessages] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    if (!activeConversation) return;

    const updatedConv = globalConversations?.find((c) => c.id === activeConversation.id);
    if (!updatedConv) return;

    if ((updatedConv.messages?.length || 0) === 0 && updatedConv.lastMessage?.text !== 'Start a conversation...') {
      const loadMsgs = async () => {
        try {
          const msgs = await getMessages(updatedConv.id);
          const formattedMsgs: Message[] = msgs.map((m: any) => ({
            id: m.id,
            senderId: m.sender_id === currentUserId ? 0 : parseInt(m.sender_id, 10) || 1,
            text: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: m.is_read
          }));
          setActiveConversation({ ...updatedConv, messages: formattedMsgs });
        } catch (e) {
          console.error(e);
        }
      };
      void loadMsgs();
    } else if (updatedConv !== activeConversation) {
      setActiveConversation(updatedConv);
    }

    if (updatedConv.unreadCount && updatedConv.unreadCount > 0 && onMarkAsRead) {
      onMarkAsRead(updatedConv.id);
    }
  }, [activeConversation, currentUserId, globalConversations, onMarkAsRead]);

  return {
    showMessages,
    setShowMessages,
    activeConversation,
    setActiveConversation,
  };
}
