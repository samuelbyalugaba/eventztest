import { supabase } from './supabase/client';

/**
 * Migrates existing organizer avatars from the shared 'profiles' table
 * to the dedicated 'organizer_profiles' table.
 */
export async function migrateOrganizerAvatars() {
  console.log('Starting migration of organizer avatars...');

  try {
    // 1. Fetch all profiles that are organizers
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, avatar_url, full_name')
      .eq('is_organizer', true);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return { success: false, error: profileError };
    }

    console.log(`Found ${profiles.length} organizer profiles.`);
    let migratedCount = 0;

    for (const profile of profiles) {
      if (!profile.avatar_url) {
        continue;
      }

      // 2. Upsert organizer_profile with the avatar_url
      // We use upsert to ensure we create the record if it doesn't exist
      const { error: updateError } = await supabase
        .from('organizer_profiles')
        .upsert({
          id: profile.id,
          organizer_avatar_url: profile.avatar_url,
          // If creating a new record, we need a name. Fallback to full_name.
          // If updating, these fields (except avatar) will be ignored if we handled conflict correctly,
          // but Supabase upsert updates all provided fields by default.
          // To only update avatar if it's missing, we'd need a more complex query, 
          // but overwriting with the same value is fine.
          organizer_name: profile.full_name || 'Organizer' 
        }, { onConflict: 'id' });

      if (updateError) {
        console.error(`Failed to migrate ${profile.id}:`, updateError);
      } else {
        migratedCount++;
        console.log(`Migrated avatar for ${profile.id}`);
      }
    }

    console.log(`Migration completed. Migrated ${migratedCount} avatars.`);
    return { success: true, count: migratedCount };

  } catch (err) {
    console.error('Migration failed:', err);
    return { success: false, error: err };
  }
}
