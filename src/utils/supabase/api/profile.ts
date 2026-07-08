import { supabase } from './client';

export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  is_organizer: boolean;
  verified: boolean;
  location: string;
  birthdate?: string;
  cover_url?: string;
  organizer_type?: string;
  phone?: string;
  website?: string;
  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  contact_email?: string;

  streaming_settings?: {
    defaultQuality: string;
    autoRecord: boolean;
    chatEnabled: boolean;
    reactionsEnabled: boolean;
    multiCamera: boolean;
    lowLatency: boolean;
  };
  privacy_settings?: {
    profileVisibility: string;
    showEmail: boolean;
    showPhone: boolean;
    allowMessages: boolean;
    showFollowers: boolean;
    showStats: boolean;
    showActivity?: boolean;
  };
  notification_settings?: {
    ticketSales: boolean;
    streamAlerts: boolean;
    weeklyReport: boolean;
    marketingEmails: boolean;
    newFollowers: boolean;
  };
  payment_settings?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    mobileMoney?: string;
    paymentMethod: string;
  };
  preferences?: {
    recentCountries?: string[];
    pwaDismissed?: string;
  };
  description?: string;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
};

type ProfileDbFields = {
  avatar_url?: string | null
  bio?: string | null
  birthdate?: string | null
  contact_email?: string | null
  full_name?: string | null
  is_organizer?: boolean | null
  last_notification_read_at?: string | null
  location?: string | null
  organizer_type?: string | null
  phone?: number | null
  username?: string | null
  verified?: boolean | null
}

const toDbProfile = (updates: Record<string, unknown>): ProfileDbFields => {
  const db: ProfileDbFields = {}
  if ('avatar_url' in updates) db.avatar_url = updates.avatar_url as string | null
  if ('bio' in updates) db.bio = updates.bio as string | null
  if ('birthdate' in updates) db.birthdate = updates.birthdate as string | null
  if ('contact_email' in updates) db.contact_email = updates.contact_email as string | null
  if ('full_name' in updates) db.full_name = updates.full_name as string | null
  if ('is_organizer' in updates) db.is_organizer = updates.is_organizer as boolean | null
  if ('location' in updates) db.location = updates.location as string | null
  if ('organizer_type' in updates) db.organizer_type = updates.organizer_type as string | null
  if ('phone' in updates) db.phone = updates.phone != null ? Number(updates.phone) : null
  if ('username' in updates) db.username = updates.username as string | null
  if ('verified' in updates) db.verified = updates.verified as boolean | null
  return db
}

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const sanitizedUpdates: Record<string, unknown> = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );

  const emptyStringToNullKeys = [
    'username', 'full_name', 'avatar_url', 'bio', 'location',
    'birthdate', 'cover_url', 'organizer_type', 'phone',
    'website', 'contact_email', 'description'
  ];

  for (const k of emptyStringToNullKeys) {
    const v = sanitizedUpdates[k];
    if (typeof v === 'string' && v.trim() === '') {
      sanitizedUpdates[k] = null;
    }
  }

  for (const k of ['is_organizer', 'verified']) {
    if (k in sanitizedUpdates) {
      delete sanitizedUpdates[k];
    }
  }

  if (sanitizedUpdates.username && (sanitizedUpdates.username as string).length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (sanitizedUpdates.full_name && (sanitizedUpdates.full_name as string).length > 50) {
    throw new Error('Name cannot exceed 50 characters');
  }

  if (sanitizedUpdates.birthdate) {
    const birthDate = new Date(sanitizedUpdates.birthdate as string);
    const today = new Date();
    if (birthDate > today) {
      throw new Error('Birthdate cannot be in the future');
    }
  }

  const dbUpdates = toDbProfile(sanitizedUpdates)

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...dbUpdates, id: userId })
    .select()
    .single();

  if (!error) return data as unknown as Profile;

  const baseFields: ProfileDbFields = {
    username: dbUpdates.username,
    full_name: dbUpdates.full_name,
    avatar_url: dbUpdates.avatar_url,
    bio: dbUpdates.bio,
    location: dbUpdates.location,
    birthdate: dbUpdates.birthdate,
    organizer_type: dbUpdates.organizer_type,
    contact_email: dbUpdates.contact_email,
    phone: dbUpdates.phone,
  };

  const { data: data2, error: error2 } = await supabase
    .from('profiles')
    .upsert({ ...baseFields, id: userId })
    .select()
    .single();

  if (!error2) return data2 as unknown as Profile;

  const hasOtherUpdates = Object.keys(sanitizedUpdates).some(key => key !== 'avatar_url' && key !== 'id');
  
  if (!hasOtherUpdates && sanitizedUpdates.avatar_url) {
    const { data: data3, error: error3 } = await supabase
      .from('profiles')
      .upsert({ id: userId, avatar_url: sanitizedUpdates.avatar_url as string | null })
      .select()
      .single();
    if (!error3) return data3 as unknown as Profile;
  }

  throw error2 || error;
};

export const checkUsernameUnique = async (username: string, currentUserId?: string) => {
  let query = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('username', username);

  if (currentUserId) {
    query = query.neq('id', currentUserId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count === 0;
};

export const becomeOrganizer = async (details: {
  full_name: string;
  username: string;
  organizer_type: string;
  location: string;
  bio: string;
  avatar_url: string;
  contact_email?: string;
}) => {
  const { data, error } = await supabase.rpc('become_organizer', {
    p_full_name: details.full_name,
    p_username: details.username,
    p_organizer_type: details.organizer_type,
    p_location: details.location,
    p_bio: details.bio,
    p_avatar_url: details.avatar_url,
    p_contact_email: details.contact_email
  });

  if (error) throw error;
  return data;
};

export const searchProfiles = async (query: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
};
