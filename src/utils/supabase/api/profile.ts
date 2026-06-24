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

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const sanitizedUpdates: Partial<Profile> = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  ) as Partial<Profile>;

  const emptyStringToNullKeys: (keyof Profile)[] = [
    'username',
    'full_name',
    'avatar_url',
    'bio',
    'location',
    'birthdate',
    'cover_url',
    'organizer_type',
    'phone',
    'website',
    'contact_email',
    'description'
  ];

  for (const k of emptyStringToNullKeys) {
    const v = (sanitizedUpdates as any)[k];
    if (typeof v === 'string' && v.trim() === '') {
      (sanitizedUpdates as any)[k] = null;
    }
  }

  const removedPrivilegedKeys: (keyof Profile)[] = [];
  for (const k of ['is_organizer', 'verified'] as (keyof Profile)[]) {
    if (k in sanitizedUpdates) {
      delete (sanitizedUpdates as any)[k];
      removedPrivilegedKeys.push(k);
    }
  }

  if (removedPrivilegedKeys.length > 0 && Object.keys(sanitizedUpdates).length === 0) {
    throw new Error('Unauthorized: You cannot update privileged profile fields directly.');
  }

  if (sanitizedUpdates.username && sanitizedUpdates.username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (sanitizedUpdates.full_name && sanitizedUpdates.full_name.length > 50) {
    throw new Error('Name cannot exceed 50 characters');
  }

  if (sanitizedUpdates.birthdate) {
    const birthDate = new Date(sanitizedUpdates.birthdate);
    const today = new Date();
    if (birthDate > today) {
      throw new Error('Birthdate cannot be in the future');
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ ...sanitizedUpdates, id: userId })
    .select()
    .single();

  if (!error) return data;

  const baseFields: Partial<Profile> = {
    username: sanitizedUpdates.username,
    full_name: sanitizedUpdates.full_name,
    avatar_url: sanitizedUpdates.avatar_url,
    bio: sanitizedUpdates.bio,
    location: sanitizedUpdates.location,
    birthdate: sanitizedUpdates.birthdate,
    cover_url: sanitizedUpdates.cover_url,
    organizer_type: sanitizedUpdates.organizer_type,
    contact_email: sanitizedUpdates.contact_email,
    phone: sanitizedUpdates.phone,
    website: sanitizedUpdates.website,
    social_links: sanitizedUpdates.social_links,
    description: sanitizedUpdates.description
  };

  const { data: data2, error: error2 } = await supabase
    .from('profiles')
    .upsert({ ...baseFields, id: userId })
    .select()
    .single();

  if (!error2) return data2;

  const hasOtherUpdates = Object.keys(sanitizedUpdates).some(key => key !== 'avatar_url' && key !== 'id');
  
  if (!hasOtherUpdates && sanitizedUpdates.avatar_url) {
    const { data: data3, error: error3 } = await supabase
      .from('profiles')
      .upsert({ id: userId, avatar_url: sanitizedUpdates.avatar_url })
      .select()
      .single();
    if (!error3) return data3;
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
