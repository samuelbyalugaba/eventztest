import { supabase } from './supabase/client';
import { eventsData } from './eventsData';

export const seedEvents = async (userId: string) => {
  console.log('Seeding events...');
  let count = 0;
  for (const event of eventsData) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...eventData } = event;
    const { error } = await supabase.from('events').insert({
      ...eventData,
      organizer_id: userId,
    });
    if (error) {
      console.error('Error seeding event:', event.title, error);
    } else {
      count++;
    }
  }
  console.log(`Seeded ${count} events.`);
  return count;
};
