import { supabase } from './client';

export const getTrending = async () => {
  const [eventsRes, profilesRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, category, views, image_url, date, time, location, city')
      .eq('status', 'published')
      .order('views', { ascending: false })
      .limit(5),
    
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, is_organizer')
      .eq('verified', true)
      .limit(5)
  ]);

  return {
    events: eventsRes.data || [],
    people: profilesRes.data || []
  };
};
