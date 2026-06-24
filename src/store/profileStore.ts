import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const PROFILE_STORE_KEY = 'eventz-profile-store-v1';

interface ProfileState {
  profile: any | null;
  isOrganizer: boolean;
  followStats: { followers: number; following: number } | null;
  organizerStats: any | null;
  hostedCount: number;
  attendedCount: number;
  setProfile: (profile: any) => void;
  setFollowStats: (stats: { followers: number; following: number }) => void;
  setOrganizerStats: (stats: any) => void;
  setHostedCount: (count: number) => void;
  setAttendedCount: (count: number) => void;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      isOrganizer: false,
      followStats: null,
      organizerStats: null,
      hostedCount: 0,
      attendedCount: 0,
      setProfile: (profile) => set({
        profile,
        isOrganizer: profile?.is_organizer || false,
      }),
      setFollowStats: (stats) => set({ followStats: stats }),
      setOrganizerStats: (stats) => set({ organizerStats: stats }),
      setHostedCount: (count) => set({ hostedCount: count }),
      setAttendedCount: (count) => set({ attendedCount: count }),
      clear: () => set({ profile: null, isOrganizer: false, followStats: null, organizerStats: null, hostedCount: 0, attendedCount: 0 }),
    }),
    {
      name: PROFILE_STORE_KEY,
      partialize: (state) => ({
        profile: state.profile,
        followStats: state.followStats,
        organizerStats: state.organizerStats,
        hostedCount: state.hostedCount,
        attendedCount: state.attendedCount,
      }),
    },
  ),
);
