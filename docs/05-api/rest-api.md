# REST API Reference

**Last Updated:** August 2026

Client-side API modules in `src/domains/*/api/`. All functions call the custom backend API, NOT Supabase directly.

## Base Configuration

```typescript
// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// All API calls go through the backend
const response = await fetch(`${API_URL}/api/v1/events`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

**Authentication**: All requests include a JWT token via `Authorization: Bearer <token>` header. Backend middleware validates the token and enforces authorization.

---

## Auth Module

**File**: `src/domains/identity/api/auth.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `signIn` | `email: string, password: string` | `Promise<Session>` | Signs in user, returns JWT |
| `signUp` | `email: string, password: string, name: string` | `Promise<Session>` | Creates account, returns JWT |
| `signOut` | none | `Promise<void>` | Signs out current user |
| `signInWithGoogle` | none | `Promise<void>` | Initiates Google OAuth flow |
| `signInWithApple` | none | `Promise<void>` | Initiates Apple OAuth flow |
| `signInWithMagicLink` | `email: string` | `Promise<void>` | Sends magic link email |
| `refreshToken` | `refreshToken: string` | `Promise<Session>` | Refreshes access token |
| `deleteAccount` | none | `Promise<void>` | Deletes user account |

```typescript
import { signIn, signUp, signOut } from '@/domains/identity/api';

// Sign in
const session = await signIn('user@example.com', 'password');

// Sign up
const session = await signUp('user@example.com', 'password', 'John Doe');

// Sign out
await signOut();
```

---

## Profile Module

**File**: `src/domains/identity/api/profile.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getProfile` | `userId: string` | `Promise<Profile>` | Fetches a single profile by ID |
| `updateProfile` | `userId: string, updates: Partial<Profile>` | `Promise<Profile>` | Updates profile fields |
| `checkUsernameUnique` | `username: string, currentUserId?: string` | `Promise<boolean>` | Returns true if username is not taken |
| `becomeOrganizer` | `details: {...}` | `Promise<any>` | Sets `is_organizer=true` |
| `searchProfiles` | `query: string` | `Promise<Profile[]>` | Searches by username or full_name |

```typescript
import { getProfile, becomeOrganizer, searchProfiles } from '@/domains/identity/api';

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

**File**: `src/domains/events/api/events.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getEvents` | `options?: {limit?, includePast?}` | `Promise<Event[]>` | Lists upcoming events |
| `getOrganizerEvents` | `organizerId: string, options?: {includeInstant?}` | `Promise<Event[]>` | Events by organizer |
| `getEventById` | `id: number` | `Promise<Event>` | Single event with organizer profile |
| `getEventAttendees` | `eventId: number, limit?: number` | `Promise<Profile[]>` | Ticket holders |
| `createEvent` | `eventData: Omit<Event, 'id'|'created_at'|'updated_at'>` | `Promise<Event>` | Creates event |
| `updateEvent` | `eventId: number, eventData: Partial<Event>` | `Promise<Event>` | Updates event fields |
| `deleteEvent` | `id: number` | `Promise<void>` | Deletes event and related data |
| `incrementEventView` | `eventId: number` | `Promise<void>` | Increments view count |
| `getEventAnalytics` | `eventId: number` | `Promise<EventAnalytics>` | Views, trends, revenue |
| `getLiveStreams` | none | `Promise<Event[]>` | Published live events |
| `getUpcomingStreams` | none | `Promise<Event[]>` | Upcoming streams |
| `updateEventStreamingStatus` | `eventId: number, isLive: boolean` | `Promise<Event>` | Toggles streaming status |
| `toggleLikeEvent` | `eventId: number, userId: string` | `Promise<boolean>` | Like/unlike event |
| `getEventLikes` | `eventId: number` | `Promise<number>` | Total like count |
| `hasUserLikedEvent` | `eventId: number, userId: string` | `Promise<boolean>` | Check if user has liked |
| `sendGift` | `eventId: number, amount: number, currency?: string` | `Promise<any>` | Sends gift to organizer |
| `updateLiveViewerCount` | `eventId: number, delta: number` | `Promise<Event>` | Adjusts viewer count |
| `generateStreamKeys` | `eventId: number` | `Promise<{streamKey, ingestUrl, playbackUrl}>` | Generates stream keys |

```typescript
import { getEvents, createEvent, toggleLikeEvent } from '@/domains/events/api';

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

