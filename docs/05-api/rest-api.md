# REST API Reference

Client-side API modules in `src/utils/supabase/api/`. All functions use the shared Supabase client and interact with the PostgREST API or invoke Edge Functions.

## Base Configuration

```typescript
// src/utils/supabase/client.tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY, // JWT format required
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    }
  }
);
```

**Authentication**: All requests include the Supabase anon key via `apikey` header and a `Bearer` token from the active session. RLS policies on tables enforce per-user access.

---

## Auth Module

**File**: `src/utils/supabase/api/auth.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `onAuthStateChange` | `callback: (event, session) => void` | `Subscription` | Subscribe to auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED) |
| `updateUserEmail` | `email: string` | `Promise<void>` | Updates the authenticated user's email (triggers confirmation) |
| `deleteAccount` | none | `Promise<any>` | Invokes `delete-account` Edge Function; removes storage, auth user, and profile |
| `signOut` | none | `Promise<void>` | Signs out the current user and clears the session |

```typescript
import { onAuthStateChange, signOut, deleteAccount } from '@/utils/supabase/api';

// Listen for auth changes
const { data: { subscription } } = onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') console.log('User:', session.user);
  if (event === 'SIGNED_OUT') router.push('/login');
});

// Delete account
await deleteAccount();
```

---

## Profile Module

**File**: `src/utils/supabase/api/profile.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getProfile` | `userId: string` | `Promise<Profile>` | Fetches a single profile by ID |
| `updateProfile` | `userId: string, updates: Partial<Profile>` | `Promise<Profile>` | Upserts profile fields; sanitizes empty strings to null; blocks `is_organizer`/`verified` changes |
| `checkUsernameUnique` | `username: string, currentUserId?: string` | `Promise<boolean>` | Returns true if username is not taken |
| `becomeOrganizer` | `details: {full_name, username, organizer_type, location, bio, avatar_url, contact_email?}` | `Promise<any>` | RPC call to `become_organizer` — sets `is_organizer=true`, bypasses trigger |
| `searchProfiles` | `query: string` | `Promise<Profile[]>` | Searches by `username` or `full_name` using `ILIKE`; max 10 results |

```typescript
import { getProfile, becomeOrganizer, searchProfiles } from '@/utils/supabase/api';

const profile = await getProfile('user-uuid');
const results = await searchProfiles('john');
await becomeOrganizer({
  full_name: 'John Events',
  username: 'johnevents',
  organizer_type: 'Professional',
  location: 'Dar es Salaam',
  bio: 'Event organizer',
  avatar_url: 'https://...',
});
```

---

## Events Module

**File**: `src/utils/supabase/api/events.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getEvents` | `options?: {limit?, includePast?}` | `Promise<Event[]>` | Lists upcoming events (excludes `isInstant`), default limit 100 |
| `getOrganizerEvents` | `organizerId: string, options?: {includeInstant?}` | `Promise<Event[]>` | Events by organizer with ticket/save/post counts |
| `getEventById` | `id: number` | `Promise<Event>` | Single event with organizer profile |
| `getEventAttendees` | `eventId: number, limit?: number` | `Promise<Profile[]>` | Ticket holders (default 5) |
| `createEvent` | `eventData: Omit<Event, 'id'|'created_at'|'updated_at'>` | `Promise<Event>` | Creates event; validates date, title (3-100 chars), category, ticket tiers |
| `updateEvent` | `eventId: number, eventData: Partial<Event>` | `Promise<Event>` | Updates event fields with same validation |
| `deleteEvent` | `id: number` | `Promise<void>` | RPC `delete_event_complete` (cascading delete); fallback to manual deletion; cleans storage |
| `incrementEventView` | `eventId: number` | `Promise<void>` | RPC `increment_event_view` (non-critical) |
| `getEventAnalytics` | `eventId: number` | `Promise<EventAnalytics>` | RPC `get_event_analytics` — views, trends, demographics, revenue |
| `getLiveStreams` | none | `Promise<Event[]>` | Published events with `streaming.available=true, isLive=true` |
| `getUpcomingStreams` | none | `Promise<Event[]>` | Published events with streaming available but not currently live |
| `updateEventStreamingStatus` | `eventId: number, isLive: boolean` | `Promise<Event>` | Toggles `streaming.isLive`; sets timestamps; cleans stream chat on end |
| `toggleLikeEvent` | `eventId: number, userId: string` | `Promise<boolean>` | Like/unlike event (returns true if liked) |
| `getEventLikes` | `eventId: number` | `Promise<number>` | Total like count |
| `hasUserLikedEvent` | `eventId: number, userId: string` | `Promise<boolean>` | Check if user has liked event |
| `sendGift` | `eventId: amount: number, currency?: string` | `Promise<any>` | Invokes `send-gift` Edge Function; sends stream message |
| `updateLiveViewerCount` | `eventId: number, delta: number` | `Promise<Event>` | Adjusts `streaming.liveViewers` by delta (floored at 0) |
| `generateStreamKeys` | `eventId: number` | `Promise<{streamKey, ingestUrl, playbackUrl}>` | Invokes `cloudflare-stream-create` Edge Function |

```typescript
import { getEvents, createEvent, toggleLikeEvent } from '@/utils/supabase/api';

