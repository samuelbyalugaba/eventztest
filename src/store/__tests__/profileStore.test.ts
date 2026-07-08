import { describe, expect, it, beforeEach } from 'vitest';
import { useProfileStore } from '../profileStore';

describe('profileStore', () => {
  beforeEach(() => {
    useProfileStore.setState({
      profile: null,
      isOrganizer: false,
      followStats: null,
      organizerStats: null,
      hostedCount: 0,
      attendedCount: 0,
      walletBalance: null,
      dashboardCache: null,
      userStatsCache: {},
    });
  });

  it('initializes with default values', () => {
    const state = useProfileStore.getState();
    expect(state.profile).toBeNull();
    expect(state.isOrganizer).toBe(false);
    expect(state.followStats).toBeNull();
    expect(state.organizerStats).toBeNull();
    expect(state.hostedCount).toBe(0);
    expect(state.attendedCount).toBe(0);
    expect(state.walletBalance).toBeNull();
    expect(state.dashboardCache).toBeNull();
    expect(state.userStatsCache).toEqual({});
  });

  it('sets profile and isOrganizer', () => {
    const profile = { id: 'user-1', full_name: 'Test', is_organizer: true };
    useProfileStore.getState().setProfile(profile);
    const state = useProfileStore.getState();
    expect(state.profile).toEqual(profile);
    expect(state.isOrganizer).toBe(true);
  });

  it('sets followStats', () => {
    const stats = { followers: 10, following: 5 };
    useProfileStore.getState().setFollowStats(stats);
    expect(useProfileStore.getState().followStats).toEqual(stats);
  });

  it('sets hosted count', () => {
    useProfileStore.getState().setHostedCount(5);
    expect(useProfileStore.getState().hostedCount).toBe(5);
  });

  it('sets attended count', () => {
    useProfileStore.getState().setAttendedCount(3);
    expect(useProfileStore.getState().attendedCount).toBe(3);
  });

  it('sets wallet balance', () => {
    useProfileStore.getState().setWalletBalance(100);
    expect(useProfileStore.getState().walletBalance).toBe(100);
  });

  it('sets dashboard cache with partial data', () => {
    useProfileStore.getState().setDashboardCache({ events: [{ id: 1 }] });
    const cache = useProfileStore.getState().dashboardCache;
    expect(cache?.events).toEqual([{ id: 1 }]);
    expect(cache?.tickets).toEqual([]);
    expect(cache?.transactions).toEqual([]);
    expect(cache?.scans).toEqual([]);
    expect(cache?.updatedAt).toBeGreaterThan(0);
  });

  it('sets user stats', () => {
    useProfileStore.getState().setUserStats('user-1', { hosted: 2, followers: 10 });
    const stats = useProfileStore.getState().getUserStats('user-1');
    expect(stats?.hosted).toBe(2);
    expect(stats?.followers).toBe(10);
    expect(stats?.updatedAt).toBeGreaterThan(0);
  });

  it('returns null for unknown user stats', () => {
    const stats = useProfileStore.getState().getUserStats('unknown');
    expect(stats).toBeNull();
  });

  it('clears all state', () => {
    useProfileStore.getState().setProfile({ id: 'user-1', is_organizer: true });
    useProfileStore.getState().setHostedCount(5);
    useProfileStore.getState().clear();

    const state = useProfileStore.getState();
    expect(state.profile).toBeNull();
    expect(state.isOrganizer).toBe(false);
    expect(state.hostedCount).toBe(0);
    expect(state.dashboardCache).toBeNull();
  });

  it('sets organizer stats', () => {
    const stats = { total_events: 5, total_tickets_sold: 100 };
    useProfileStore.getState().setOrganizerStats(stats);
    expect(useProfileStore.getState().organizerStats).toEqual(stats);
  });
});
