# Realtime Event Catalog

Supabase Realtime uses WebSocket channels to push database changes and presence updates to clients. This catalog documents all subscriptions used in the Eventz codebase.

## How Supabase Realtime Works

```typescript
const channel = supabase
  .channel('channel-name')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: '...' }, callback)
  .on('presence', { event: 'sync' }, callback)
  .subscribe();
```

- **`postgres_changes`**: Listens for INSERT, UPDATE, DELETE on a specific table (requires Replication enabled on the table)
- **`presence`**: Tracks who is "online" in a channel (used for live viewer counts, online status)
- **Channel names** must be unique per subscription to avoid conflicts

---

## 1. Conversation Messages

Subscribe to new messages in a specific conversation.

| | |
|---|---|
| **Channel** | `messages:{conversationId}` |
| **Table** | `messages` |
| **Event** | `INSERT` |
| **Filter** | `conversation_id=eq.{conversationId}` |
| **Subscriber** | `subscribeToMessages()` in `conversations.ts:245` |

**Payload shape**:

```json
{
  "new": {
    "id": 1,
    "conversation_id": 42,
    "sender_id": "uuid",
    "content": "Hello!",
    "image_url": null,
    "is_read": false,
    "created_at": "2026-07-28T10:00:00Z"
  }
}
```

**Callback enriches** with sender profile by querying `profiles` table.

```typescript
const subscription = subscribeToMessages(conversationId, (message) => {
  setMessages(prev => [...prev, message]);
});
// Cleanup: subscription.unsubscribe()
```

---

## 2. Global Messages (All Conversations)

Subscribe to all message inserts across all conversations. Used for notification badges.

| | |
|---|---|
| **Channel** | `global_messages` |
| **Table** | `messages` |
| **Event** | `INSERT` |
| **Filter** | None (all inserts) |
| **Subscriber** | `subscribeToAllMessages()` in `conversations.ts:274` |

**Known issue**: This is a global subscription — every client receives every message. Does not scale well with high message volume.

```typescript
const subscription = subscribeToAllMessages((message) => {
  // Update unread badge
});
```

---

## 3. Stream Chat Messages

Subscribe to real-time chat messages during a live stream.

| | |
|---|---|
| **Channel** | `stream-chat-{eventId}-{random}` |
| **Table** | `stream_chat_messages` |
| **Event** | `INSERT` |
| **Filter** | `event_id=eq.{eventId}` |
| **Subscriber** | `subscribeToStreamMessages()` in `streamChat.ts:64` |

**Payload shape**:

```json
{
  "new": {
    "id": 1,
    "event_id": 42,
    "user_id": "uuid",
    "message": "Great stream!",
    "created_at": "2026-07-28T10:00:00Z"
  }
}
```

**Callback**: Enriches with user profile; filters out blocked users.

```typescript
const channel = subscribeToStreamMessages(eventId, (message) => {
  setChatMessages(prev => [...prev, message]);
});
```

---

## 4. Event Streaming Status

Subscribe to changes in `events.streaming` JSONB (live status, viewer counts).

| | |
|---|---|
| **Channel** | `event-streaming-{eventId}-{random}` |
| **Table** | `events` |
| **Event** | `UPDATE` |
| **Filter** | `id=eq.{eventId}` |
| **Subscriber** | `subscribeToEventStreaming()` in `events.ts:574` |

**Payload**: Returns `payload.new.streaming` — the updated JSONB object.

```typescript
const channel = subscribeToStreamStreaming(eventId, (streaming) => {
  setIsLive(streaming?.isLive ?? false);
  setViewerCount(streaming?.liveViewers ?? 0);
});
```

---

## 5. Event Likes

Subscribe to like/unlike changes on an event.

| | |
|---|---|
| **Channel** | `event-likes-{eventId}-{random}` |
| **Table** | `event_likes` |
| **Events** | `INSERT`, `DELETE` |
| **Filter** | `event_id=eq.{eventId}` |
| **Subscriber** | `subscribeToEventLikes()` in `events.ts:623` |

**Payload**:

```typescript
onChange({ delta: 1, userId: "uuid" })  // INSERT
onChange({ delta: -1, userId: "uuid" }) // DELETE
```

---

## 6. Stream Presence (Live Viewer Count)

Track who is currently watching a live stream using Supabase Presence.

| | |
|---|---|
| **Channel** | `stream-presence-{eventId}` |
| **Type** | Presence (not postgres_changes) |
| **Subscriber** | `subscribeToStreamPresence()` in `events.ts:591` |

**Tracked state**:

```json
{
  "userId": {
    "role": "viewer" | "host",
    "joinedAt": 1690000000000
  }
}
```

