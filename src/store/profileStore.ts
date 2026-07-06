import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const PROFILE_STORE_KEY = 'eventz-profile-store-v1';

export interface DashboardCache {
  events: any[];
  tickets: any[];
  transactions: any[];
  scans: any[];
  updatedAt: number;
}

export interface UserStatsSnapshot {
  hosted: number;
  attended: number;
  followers: number;
  following: number;
  updatedAt: number;
}

interface ProfileState {
  profile: any | null;
  isOrganizer: boolean;
  followStats: { followers: number; following: number } | null;
  organizerStats: any | null;
  hostedCount: number;
  attendedCount: number;
  walletBalance: number | null;
  dashboardCache: DashboardCache | null;
  userStatsCache: Record<string, UserStatsSnapshot>;
  setProfile: (profile: any) => void;
  setFollowStats: (stats: { followers: number; following: number }) => void;
  setOrganizerStats: (stats: any) => void;
  setHostedCount: (count: number) => void;
  setAttendedCount: (count: number) => void;
  setWalletBalance: (value: number) => void;
  setDashboardCache: (cache: Partial<DashboardCache>) => void;
  setUserStats: (userId: string, patch: Partial<Omit<UserStatsSnapshot, 'updatedAt'>>) => void;
  getUserStats: (userId: string) => UserStatsSnapshot | null;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      isOrganizer: false,
      followStats: null,
      organizerStats: null,
      hostedCount: 0,
      attendedCount: 0,
      walletBalance: null,
      dashboardCache: null,
      userStatsCache: {},
      setProfile: (profile) => set({
        profile,
        isOrganizer: profile?.is_organizer || false,
      }),
      setFollowStats: (stats) => set({ followStats: stats }),
      setOrganizerStats: (stats) => set({ organizerStats: stats }),
      setHostedCount: (count) => set({ hostedCount: count }),
      setAttendedCount: (count) => set({ attendedCount: count }),
      setWalletBalance: (value) => set({ walletBalance: value }),
      setDashboardCache: (patch) => {
        const prev = get().dashboardCache;
        set({
          dashboardCache: {
            events: patch.events ?? prev?.events ?? [],
            tickets: patch.tickets ?? prev?.tickets ?? [],
            transactions: patch.transactions ?? prev?.transactions ?? [],
            scans: patch.scans ?? prev?.scans ?? [],
            updatedAt: Date.now(),
          },
        });
      },
      setUserStats: (userId, patch) => {
        if (!userId) return;
        const prev = get().userStatsCache[userId] || { hosted: 0, attended: 0, followers: 0, following: 0, updatedAt: 0 };
        set({
          userStatsCache: {
            ...get().userStatsCache,
            [userId]: { ...prev, ...patch, updatedAt: Date.now() },
          },
        });
      },
      getUserStats: (userId) => get().userStatsCache[userId] || null,
      clear: () => set({
        profile: null,
        isOrganizer: false,
        followStats: null,
        organizerStats: null,
        hostedCount: 0,
        attendedCount: 0,
        walletBalance: null,
        dashboardCache: null,
        // keep userStatsCache so other-user visits stay instant across sign-outs
      }),
    }),
    {
      name: PROFILE_STORE_KEY,
      partialize: (state) => ({
        profile: state.profile,
        followStats: state.followStats,
        organizerStats: state.organizerStats,
        hostedCount: state.hostedCount,
        attendedCount: state.attendedCount,
        walletBalance: state.walletBalance,
        dashboardCache: state.dashboardCache,
        userStatsCache: state.userStatsCache,
      }),
    },
  ),
);
