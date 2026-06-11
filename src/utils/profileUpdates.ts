import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';

export type ProfileUpdatedDetail = {
  userId?: string;
  fields?: string[];
  avatar_url?: string | null;
};

export const clearProfileDependentCaches = () => {
  try {
    window.localStorage.removeItem('eventz-feed-cache-v1');
    window.localStorage.removeItem('eventz-auth-profile-cache-v1');
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('eventz-profile-summary-v1:'))
      .forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.removeItem('feedScrollPos');
    window.sessionStorage.removeItem('feedLastPostId');
  } catch {
    // Cache cleanup is best-effort; profile updates should still complete.
  }

  void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
  void queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
};

export const dispatchProfileUpdated = (detail: ProfileUpdatedDetail = {}) => {
  clearProfileDependentCaches();
  window.dispatchEvent(new CustomEvent<ProfileUpdatedDetail>('profileUpdated', { detail }));
};
