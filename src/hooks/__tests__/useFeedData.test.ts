import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

vi.mock('../../utils/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({}),
      unsubscribe: vi.fn(),
    }),
  },
}));

vi.mock('../../utils/supabase/api', () => ({
  getPosts: vi.fn().mockResolvedValue([]),
  getProfile: vi.fn().mockResolvedValue({ id: 'test-user', full_name: 'Test User' }),
  getFollowedUserIds: vi.fn().mockResolvedValue([]),
  getNotifications: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../utils/postMapper', () => ({
  mapPostsToViewModel: vi.fn((posts) => posts),
}));

vi.mock('../../queryClient', () => ({
  queryClient: new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  }),
}));

import { useFeedData } from '../useFeedData';

function createWrapper() {
  const testQueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: testQueryClient },
      children
    );
  };
}

describe('useFeedData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty posts', () => {
    const { result } = renderHook(() => useFeedData(), { wrapper: createWrapper() });
    expect(result.current.posts).toEqual([]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.isLoadingMore).toBe(false);
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useFeedData(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('accepts an initial current user', () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' };
    const { result } = renderHook(() => useFeedData(mockUser), { wrapper: createWrapper() });
    expect(result.current.currentUser).toEqual(mockUser);
  });

  it('has notifications loading as false initially', () => {
    const { result } = renderHook(() => useFeedData(), { wrapper: createWrapper() });
    expect(result.current.notificationsLoading).toBe(false);
    expect(result.current.notifications).toEqual([]);
  });

  it('has empty followingIds initially', () => {
    const { result } = renderHook(() => useFeedData(), { wrapper: createWrapper() });
    expect(result.current.followingIds).toBeInstanceOf(Set);
    expect(result.current.followingIds.size).toBe(0);
  });
});
