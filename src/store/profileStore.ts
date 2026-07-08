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

const stripPII = (profile: Record<string, unknown> | null): Record<string, unknown> | null => {
  if (!profile) return null;
  const { email: _, phone: __, birthdate: ___, balance: ____, ...safe } = profile;
  return safe;
};

const stripDashboardPIICache = (cache: DashboardCache | null): DashboardCache | null => {
  if (!cache) return null;
  return { ...cache, transactions: [] };
};

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
      }),
    }),
    {
      name: PROFILE_STORE_KEY,
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          const stored = persisted as Record<string, unknown>;
          return { ...stored, profile: null, dashboardCache: null, walletBalance: null };
        }
        return persisted;
      },
      partialize: (state) => ({
        profile: stripPII(state.profile as Record<string, unknown> | null),
        followStats: state.followStats,
        organizerStats: state.organizerStats,
        attendedCount: state.attendedCount,
        dashboardCache: stripDashboardPIICache(state.dashboardCache),
        userStatsCache: state.userStatsCache,
      }),
    },
  ),
);
