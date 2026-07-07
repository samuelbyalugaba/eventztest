import { supabase } from './client';
import type { Profile } from './profile';
import { getBlockedUserIds, assertUsersCanInteract } from './moderation';

export type Conversation = {
  id: number;
  participant1_id: string;
  participant2_id: string;
  created_at: string;
  updated_at: string;
  participant1?: Profile;
  participant2?: Profile;
  last_message?: Message;
  unread_count?: number;
};

export type Message = {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
};

export const deleteConversation = async (conversationId: number) => {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (error) throw error;
};

export const markConversationAsUnread = async (conversationId: number, userId: string) => {
  const { data: lastMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMessage) {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: false })
      .eq('id', lastMessage.id);

    if (error) throw error;
    return true;
  }
  return false;
};

export const getConversations = async (userId: string) => {
  let blockedUserIds = new Set<string>();
  try {
    blockedUserIds = await getBlockedUserIds(userId);
  } catch (error) {
    console.warn('Failed to get blocked user IDs for conversations:', error);
    blockedUserIds = new Set<string>();
  }

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      participant1:profiles!participant1_id(*),
      participant2:profiles!participant2_id(*)
    `)
    .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const visibleConversations = (data || []).filter((conv: any) => {
    const otherUserId = conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id;
    return !blockedUserIds.has(otherUserId);
  });

  const conversationIds = visibleConversations.map((c: any) => c.id);

  const { data: allMessages } = await supabase
    .from('messages')
    .select('*')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  const lastMsgByConv = new Map<number, any>();
  if (allMessages) {
    for (const msg of allMessages) {
      if (!lastMsgByConv.has(msg.conversation_id)) {
        lastMsgByConv.set(msg.conversation_id, msg);
      }
    }
  }

  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq('is_read', false)
    .neq('sender_id', userId);

  const unreadCountByConv = new Map<number, number>();
  if (unreadMessages) {
    for (const msg of unreadMessages) {
      unreadCountByConv.set(msg.conversation_id, (unreadCountByConv.get(msg.conversation_id) || 0) + 1);
    }
  }

  const conversationsWithDetails = visibleConversations.map((conv: any) => ({
    ...conv,
    last_message: lastMsgByConv.get(conv.id) || null,
    unread_count: unreadCountByConv.get(conv.id) || 0,
  }));

  return conversationsWithDetails;
};

export const getMessages = async (conversationId: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: conversation } = await supabase
      .from('conversations')
      .select('participant1_id, participant2_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (conversation) {
      const otherUserId = conversation.participant1_id === user.id
        ? conversation.participant2_id
        : conversation.participant1_id;
      await assertUsersCanInteract(user.id, otherUserId);
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(*)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const sendMessage = async (conversationId: number, text: string, imageUrl?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('participant1_id, participant2_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  const otherUserId = conversation?.participant1_id === user.id
    ? conversation?.participant2_id
    : conversation?.participant1_id;
  await assertUsersCanInteract(user.id, otherUserId);

  const trimmedText = text.trim();
  if (!trimmedText && !imageUrl) {
    throw new Error('Message cannot be empty');
  }
  if (trimmedText.length > 5000) {
    throw new Error('Message too long (max 5000 chars)');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmedText,
      image_url: imageUrl
    })
    .select('*')
    .single();

  if (error) throw error;

  return data;
};

export const startConversation = async (otherUserId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  await assertUsersCanInteract(user.id, otherUserId);

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      participant1_id: user.id,
      participant2_id: otherUserId,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteMessage = async (messageId: number) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
};

export const markMessagesAsRead = async (conversationId: number, userId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) throw error;
};

export const subscribeToMessages = (conversationId: number, callback: (message: Message) => void) => {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      async (payload) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.sender_id)
          .maybeSingle();

        const message = {
          ...payload.new,
          sender
        } as Message;
        
        callback(message);
      }
    )
    .subscribe();
};

export const subscribeToAllMessages = (callback: (message: Message) => void) => {
  return supabase
    .channel('global_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      async (payload) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.sender_id)
          .single();
        
        const message = {
          ...payload.new,
          sender
        } as Message;
        
        callback(message);
      }
    )
    .subscribe();
};
