# Notification Service Design — Eventz

**Last Updated:** July 2026

---

## Responsibilities

- In-app notification delivery
- Push notification delivery (Web Push)
- Notification read/unread management
- Real-time notification updates

## API Functions

| Function | Purpose | File |
|---|---|---|
| `getNotifications` | Get user's notifications | `notifications.ts` |
| `markNotificationsAsRead` | Mark all as read | `notifications.ts` |

## Edge Functions

| Function | Purpose | Secrets |
|---|---|---|
| `send-push-notification` | Send web push notification | VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY |

## Notification Types

| Type | Trigger | Content |
|---|---|---|
| `follow` | User follows you | "{name} started following you" |
| `like_post` | Someone likes your post | "{name} liked your post" |
| `comment` | Someone comments on your post | "{name} commented on your post" |
| `like_event` | Someone likes your event | "{name} liked your event" |
| `ticket_purchased` | Someone buys your event ticket | "Someone bought a ticket for {event}" |
| `message` | New message received | "New message from {name}" |
| `event_reminder` | Upcoming event reminder | "Reminder: {event} is tomorrow" |
| `stream_started` | Followed organizer goes live | "{name} is live now" |
| `gift_received` | Virtual gift received | "You received a gift from {name}" |

## Data Flow

```
Event occurs (like, follow, message, etc.)
    ↓
Database INSERT into notifications table
    ↓
Supabase Realtime broadcasts to user's channel
    ↓
Client receives notification update
    ↓
In-app notification badge updates
    ↓
Push notification sent (if user has subscription)
```

## Push Notification Setup

```
User grants notification permission
    ↓
Service worker registered (sw.js)
    ↓
Push subscription created (VAPID keys)
    ↓
Subscription saved to push_subscriptions table
    ↓
When notification triggered:
  send-push-notification Edge Function
    → Fetches user's push subscription
    → Sends Web Push notification
    → Delivered to device
```

## Known Issues

1. **5-Query Pattern** — `getNotifications` makes 5 separate database queries (N+1 pattern)
2. **No Pagination** — All notifications fetched at once
3. **No Preference System** — Users cannot opt out of specific notification types
4. **Push Subscription Migration** — Edge function exists for migrating subscriptions