const events = await getEvents({ limit: 20, includePast: false });
const newEvent = await createEvent({
  title: 'Tech Meetup',
  date: '2026-08-15',
  time: '18:00',
  location: 'Dar es Salaam',
  category: 'Technology',
  subcategory: 'Meetup',
  price_range: 'Free',
  image_url: 'https://...',
  organizer_id: user.id,
  status: 'published',
});
await toggleLikeEvent(123, userId);
```

---

## Posts Module

**File**: `src/utils/supabase/api/posts.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getPosts` | `options?: {currentUserId?, eventId?, authorId?, limit?, offset?}` | `Promise<ApiPost[]>` | Feed with likes/comments counts, is_liked, is_saved; filters blocked users |
| `getProfilePostsGrid` | `options: {authorId, limit?, offset?}` | `Promise<ApiPost[]>` | Lightweight grid query for profile page |
| `getPostById` | `postId: number, currentUserId?: string` | `Promise<ApiPost>` | Single post with like/save status |
| `createPost` | `post: Omit<ApiPost, ...>` | `Promise<ApiPost>` | Requires text, images, or video; max 2000 chars |
| `updatePostCaption` | `postId: number, userId: string, caption: string` | `Promise<ApiPost>` | Updates content (owner only) |
| `deletePost` | `postId: number` | `Promise<void>` | Deletes post and its storage files |
| `toggleLikePost` | `postId: number, userId: string` | `Promise<boolean>` | Like/unlike; triggers push + email notifications |
| `toggleSavePost` | `postId: number, userId: string` | `Promise<boolean>` | Bookmark/unbookmark |
| `getPostComments` | `postId: number` | `Promise<PostComment[]>` | Comments with user profiles; filters blocked users |
| `createPostComment` | `postId: number, userId: string, text: string, parentId?: number` | `Promise<PostComment>` | Max 500 chars; triggers notifications |
| `toggleLikeComment` | `commentId: number, userId: string` | `Promise<boolean>` | Like/unlike comment |
| `incrementPostView` | `postId: number` | `Promise<void>` | RPC `increment_post_view` (non-critical) |

---

## Tickets Module

**File**: `src/utils/supabase/api/tickets.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getUserTickets` | `userId: string` | `Promise<Ticket[]>` | All tickets with event details; ordered by purchase date desc |
| `hasActiveVirtualTicket` | `userId: string, eventId: number` | `Promise<boolean>` | Checks for active Virtual ticket type |
| `createTicket` | `ticket: Omit<Ticket, 'id'|'event'> & {transaction_id?}` | `Promise<Ticket>` | RPC `purchase_ticket`; requires completed transaction for paid tickets |
| `scanTicket` | `ticketCode: string, eventId: number` | `Promise<any>` | RPC `scan_ticket`; validates and marks ticket as used |

```typescript
import { createTicket, scanTicket, getUserTickets } from '@/utils/supabase/api';

