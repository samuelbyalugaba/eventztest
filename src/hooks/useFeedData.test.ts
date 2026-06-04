import { afterEach, describe, expect, it } from 'vitest';
import { queryClient } from '../queryClient';
import { queryKeys } from '../queryKeys';
import { removePostFromFeedCache, removeUserPostsFromFeedCache } from './useFeedData';
import type { Post } from '../types';

const post = (id: number, userId: string): Post => ({
  id,
  user_id: userId,
  user: { id: userId, name: `User ${userId}`, username: `@${userId}`, avatar: '', verified: false },
  content: { text: `Post ${id}` },
  timestamp: 'now',
  likes: 0,
  comments: [],
  comments_count: 0,
  shares: 0,
  views: 0,
  isLiked: false,
  isSaved: false,
});

describe('feed query cache actions', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('removes deleted posts from first-page query payloads', () => {
    queryClient.setQueryData(queryKeys.feed.firstPage('viewer-1'), {
      posts: [post(1, 'a'), post(2, 'b')],
      count: 2,
    });

    removePostFromFeedCache(1);

    const cached = queryClient.getQueryData<{ posts: Post[]; count: number }>(queryKeys.feed.firstPage('viewer-1'));
    expect(cached?.posts.map((item) => item.id)).toEqual([2]);
    expect(cached?.count).toBe(2);
  });

  it('removes blocked user posts from paged query payloads', () => {
    queryClient.setQueryData(queryKeys.feed.page('viewer-1', 20), [post(3, 'blocked-user'), post(4, 'friend')]);

    removeUserPostsFromFeedCache('blocked-user');

    const cached = queryClient.getQueryData<Post[]>(queryKeys.feed.page('viewer-1', 20));
    expect(cached?.map((item) => item.id)).toEqual([4]);
  });
});
