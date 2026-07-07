import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { Conversation } from '../types';

interface MessagingProps {
  conversations: Conversation[];
  onStartConversation: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => Promise<Conversation | null | undefined> | Conversation | null;
  onSendMessage: (conversationId: number, messageText: string) => void;
}

export function useMessaging({ conversations: globalConversations, onStartConversation, onSendMessage }: MessagingProps) {
  const [showMessages, setShowMessages] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    if (activeConversation) {
      const updatedConv = globalConversations.find(c => c.id === activeConversation.id);
      if (updatedConv && updatedConv !== activeConversation) {
        setActiveConversation(updatedConv);
      }
    }
  }, [globalConversations, activeConversation]);

  const handleStartConversationLocal = async (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean; id?: string }) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error('Please sign in to start a conversation');
      return;
    }
    
    try {
      const conversation = await onStartConversation(user);
      if (conversation) {
        setActiveConversation(conversation);
        setShowMessages(true);
        return conversation;
      } else {
        toast.error('Could not start conversation');
      }
    } catch (error) {
      toast.error('Failed to start conversation');
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeConversation) return;
    onSendMessage(activeConversation.id, messageText);
    setMessageText('');
  };

  return {
    showMessages, setShowMessages,
    activeConversation, setActiveConversation,
    messageText, setMessageText,
    handleStartConversationLocal,
    handleSendMessage,
  };
}
