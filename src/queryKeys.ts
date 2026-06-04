export const queryKeys = {
  events: {
    root: ['events'] as const,
    publicList: ['events', 'public'] as const,
    list: (userId?: string | null) => ['events', 'list', userId || 'anon'] as const,
  },
  feed: {
    root: ['feed'] as const,
    firstPage: (userId?: string | null) => ['feed', 'first-page', userId || 'anon'] as const,
    page: (userId: string | null | undefined, offset: number) => ['feed', 'page', userId || 'anon', offset] as const,
  },
  notifications: {
    list: (userId: string) => ['notifications', userId] as const,
  },
  profile: {
    root: ['profile'] as const,
    summary: (viewerId: string | null | undefined, profileId: string) => ['profile', 'summary', viewerId || 'anon', profileId] as const,
    posts: (profileId: string, offset: number) => ['profile', 'posts', profileId, offset] as const,
  },
  wallet: {
    transactions: (userId: string) => ['wallet', 'transactions', userId] as const,
  },
};
