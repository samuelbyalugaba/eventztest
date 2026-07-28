# Feed Service Design — Eventz

**Last Updated:** July 2026

---

## Responsibilities

- Display social feed with posts from followed users and trending content
- Support post interactions (like, comment, share, save)
- Handle infinite scroll pagination
- Manage post creation with image uploads
- Display video highlights with full-screen player

## API Functions

| Function | Purpose | File |
|---|---|---|
| `getPosts` | Fetch paginated feed posts | `posts.ts` |
| `getTrendingPosts` | Fetch trending posts | `posts.ts` |
| `getSavedPosts` | Fetch user's saved posts | `saved.ts` |
| `getProfilePostsGrid` | Fetch posts for profile grid | `posts.ts` |
| `getPostById` | Fetch single post | `posts.ts` |
| `createPost` | Create new post | `posts.ts` |
| `deletePost` | Delete post with storage cleanup | `posts.ts` |
| `toggleLikePost` | Like/unlike post | `posts.ts` |
| `toggleSavePost` | Save/unsave post | `posts.ts` |
| `getPostComments` | Fetch post comments | `posts.ts` |
| `createPostComment` | Add comment to post | `posts.ts` |
| `toggleLikeComment` | Like/unlike comment | `posts.ts` |

## Data Flow

```
User opens Feed
    ↓
TanStack Query checks cache
    ↓ (miss)
getPosts() → Supabase query → profiles join → postMapper
    ↓
Cache stored with queryKey: ['feed', userId]
    ↓
Infinite scroll triggers next page
    ↓
getPosts({ offset: 20 }) → append to cache
```

## State Management

- **Server state:** TanStack Query with `queryKeys.feed.firstPage(userId)`
- **Infinite query:** `useInfiniteQuery` with `pageParam` offset
- **Optimistic updates:** Like/save mutations update cache immediately
- **Stale time:** 5 minutes for feed data

## Caching Strategy

| Data | Cache Time | Stale Time | Refetch |
|---|---|---|---|
| Feed posts | 30 min | 5 min | On window focus |
| Trending | 10 min | 2 min | On window focus |
| Saved posts | 30 min | 5 min | On mutation |
| Profile posts | 30 min | 5 min | On mutation |

## Known Issues

1. **N+1 Pattern** — `getPosts` makes 3 extra queries per feed load (blocked users, liked posts, saved posts)
2. **Memory Growth** — Infinite scroll accumulates posts without cleanup
3. **Profile Enrichment** — Every post requires a JOIN to `profiles` table
4. **No Feed Ranking** — Posts are chronological, not algorithmic

## Component Architecture

```
Feed (page)
├── PostCard (individual post)
│   ├── PostHeader (user info)
│   ├── PostContent (text + images)
│   ├── PostMedia (single image / carousel)
│   ├── PostVideo (highlight player)
│   ├── PostActions (like, comment, share, save)
│   └── PostComments (threaded comments)
└── CreatePostFab (floating action button)
```
