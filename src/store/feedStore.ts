import { create } from 'zustand';
import type { Post } from '../types';

interface FeedState {
  posts: Post[];
  hasMore: boolean;
  lastFetchTime: number;
  followingIds: Set<string>;
  setPosts: (posts: Post[]) => void;
  appendPosts: (posts: Post[]) => void;
  setHasMore: (hasMore: boolean) => void;
  setFollowingIds: (ids: Set<string>) => void;
  updatePost: (postId: number, updater: (post: Post) => Post) => void;
  clear: () => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  posts: [],
  hasMore: true,
  lastFetchTime: 0,
  followingIds: new Set(),
  setPosts: (posts) => set({ posts, lastFetchTime: Date.now() }),
  appendPosts: (newPosts) => set((state) => {
    const existingIds = new Set(state.posts.map(p => p.id));
    const unique = newPosts.filter(p => !existingIds.has(p.id));
    return { posts: [...state.posts, ...unique] };
  }),
  setHasMore: (hasMore) => set({ hasMore }),
  setFollowingIds: (ids) => set({ followingIds: ids }),
  updatePost: (postId, updater) => set((state) => ({
    posts: state.posts.map(p => p.id === postId ? updater(p) : p),
  })),
  clear: () => set({ posts: [], hasMore: true, lastFetchTime: 0, followingIds: new Set() }),
}));