const ticket = await createTicket({
  event_id: 42,
  ticket_type: 'VIP',
  customer_name: 'Jane Doe',
  customer_email: 'jane@example.com',
  ticket_number: 'TIX-001',
  qr_code: 'qr-data',
  user_id: userId,
  price: 'TSh 50,000',
  transaction_id: 101,
  status: 'valid',
});

const result = await scanTicket('TIX-001', 42);
// { success: true, message: 'Ticket Verified', data: { customer_name, ticket_type } }
```

---

## Conversations Module

**File**: `src/utils/supabase/api/conversations.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getConversations` | `userId: string` | `Promise<Conversation[]>` | User's conversations with last message, unread count; filters blocked users |
| `getMessages` | `conversationId: number` | `Promise<Message[]>` | Messages ordered chronologically; checks block status |
| `sendMessage` | `conversationId: number, text: string, imageUrl?: string` | `Promise<Message>` | Max 5000 chars; validates blocks |
| `startConversation` | `otherUserId: string` | `Promise<Conversation>` | Creates or returns existing conversation; checks blocks |
| `deleteConversation` | `conversationId: number` | `Promise<void>` | Deletes conversation record |
| `deleteMessage` | `messageId: number` | `Promise<void>` | Deletes a single message |
| `markMessagesAsRead` | `conversationId: number, userId: string` | `Promise<void>` | Marks unread messages from others as read |
| `markConversationAsUnread` | `conversationId: number, userId: string` | `Promise<boolean>` | Marks last message from other user as unread |

---

## Follows Module

**File**: `src/utils/supabase/api/follows.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getFollowedUserIds` | `userId: string` | `Promise<string[]>` | IDs of users this person follows |
| `checkIsFollowing` | `followerId, followingId: string` | `Promise<boolean>` | Check follow status |
| `toggleFollow` | `followerId, followingId: string` | `Promise<boolean>` | Follow/unfollow; triggers push + email notifications |
| `getFollowersCount` | `userId: string` | `Promise<number>` | Follower count |
| `getFollowingCount` | `userId: string` | `Promise<number>` | Following count |
| `followUser` / `unfollowUser` | `followerId, followingId: string` | `Promise<void>` | Direct follow/unfollow (no toggle) |
| `isFollowing` | `followerId, followingId: string` | `Promise<boolean>` | Alias for checkIsFollowing |
| `getFollowers` / `getFollowing` | `userId: string` | `Promise<Profile[]>` | Full profile lists |

---

## Stream Chat Module

**File**: `src/utils/supabase/api/streamChat.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getStreamMessages` | `eventId: number` | `Promise<StreamMessage[]>` | Last 50 messages; filters blocked users |
| `sendStreamMessage` | `eventId: number, message: string` | `Promise<StreamMessage>` | Max 200 chars |

---

## Saved Module

**File**: `src/utils/supabase/api/saved.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getSavedEvents` | `userId: string` | `Promise<Event[]>` | Saved events with `isSaved`/`hasReminder` flags |
| `getSavedPosts` | `userId: string` | `Promise<ApiPost[]>` | Saved posts with like/comment counts |
| `toggleSaveEvent` | `eventId: number, userId: string` | `Promise<boolean>` | Bookmark/unbookmark event |
| `toggleReminder` | `eventId: number, userId: string` | `Promise<boolean>` | Toggle reminder on saved event |

---

## Moderation Module

**File**: `src/utils/supabase/api/moderation.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getBlockedUserIds` | `userId: string` | `Promise<Set<string>>` | All user IDs blocked by or blocking this user |
| `reportContent` | `{contentType, contentId, reason, details?, reportedUserId?}` | `Promise<Report \| null>` | Creates report; silently deduplicates (23505) |
| `blockUser` | `blockedUserId: string` | `Promise<void>` | Blocks a user; prevents interaction |
| `unblockUser` | `blockedUserId: string` | `Promise<void>` | Removes block |
| `assertUsersCanInteract` | `currentUserId, otherUserId: string` | `Promise<void>` | Throws if either user blocked the other |

`ReportContentType` = `'post' | 'comment' | 'profile' | 'message' | 'event' | 'stream'`

---

## Notifications Module

**File**: `src/utils/supabase/api/notifications.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getNotifications` | `userId: string` | `Promise<Notification[]>` | Aggregates follows, likes, comments, ticket sales, and event reminders; sorted by time |
| `markNotificationsAsRead` | `userId: string` | `Promise<void>` | Updates `last_notification_read_at` on profile |

---

## Transactions Module

**File**: `src/utils/supabase/api/transactions.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `createTransaction` | `{user_id, event_id, amount, currency, provider, status, type?, metadata?}` | `Promise<Transaction>` | Inserts payment record; merges `type` into metadata |
| `waitForTransactionCompletion` | `transactionId: number, timeoutMs?: number` | `Promise<boolean>` | Polls + Realtime subscription; resolves true on success, false on fail/timeout (default 60s) |

