import { supabase } from './client';

export type Notification = {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'event';
  user: {
    id?: string;
    name: string;
    avatar: string;
    verified?: boolean;
    isOrganizer?: boolean;
  };
  content: string;
  time: string;
  read: boolean;
  created_at: string;
  postId?: number;
  eventId?: number;
};

export const getNotifications = async (userId: string) => {
  const notifications: Notification[] = [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('last_notification_read_at')
    .eq('id', userId)
    .maybeSingle();
    
  const lastReadTime = profile?.last_notification_read_at ? new Date(profile.last_notification_read_at).getTime() : 0;

  const { data: follows } = await supabase
    .from('follows')
    .select(`
      created_at,
      follower:profiles!follower_id(id, full_name, avatar_url, verified, is_organizer)
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (follows) {
    follows.forEach((follow: any) => {
      if (follow.follower) {
        notifications.push({
          id: `follow-${follow.created_at}`,
          type: 'follow',
          user: { 
            id: follow.follower.id,
            name: follow.follower.full_name || 'User', 
            avatar: follow.follower.avatar_url,
            verified: !!follow.follower.verified,
            isOrganizer: !!follow.follower.is_organizer
          },
          content: 'started following you',
          time: follow.created_at,
          read: new Date(follow.created_at).getTime() <= lastReadTime,
          created_at: follow.created_at
        });
      }
    });
  }

  const { data: likes } = await supabase
    .from('post_likes')
    .select(`
      created_at,
      user:profiles(id, full_name, avatar_url, verified, is_organizer),
      post:posts!inner(id) 
    `)
    .eq('post.user_id', userId)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (likes) {
    likes.forEach((like: any) => {
      if (like.user) {
        notifications.push({
          id: `like-${like.created_at}-${like.user.id}`,
          type: 'like',
          user: { 
            id: like.user.id,
            name: like.user.full_name || 'User', 
            avatar: like.user.avatar_url,
            verified: !!like.user.verified,
            isOrganizer: !!like.user.is_organizer
          },
          content: 'liked your post',
          time: like.created_at,
          read: new Date(like.created_at).getTime() <= lastReadTime,
          created_at: like.created_at,
          postId: like.post.id
        });
      }
    });
  }

  const { data: comments } = await supabase
    .from('post_comments')
    .select(`
      id,
      created_at,
      text,
      user:profiles(id, full_name, avatar_url, verified, is_organizer),
      post:posts!inner(id)
    `)
    .eq('post.user_id', userId)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (comments) {
    comments.forEach((comment: any) => {
      if (comment.user) {
        notifications.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          user: { 
            id: comment.user.id,
            name: comment.user.full_name || 'User', 
            avatar: comment.user.avatar_url,
            verified: !!comment.user.verified,
            isOrganizer: !!comment.user.is_organizer
          },
          content: `commented: "${comment.text.substring(0, 30)}${comment.text.length > 30 ? '...' : ''}"`,
          time: comment.created_at,
          read: new Date(comment.created_at).getTime() <= lastReadTime,
          created_at: comment.created_at,
          postId: comment.post.id
        });
      }
    });
  }

  try {
    const { data: ticketSales } = await supabase
      .from('tickets')
      .select(`
        id,
        created_at,
        ticket_type,
        event:events!inner(id, title, organizer_id),
        user:profiles(id, full_name, avatar_url, verified, is_organizer)
      `)
      .eq('event.organizer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (ticketSales) {
      ticketSales.forEach((ticket: any) => {
        const buyerName = ticket.user?.full_name || 'Guest User';
        const buyerAvatar = ticket.user?.avatar_url || '';
        const ticketTime = ticket.created_at || new Date().toISOString();
        
        notifications.push({
          id: `sale-${ticket.id}`,
          type: 'event',
          user: { 
            id: ticket.user?.id,
            name: buyerName, 
            avatar: buyerAvatar,
            verified: !!ticket.user?.verified,
            isOrganizer: !!ticket.user?.is_organizer
          },
          content: `bought a ${ticket.ticket_type} ticket for "${ticket.event?.title || 'Event'}"`,
          time: ticketTime,
          read: new Date(ticketTime).getTime() <= lastReadTime,
          created_at: ticketTime,
          eventId: ticket.event?.id
        });
      });
    }
  } catch (err) {
  }

  const { data: upcomingTickets } = await supabase
    .from('tickets')
    .select(`
      id,
      events!inner(id, title, date, time, image_url)
    `)
    .eq('user_id', userId)
    .eq('status', 'valid')
    .gte('events.date', new Date().toISOString().split('T')[0]);

  if (upcomingTickets) {
    const now = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(now.getDate() + 2);

    upcomingTickets.forEach((ticket: any) => {
      if (ticket.events) {
        const eventDate = new Date(`${ticket.events.date}T${ticket.events.time || '00:00:00'}`);
        
        if (eventDate > now && eventDate <= twoDaysFromNow) {
          const reminderTime = new Date(eventDate.getTime() - 48 * 60 * 60 * 1000).toISOString();
           notifications.push({
            id: `reminder-${ticket.events.id}`,
            type: 'event',
            user: {
              name: 'Eventz Reminder',
              avatar: ticket.events.image_url || '/logo.png'
            },
            content: `Event "${ticket.events.title}" is coming up on ${new Date(ticket.events.date).toLocaleDateString()}`,
            time: reminderTime,
            read: new Date(reminderTime).getTime() <= lastReadTime,
            created_at: reminderTime,
            eventId: ticket.events.id
          });
        }
      }
    });
  }

  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return notifications;
};

export const markNotificationsAsRead = async (userId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ last_notification_read_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
};
