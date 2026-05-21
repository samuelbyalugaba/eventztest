import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  markMessagesAsRead,
  subscribeToAllMessages,
  getLiveStreams,
  getMutualFollows,
  subscribeToOnlineUsers,
  deleteConversation,
} from '../utils/supabase/api';
import { Conversation, Message } from '../types';
import { useAuth } from './AuthContext';

interface OnlineFriend {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

interface StartConversationUser {
  name: string;
  username?: string;
  avatar: string;
  verified: boolean;
  isOrganizer?: boolean;
  id?: string;
}

interface MessagingContextValue {
  conversations: Conversation[];
  isLoadingConversations: boolean;
  onlineFriends: OnlineFriend[];
  hasLiveEvents: boolean;
  startConversation: (user: StartConversationUser) => Promise<Conversation | null>;
  sendMessage: (conversationId: number, text: string) => Promise<void>;
  markAsRead: (conversationId: number) => Promise<void>;
  deleteConversation: (conversationId: number) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [hasLiveEvents, setHasLiveEvents] = useState(false);

  // Fetch conversations
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setConversations([]);
      setIsLoadingConversations(false);
      return;
    }
    (async () => {
      setIsLoadingConversations(true);
      try {
        const apiConvs = await getConversations(currentUser.id);
        const formatted: Conversation[] = apiConvs.map((c: any) => {
          const other = c.participant1_id === currentUser.id ? c.participant2 : c.participant1;
          return {
            id: c.id,
            user: {
              id: other?.id,
              name: other?.full_name || 'Unknown User',
              username: other?.username || '',
              avatar: other?.avatar_url,
              verified: other?.verified || false,
              isOrganizer: other?.is_organizer || false,
            },
            lastMessage: {
              text: c.last_message?.content || '',
              timestamp: c.last_message
                ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '',
              isRead: c.last_message?.is_read || false,
            },
            hasMessages: !!c.last_message,
            unreadCount: c.unread_count || 0,
            messages: [],
          };
        });
        setConversations(formatted);
      } catch {/* silent */}
      finally {
        setIsLoadingConversations(false);
      }
    })();
  }, [isAuthenticated, currentUser]);

  // Live events polling
  useEffect(() => {
    if (!isAuthenticated) return;
    const check = async () => {
      try {
        const streams = await getLiveStreams();
        setHasLiveEvents(streams.length > 0);
      } catch {/* silent */}
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // Realtime messages
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    const sub = subscribeToAllMessages((newMessage: any) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === newMessage.conversation_id);
        if (idx < 0) return prev;
        const conv = prev[idx];
        if (conv.messages.some(m => m.id === newMessage.id)) return prev;
        const appMsg: Message = {
          id: newMessage.id,
          senderId: newMessage.sender_id === currentUser.id ? 0 : parseInt(newMessage.sender_id) || 1,
          text: newMessage.content,
          timestamp: new Date(newMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: newMessage.sender_id === currentUser.id,
        };
        const updated = {
          ...conv,
          messages: [...conv.messages, appMsg],
          lastMessage: { text: appMsg.text, timestamp: 'Just now', isRead: appMsg.read },
          hasMessages: true,
          unreadCount: newMessage.sender_id !== currentUser.id ? (conv.unreadCount || 0) + 1 : (conv.unreadCount || 0),
        };
        const next = [...prev];
        next.splice(idx, 1);
        next.unshift(updated);
        return next;
      });
    });
    return () => { sub.unsubscribe(); };
  }, [isAuthenticated, currentUser]);

  // Presence
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setOnlineFriends([]);
      return;
    }
    let channel: any;
    (async () => {
      try {
        const friends = await getMutualFollows(currentUser.id);
        channel = subscribeToOnlineUsers(currentUser.id, (onlineIds: any[]) => {
          const online = friends.filter((f: any) => onlineIds.includes(f.id));
          setOnlineFriends(online.map((f: any) => ({
            id: f.id, name: f.full_name || '', username: f.username || '', avatar: f.avatar_url || '',
          })));
        });
      } catch {/* silent */}
    })();
    return () => { if (channel) channel.unsubscribe(); };
  }, [isAuthenticated, currentUser]);

  const handleStartConversation = useCallback(async (user: StartConversationUser): Promise<Conversation | null> => {
    if (!currentUser) return null;
    const existing = conversations.find(conv => {
      if (user.id && conv.user.id === user.id) return true;
      if (conv.user.username && user.username) {
        return conv.user.username.toLowerCase().trim() === user.username.toLowerCase().trim();
      }
      return conv.user.name.toLowerCase().trim() === user.name.toLowerCase().trim();
    });
    if (existing) return existing;
    if (user.id) {
      try {
        const apiConv = await startConversation(user.id);
        const newConv: Conversation = {
          id: apiConv.id,
          user: {
            id: user.id,
            name: user.name,
            username: user.username || `@${user.name.toLowerCase().replace(/\s+/g, '')}`,
            avatar: user.avatar,
            verified: user.verified,
            isOrganizer: user.isOrganizer,
          },
          lastMessage: { text: '', timestamp: '', isRead: true },
          hasMessages: false,
          unreadCount: 0,
          messages: [],
        };
        setConversations(prev => [newConv, ...prev]);
        return newConv;
      } catch {/* silent */}
    }
    return null;
  }, [currentUser, conversations]);

  const handleSendMessage = useCallback(async (conversationId: number, messageText: string) => {
    if (!messageText.trim() || !currentUser) return;
    const previousConversation = conversations.find(conv => conv.id === conversationId);
    const tempId = Date.now();
    const tempMsg: Message = {
      id: tempId, senderId: 0, text: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      read: true,
    };
    setConversations(prev => prev.map(conv => conv.id === conversationId ? {
      ...conv,
      messages: [...conv.messages, tempMsg],
      lastMessage: { text: tempMsg.text, timestamp: 'Just now', isRead: true },
      hasMessages: true,
    } : conv));
    try {
      const sent = await sendMessage(conversationId, messageText);
      if (sent) {
        const real: Message = {
          id: sent.id, senderId: 0, text: sent.content,
          timestamp: new Date(sent.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          read: true,
        };
        setConversations(prev => prev.map(conv => conv.id === conversationId ? {
          ...conv,
          messages: conv.messages.map(m => m.id === tempId ? real : m),
          lastMessage: { text: real.text, timestamp: 'Just now', isRead: true },
          hasMessages: true,
        } : conv));
      }
    } catch {
      setConversations(prev => prev.map(conv => conv.id === conversationId ? {
        ...conv,
        messages: conv.messages.filter(m => m.id !== tempId),
        lastMessage: previousConversation?.lastMessage || conv.lastMessage,
        hasMessages: previousConversation?.hasMessages || false,
      } : conv));
      toast.error('Failed to send message');
    }
  }, [currentUser, conversations]);

  const handleMarkAsRead = useCallback(async (conversationId: number) => {
    if (!currentUser) return;
    setConversations(prev => prev.map(conv => conv.id === conversationId ? {
      ...conv,
      unreadCount: 0,
      messages: conv.messages.map(m => ({ ...m, read: true })),
      lastMessage: { ...conv.lastMessage, isRead: true },
    } : conv));
    try { await markMessagesAsRead(conversationId, currentUser.id); } catch {/* silent */}
  }, [currentUser]);

  const handleDeleteConversation = useCallback(async (conversationId: number) => {
    const snapshot = conversations;
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    try {
      await deleteConversation(conversationId);
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete conversation');
      setConversations(snapshot);
      // best-effort refresh
      if (currentUser) {
        try {
          const apiConvs = await getConversations(currentUser.id);
          const formatted: Conversation[] = await Promise.all(apiConvs.map(async (c: any) => {
            const other = c.participant1_id === currentUser.id ? c.participant2 : c.participant1;
            const msgs = await getMessages(c.id);
            return {
              id: c.id,
              user: {
                id: other?.id,
                name: other?.full_name || 'Unknown User',
                username: other?.username || '',
                avatar: other?.avatar_url,
                verified: other?.verified || false,
                isOrganizer: other?.is_organizer || false,
              },
              lastMessage: {
                text: c.last_message?.content || '',
                timestamp: c.last_message ? new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                isRead: c.last_message?.is_read || false,
              },
              hasMessages: !!c.last_message,
              unreadCount: c.unread_count || 0,
              messages: msgs.map((m: any) => ({
                id: m.id,
                senderId: m.sender_id === currentUser.id ? 0 : parseInt(m.sender_id) || 1,
                text: m.content,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                read: m.is_read,
              })),
            };
          }));
          setConversations(formatted);
        } catch {/* silent */}
      }
    }
  }, [conversations, currentUser]);

  const value = useMemo<MessagingContextValue>(() => ({
    conversations,
    isLoadingConversations,
    onlineFriends,
    hasLiveEvents,
    startConversation: handleStartConversation,
    sendMessage: handleSendMessage,
    markAsRead: handleMarkAsRead,
    deleteConversation: handleDeleteConversation,
  }), [conversations, isLoadingConversations, onlineFriends, hasLiveEvents, handleStartConversation, handleSendMessage, handleMarkAsRead, handleDeleteConversation]);

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within MessagingProvider');
  return ctx;
}