---

## Platform Module

**File**: `src/utils/supabase/api/platform.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getOrganizerStats` | `userId: string` | `Promise<OrganizerStats>` | RPC `get_organizer_stats` — events, followers, views, tickets, revenue |
| `getPlatformStats` | none | `Promise<{activeUsers, ticketsSold, eventsHosted}>` | Aggregate platform-wide counts |

---

## Search Module

**File**: `src/utils/supabase/api/search.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getTrending` | none | `Promise<{events, people}>` | Top 5 events by views + top 5 verified profiles |

---

## Streams Module

**File**: `src/utils/supabase/api/streams.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getProfileStreamedVideos` | `userId: string` | `Promise<CloudflareStream[]>` | Merges Cloudflare Stream recordings with event-based stream records |

---

## User Media Module

**File**: `src/utils/supabase/api/userMedia.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getUserMedia` | `userId: string` | `Promise<UserMedia[]>` | Photos/videos for a user profile |
| `incrementUserMediaView` | `mediaId: number` | `Promise<void>` | RPC `increment_media_view` |

---

## Storage Module

**File**: `src/utils/supabase/api/storage.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `uploadImage` | `file: File, bucket: 'events'\|'avatars'\|'posts', path?: string` | `Promise<string>` | Optimizes images; validates type/size (10MB img, 100MB video); retries 3x on network errors; returns public URL |
| `deleteFile` | `bucket: 'events'\|'avatars'\|'posts', url: string` | `Promise<void>` | Extracts path from URL and removes from storage |

**Allowed types**: JPG, PNG, WebP, GIF, MP4, WebM, MOV, M4V, 3GP, OGG

---

## Error Handling Pattern

All API functions follow this pattern:

```typescript
const { data, error } = await supabase.from('table').select('*');
if (error) throw error;
return data;
```

Edge Function invocations have a double-check pattern:

```typescript
const { data, error } = await supabase.functions.invoke('function-name', { body });
if (error) throw error;
if (data?.error) throw new Error(data.error);
return data;
```

**Common error codes**:
- `23505` — Unique constraint violation (handled gracefully in follows, reports)
- `42P01` — Missing table (handled in cloudflare_streams fallback)
- `42883` — Undefined function (fallback in deleteEvent)

---

## Rate Limiting

Supabase PostgREST does not impose client-side rate limits, but:

- **RLS policies** enforce per-user access and prevent unauthorized writes
- **Edge Functions** use idempotency keys for payment operations (`send-gift`, `wallet-ticket-payment`)
- **RPC functions** use `FOR UPDATE` row locking for concurrent access (`purchase_ticket`, `scan_ticket`)
- Client-side debounce is recommended for high-frequency calls like `incrementEventView` and `incrementPostView`
