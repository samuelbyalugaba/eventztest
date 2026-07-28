# Context Map — Eventz

**Last Updated:** July 2026

---

## Domain Communication Patterns

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Identity │────→│  Events  │────→│ Tickets  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │                ▼                ▼
     │          ┌──────────┐     ┌──────────┐
     │          │  Social  │     │ Payments │
     │          └────┬─────┘     └────┬─────┘
     │               │                │
     ▼               ▼                ▼
┌──────────┐   ┌──────────┐     ┌──────────┐
│Messaging │   │Streaming │     │Notifica- │
│          │   │          │     │  tions   │
└──────────┘   └──────────┘     └──────────┘
     │               │                │
     └───────────────┼────────────────┘
                     ▼
              ┌──────────┐
              │Moderation│
              └──────────┘
```

---

## Integration Map

| Source Domain | Target Domain | Integration Pattern | Data Flow |
|---|---|---|---|
| Identity → Events | Direct DB query | User creates event → `organizer_id` FK |
| Identity → Tickets | Direct DB query | User purchases ticket → `user_id` FK |
| Identity → Messaging | Direct DB query | User sends message → `sender_id` FK |
| Events → Tickets | RPC call | `purchase_ticket` RPC validates event exists |
| Events → Streaming | Realtime subscription | `subscribeToEventStreaming` watches status |
| Events → Payments | Edge Function | `send-gift` charges wallet for gifts |
| Tickets → Payments | RPC + Edge Function | `purchase_ticket` + `wallet-ticket-payment` |
| Social → Messaging | Direct query | Mutual follows determine online presence |
| Social → Notifications | Direct DB insert | New follower triggers notification |
| Messaging → Notifications | Direct DB insert | New message triggers notification |
| Streaming → Notifications | Direct DB insert | Stream start notifies followers |
| Streaming → Social | Realtime subscription | Stream presence updates viewer count |
| Moderation → All | Direct DB query | Reports can target any content type |
| Media → Events | Storage API | Event images stored in `events` bucket |
| Media → Social | Storage API | Post images stored in `posts` bucket |

---

## Shared Kernel: Auth Context

The Identity context is a **shared kernel** — every other context depends on `auth.uid()` for:
- Row-level security policies (every table checks user identity)
- RPC function authorization (`purchase_ticket` uses `auth.uid()`)
- Profile enrichment (user data joined on every query)

---

## ACL Pattern: Moderation Context

The Moderation context uses an **Anti-Corruption Layer** pattern:
- `getBlockedUserIds()` returns blocked user IDs
- Every query that returns user content filters out blocked users
- Reports are stored separately and don't block content directly

---

## Published Language: Realtime Events

The following events are published via Supabase Realtime and consumed by multiple contexts:

| Event | Publisher | Consumers |
|---|---|---|
| `messages` INSERT | Messaging | Messaging, Notifications |
| `notifications` INSERT | Notifications (via DB trigger) | Notifications |
| `events.streaming` UPDATE | Events | Streaming, Social |
| `post_likes` INSERT | Social | Social, Notifications |
| `saved_events` INSERT | Events | Events |

---

## Known Coupling Issues

1. **N+1 Profile Enrichment** — Every query joins `profiles` for user data, creating tight coupling between Identity and all content contexts
2. **Global Message Subscription** — `subscribeToAllMessages` subscribes to ALL messages, not just the user's conversations
3. **Missing Indexes** — `stream_chat_messages.event_id` lacks an index, coupling streaming performance to full table scans
4. **JSONB Columns** — `events.streaming`, `events.ticket_tiers`, `events.event_highlights` prevent proper relational queries
