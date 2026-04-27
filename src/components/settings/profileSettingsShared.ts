import { uploadImage } from '../../utils/supabase/api';

export const DEFAULT_PRIVACY_SETTINGS = {
  profileVisibility: 'public',
  showFollowers: true,
  showStats: true,
  showEmail: false,
  showPhone: false,
  allowMessages: true,
  showActivity: true,
};

export const validateProfileImageFile = (file: File, maxMb = 5) => {
  if (file.size > maxMb * 1024 * 1024) {
    return `Image size must be less than ${maxMb}MB`;
  }

  if (!file.type.startsWith('image/')) {
    return 'File must be an image';
  }

  return null;
};

export const uploadProfileAvatar = async ({
  file,
  userId,
  scope,
}: {
  file: File;
  userId: string;
  scope: 'users' | 'organizers';
}) => {
  return uploadImage(file, 'avatars', `${scope}/${userId}`);
};

export const mapUserProfileToSettingsForm = (profile: any, fallbackEmail = '') => ({
  username: profile?.username || '',
  name: profile?.full_name || '',
  email: profile?.contact_email || fallbackEmail || '',
  phone: profile?.phone || '',
  bio: profile?.bio || '',
  birthdate: profile?.birthdate || '',
  avatarUrl: profile?.avatar_url || '',
  location: profile?.location || '',
  category: profile?.organizer_type || '',
});

export const mapOrganizerProfileToSettingsForm = (profile: any, fallbackEmail = '') => ({
  username: profile?.username || '',
  organizerName: profile?.full_name || profile?.username || '',
  organizerType: profile?.organizer_type || '',
  venueSubType: '',
  email: profile?.contact_email || fallbackEmail || '',
  phone: profile?.phone || '',
  location: profile?.location || '',
  bio: profile?.bio || '',
  website: profile?.website || '',
  avatarUrl: profile?.avatar_url || '',
  birthdate: profile?.birthdate || '',
});
