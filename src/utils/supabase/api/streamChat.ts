import { supabase } from './client';
import type { Profile } from './profile';
import { getBlockedUserIds } from './moderation';

export type StreamMessage = {
  id: number;
  event_id: number;
  user_id: string;
  message: string;
  created_at: string;
  user?: Profile;
};

export const getStreamMessages = async (eventId: number) => {
  const { data: { user } } = await supabase.auth.getUser();
  let blockedUserIds = new Set<string>();
  if (user) {
    try {
      blockedUserIds = await getBlockedUserIds(user.id);
    } catch (error) {
      console.warn('Failed to get blocked user IDs for stream:', error);
      blockedUserIds = new Set<string>();
    }
  }

  const { data, error } = await supabase
    .from('stream_chat_messages')
    .select(`
      *,
      user:profiles(*)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;
  return (data || []).filter((message: any) => !blockedUserIds.has(message.user_id));
};

export const sendStreamMessage = async (eventId: number, message: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const trimmedMessage = message.trim();
  if (!trimmedMessage) throw new Error('Message cannot be empty');
  if (trimmedMessage.length > 200) throw new Error('Message too long (max 200 chars)');

  const { data, error } = await supabase
    .from('stream_chat_messages')
    .insert({
      event_id: eventId,
      user_id: user.id,
      message: trimmedMessage
    })
    .select(`
      *,
      user:profiles(*)
    `)
    .single();

  if (error) throw error;
  return data;
};

export const subscribeToStreamMessages = (eventId: number, callback: (message: StreamMessage) => void) => {
  const channelName = `stream-chat-${eventId}-${Math.random().toString(36).slice(2, 9)}`;
  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'stream_chat_messages',
        filter: `event_id=eq.${eventId}`
      },
      async (payload) => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          try {
            const blockedUserIds = await getBlockedUserIds(currentUser.id);
            if (blockedUserIds.has(payload.new.user_id)) return;
          } catch (error) { console.warn('Failed to check blocked users for stream message:', error); }
        }

        const { data: user } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', payload.new.user_id)
          .single();
        
        const message = {
          ...payload.new,
          user
        } as StreamMessage;
        
        callback(message);
      }
    )
    .subscribe();
};
