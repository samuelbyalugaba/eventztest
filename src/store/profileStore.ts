import { create } from 'zustand';

interface ProfileState {
  profile: any | null;
  isOrganizer: boolean;
  followStats: { followers: number; following: number } | null;
  organizerStats: any | null;
  setProfile: (profile: any) => void;
  setFollowStats: (stats: { followers: number; following: number }) => void;
  setOrganizerStats: (stats: any) => void;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isOrganizer: false,
  followStats: null,
  organizerStats: null,
  setProfile: (profile) => set({
    profile,
    isOrganizer: profile?.is_organizer || false,
  }),
  setFollowStats: (stats) => set({ followStats: stats }),
  setOrganizerStats: (stats) => set({ organizerStats: stats }),
  clear: () => set({ profile: null, isOrganizer: false, followStats: null, organizerStats: null }),
}));