**File**: `src/domains/events/api/posts.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getPosts` | `options?: {currentUserId?, eventId?, authorId?, limit?, offset?}` | `Promise<ApiPost[]>` | Feed with likes/comments |
| `getProfilePostsGrid` | `options: {authorId, limit?, offset?}` | `Promise<ApiPost[]>` | Grid query for profile page |
| `getPostById` | `postId: number, currentUserId?: string` | `Promise<ApiPost>` | Single post with status |
| `createPost` | `post: Omit<ApiPost, ...>` | `Promise<ApiPost>` | Creates post |
| `updatePostCaption` | `postId: number, userId: string, caption: string` | `Promise<ApiPost>` | Updates content |
| `deletePost` | `postId: number` | `Promise<void>` | Deletes post and storage |
| `toggleLikePost` | `postId: number, userId: string` | `Promise<boolean>` | Like/unlike |
| `toggleSavePost` | `postId: number, userId: string` | `Promise<boolean>` | Bookmark/unbookmark |
| `getPostComments` | `postId: number` | `Promise<PostComment[]>` | Comments with profiles |
| `createPostComment` | `postId: number, userId: string, text: string, parentId?: number` | `Promise<PostComment>` | Creates comment |
| `toggleLikeComment` | `commentId: number, userId: string` | `Promise<boolean>` | Like/unlike comment |
| `incrementPostView` | `postId: number` | `Promise<void>` | Increments view count |

---

## Tickets Module

**File**: `src/domains/tickets/api/tickets.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getUserTickets` | `userId: string` | `Promise<Ticket[]>` | All tickets with event details |
| `hasActiveVirtualTicket` | `userId: string, eventId: number` | `Promise<boolean>` | Checks for active Virtual ticket |
| `createTicket` | `ticket: Omit<Ticket, 'id'|'event'> & {transaction_id?}` | `Promise<Ticket>` | Purchases ticket |
| `scanTicket` | `ticketCode: string, eventId: number` | `Promise<any>` | Validates and marks ticket as used |