**Counting**: `recompute()` iterates presence state and counts entries with `role === 'viewer'`.

```typescript
const channel = subscribeToStreamPresence(eventId, { userId, role: 'viewer' }, (count) => {
  setViewerCount(count);
});
```

---

## 7. Online Users (Presence)

Track which users are currently online across the app.

| | |
|---|---|
| **Channel** | `online-users:{userId}:{random}` |
| **Type** | Presence |
| **Subscriber** | `subscribeToOnlineUsers()` in `follows.ts:163` |

**Tracked state**:

```json
{
  "userId": {
    "user_id": "uuid",
    "online_at": "2026-07-28T10:00:00Z"
  }
}
```

**Callback**: Returns array of online user IDs from presence state.

```typescript
const channel = subscribeToOnlineUsers(userId, (onlineUserIds) => {
  setOnlineUsers(onlineUserIds);
});
```

---

## 8. Saved Events

Subscribe to changes in the user's saved events.

| | |
|---|---|
| **Channel** | `saved_events:{userId}` |
| **Table** | `saved_events` |
| **Event** | `*` (INSERT, UPDATE, DELETE) |
| **Filter** | `user_id=eq.{userId}` |
| **Subscriber** | `subscribeToSavedEvents()` in `saved.ts:113` |

**Payload**: Not used — callback is a no-arg function that triggers a refetch.

```typescript
const channel = subscribeToSavedEvents(userId, () => {
  queryClient.invalidateQueries({ queryKey: ['savedEvents'] });
});
```

---

## 9. Saved Posts

Subscribe to changes in the user's saved posts.

| | |
|---|---|
| **Channel** | `saved_posts:{userId}` |
| **Table** | `saved_posts` |
| **Event** | `*` (INSERT, UPDATE, DELETE) |
| **Filter** | `user_id=eq.{userId}` |
| **Subscriber** | `subscribeToSavedPosts()` in `saved.ts:131` |

Same pattern as saved events — callback triggers a query refetch.

---

## 10. Transaction Status

Subscribe to payment transaction status changes (for wallet-ticket-payment flow).

| | |
|---|---|
| **Channel** | `transaction-status-{transactionId}` |
| **Table** | `transactions` |
| **Event** | `UPDATE` |
| **Filter** | `id=eq.{transactionId}` |
| **Subscriber** | `waitForTransactionCompletion()` in `transactions.ts:50` |

**Payload**: Checks `payload.new.status` for `completed`, `success`, `failed`, or `cancelled`.

```typescript
const success = await waitForTransactionCompletion(transactionId, 60000);
```

---

## Subscription Patterns

### Unique Channel Names

All subscriptions append a random suffix to prevent channel reuse across remounts:

```typescript
const channelName = `event-likes-${eventId}-${Math.random().toString(36).slice(2, 9)}`;
```

### Cleanup

Every subscription returns a `RealtimeChannel` object. Call `.unsubscribe()` or `supabase.removeChannel(channel)` on unmount:

```typescript
useEffect(() => {
  const channel = subscribeToMessages(conversationId, callback);
  return () => { channel.unsubscribe(); };
}, [conversationId]);
```

### Presence Tracking Pattern

```typescript
const channel = supabase.channel('channel-name', {
  config: { presence: { key: userId } },
});

channel
  .on('presence', { event: 'sync' }, recompute)
  .on('presence', { event: 'join' }, recompute)
  .on('presence', { event: 'leave' }, recompute)
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ role: 'viewer', joinedAt: Date.now() });
    }
  });
```

---

## Known Issues

### Global Subscriptions

`subscribeToAllMessages()` in `conversations.ts:274` subscribes to **all** message inserts without filtering. Every connected client receives every message. This does not scale and should be replaced with per-conversation subscriptions.

### Channel Name Collisions

If channel names are not unique (e.g., missing random suffix), Supabase reuses the existing subscription instead of creating a new one. This causes stale callbacks.

### No Unsubscribe on `subscribeToOnlineUsers`

The `subscribeToOnlineUsers()` function in `follows.ts:163` monkey-patches `channel.unsubscribe` to also call `supabase.removeChannel(channel)`. This is a workaround for Supabase not automatically removing presence channels.

### Replication Requirements

Postgres changes only work if the table has Replication enabled in Supabase Dashboard > Database > Replication. By default, only the `auth.users` table is replicated.

### Message Enrichment Overhead

Both `subscribeToMessages()` and `subscribeToStreamMessages()` make a secondary query to `profiles` for each incoming message. Under high message volume, this creates N+1 query patterns.

### Transaction Polling

`waitForTransactionCompletion()` first polls the current status, then subscribes for updates. If the transaction completes between the poll and the subscription, the callback may miss it (mitigated by the initial status check).