```typescript
import { createTicket, scanTicket, getUserTickets } from '@/domains/tickets/api';

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

**File**: `src/domains/messaging/api/conversations.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getConversations` | `userId: string` | `Promise<Conversation[]>` | User's conversations |
| `getMessages` | `conversationId: number` | `Promise<Message[]>` | Messages chronologically |
| `sendMessage` | `conversationId: number, text: string, imageUrl?: string` | `Promise<Message>` | Sends message |
| `startConversation` | `otherUserId: string` | `Promise<Conversation>` | Creates or returns conversation |
| `deleteConversation` | `conversationId: number` | `Promise<void>` | Deletes conversation |
| `deleteMessage` | `messageId: number` | `Promise<void>` | Deletes a single message |
| `markMessagesAsRead` | `conversationId: number, userId: string` | `Promise<void>` | Marks messages as read |
| `markConversationAsUnread` | `conversationId: number, userId: string` | `Promise<boolean>` | Marks as unread |

---

## Follows Module

**File**: `src/domains/social/api/follows.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getFollowedUserIds` | `userId: string` | `Promise<string[]>` | IDs of followed users |
| `checkIsFollowing` | `followerId, followingId: string` | `Promise<boolean>` | Check follow status |
| `toggleFollow` | `followerId, followingId: string` | `Promise<boolean>` | Follow/unfollow |
| `getFollowersCount` | `userId: string` | `Promise<number>` | Follower count |
| `getFollowingCount` | `userId: string` | `Promise<number>` | Following count |
| `followUser` / `unfollowUser` | `followerId, followingId: string` | `Promise<void>` | Direct follow/unfollow |
| `isFollowing` | `followerId, followingId: string` | `Promise<boolean>` | Alias for checkIsFollowing |
| `getFollowers` / `getFollowing` | `userId: string` | `Promise<Profile[]>` | Full profile lists |

---

## Stream Chat Module

**File**: `src/domains/streaming/api/streamChat.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getStreamMessages` | `eventId: number` | `Promise<StreamMessage[]>` | Last 50 messages |
| `sendStreamMessage` | `eventId: number, message: string` | `Promise<StreamMessage>` | Max 200 chars |

---

## Saved Module

**File**: `src/domains/social/api/saved.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getSavedEvents` | `userId: string` | `Promise<Event[]>` | Saved events with flags |
| `getSavedPosts` | `userId: string` | `Promise<ApiPost[]>` | Saved posts |
| `toggleSaveEvent` | `eventId: number, userId: string` | `Promise<boolean>` | Bookmark/unbookmark event |
| `toggleReminder` | `eventId: number, userId: string` | `Promise<boolean>` | Toggle reminder |

---

## Moderation Module

**File**: `src/domains/moderation/api/moderation.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getBlockedUserIds` | `userId: string` | `Promise<Set<string>>` | All blocked user IDs |
| `reportContent` | `{contentType, contentId, reason, details?, reportedUserId?}` | `Promise<Report \| null>` | Creates report |
| `blockUser` | `blockedUserId: string` | `Promise<void>` | Blocks a user |
| `unblockUser` | `blockedUserId: string` | `Promise<void>` | Removes block |
| `assertUsersCanInteract` | `currentUserId, otherUserId: string` | `Promise<void>` | Throws if blocked |

---

## Notifications Module

**File**: `src/domains/notifications/api/notifications.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getNotifications` | `userId: string` | `Promise<Notification[]>` | Aggregated notifications |
| `markNotificationsAsRead` | `userId: string` | `Promise<void>` | Marks as read |

---

## Transactions Module

**File**: `src/domains/payments/api/transactions.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `createTransaction` | `{user_id, event_id, amount, currency, provider, status, type?, metadata?}` | `Promise<Transaction>` | Creates payment record |
| `waitForTransactionCompletion` | `transactionId: number, timeoutMs?: number` | `Promise<boolean>` | Polls for completion |

---

## Platform Module

**File**: `src/domains/events/api/platform.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getOrganizerStats` | `userId: string` | `Promise<OrganizerStats>` | Events, followers, views |
| `getPlatformStats` | none | `Promise<{activeUsers, ticketsSold, eventsHosted}>` | Platform-wide counts |

---

## Search Module

**File**: `src/domains/search/api/search.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getTrending` | none | `Promise<{events, people}>` | Top events and profiles |

---

## Streams Module

**File**: `src/domains/streaming/api/streams.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getProfileStreamedVideos` | `userId: string` | `Promise<CloudflareStream[]>` | Stream recordings |

---

## User Media Module

**File**: `src/domains/media/api/userMedia.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `getUserMedia` | `userId: string` | `Promise<UserMedia[]>` | Photos/videos for profile |
| `incrementUserMediaView` | `mediaId: number` | `Promise<void>` | Increments view count |

---

## Storage Module

**File**: `src/domains/media/api/storage.ts`

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `uploadImage` | `file: File, bucket: 'events'\|'avatars'\|'posts', path?: string` | `Promise<string>` | Optimizes images; returns URL |
| `deleteFile` | `bucket: 'events'\|'avatars'\|'posts', url: string` | `Promise<void>` | Removes from storage |

**Allowed types**: JPG, PNG, WebP, GIF, MP4, WebM, MOV, M4V, 3GP, OGG

---

## Error Handling Pattern

All API functions follow this pattern:

```typescript
const response = await fetch(`${API_URL}/api/v1/events`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

if (!response.ok) {
  const error = await response.json();
  throw new ApiError(error.message, response.status);
}

return response.json();
```

**Common error codes**:
- `401` — Unauthorized (token expired/invalid)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `409` — Conflict (unique constraint violation)
- `422` — Validation error

---

## Rate Limiting

Backend implements rate limiting on:

- **Login/Register**: 5 requests per minute per IP
- **Password Reset**: 3 requests per minute per email
- **API General**: 100 requests per minute per user

Client-side debounce is recommended for high-frequency calls like `incrementEventView` and `incrementPostView`.
