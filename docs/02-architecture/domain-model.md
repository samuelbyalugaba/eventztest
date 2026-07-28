# Domain Model — Eventz

**Last Updated:** July 2026

---

## Bounded Contexts

Eventz is organized into 10 bounded contexts, each owning specific data and business logic.

```
                    ┌─────────────┐
                    │  Identity   │
                    │  (Auth)     │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────┴──────┐  ┌───────┴──────┐  ┌───────┴──────┐
│    Events    │  │   Social     │  │  Messaging   │
│              │  │              │  │              │
└───────┬──────┘  └───────┬──────┘  └───────┬──────┘
        │                  │                  │
┌───────┴──────┐  ┌───────┴──────┐  ┌───────┴──────┐
│   Tickets    │  │   Payments   │  │ Notifications│
│              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
┌───────┴──────┐  ┌───────┴──────┐  ┌───────┴──────┐
│  Streaming   │  │    Media     │  │  Analytics   │
│              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
                           │
                    ┌──────┴──────┐
                    │ Moderation  │
                    └─────────────┘
```

---

## 1. Identity Context

**Purpose:** User authentication, profiles, and authorization

| Entity | Key Attributes | Invariants |
|---|---|---|
| Profile | id, username, full_name, avatar_url, bio, location, is_verified | username must be unique |
| Organizer Profile | id, user_id, organizer_type, cover_url, social_links | One per user |
| Session | JWT token, refresh token | Auto-refresh before expiry |

**Tables:** `profiles`, `organizer_profiles`

**Operations:** sign_up, sign_in, sign_out, update_profile, become_organizer

---

## 2. Events Context

**Purpose:** Event creation, management, and discovery

| Entity | Key Attributes | Invariants |
|---|---|---|
| Event | id, title, description, date, time, location, image_url, organizer_id, category | Must have organizer |
| Event Category | id, name, slug | Predefined categories |
| Event Highlight | id, event_id, title, video_url, thumbnail | Belongs to event |

**Tables:** `events`, `event_highlights`

**Operations:** create, update, delete, like, save, browse, search

---

## 3. Tickets Context

**Purpose:** Ticket types, purchasing, and scanning

| Entity | Key Attributes | Invariants |
|---|---|---|
| Ticket | id, event_id, user_id, ticket_type, price, barcode, status | One per purchase |
| Ticket Tier | name, price, quantity | JSONB in events table |

**Tables:** `tickets` (referenced via events JSONB)

**Operations:** purchase_ticket (RPC), scan_ticket (RPC), get_user_tickets

---

## 4. Payments Context

**Purpose:** Wallet, transactions, and financial operations

| Entity | Key Attributes | Invariants |
|---|---|---|
| Transaction | id, user_id, amount, type, status, reference | Must complete or fail |
| Wallet | user_id, balance | Balance >= 0 |

**Tables:** `transactions`

**Operations:** charge_wallet, transfer, create_transaction, wait_for_completion

---

## 5. Messaging Context

**Purpose:** Real-time one-to-one conversations

| Entity | Key Attributes | Invariants |
|---|---|---|
| Conversation | id, participant_1, participant_2 | Two participants only |
| Message | id, conversation_id, sender_id, text, read | Belongs to conversation |

**Tables:** `conversations`, `messages`

**Operations:** send_message, get_conversations, get_messages, mark_read

---

## 6. Social Context

**Purpose:** Follows, presence, and social graph

| Entity | Key Attributes | Invariants |
|---|---|---|
| Follow | follower_id, following_id | No self-follow, unique pair |
| Mutual Follow | bidirectional follow | Used for online presence |

**Tables:** `follows` (implicit via API)

**Operations:** follow, unfollow, check_mutual, get_followers, get_following

---

## 7. Notifications Context

**Purpose:** In-app and push notifications

| Entity | Key Attributes | Invariants |
|---|---|---|
| Notification | id, user_id, type, content, read | Per user |

**Tables:** `notifications`

**Operations:** get_notifications, mark_read, subscribe_to_notifications

---

## 8. Streaming Context

**Purpose:** Live broadcasting and VOD

| Entity | Key Attributes | Invariants |
|---|---|---|
| Stream | event_id, channel_name, status, viewer_count | One active stream per event |
| Stream Chat | id, event_id, user_id, message | Real-time messages |

**Tables:** `stream_chat_messages`, streaming data in events JSONB

**Operations:** go_live, join_stream, send_chat_message, end_stream

---

## 9. Media Context

**Purpose:** File uploads and storage

| Entity | Key Attributes | Invariants |
|---|---|---|
| Upload | bucket, path, url, mime_type | Public or private |

**Tables:** Supabase Storage (avatars, events, posts buckets)

**Operations:** upload_image, delete_file, get_public_url

---

## 10. Moderation Context

**Purpose:** Content moderation and user safety

| Entity | Key Attributes | Invariants |
|---|---|---|
| Report | id, reporter_id, content_type, content_id, reason | One report per user per content |
| Block | blocker_id, blocked_id | No self-block |

**Tables:** `reports`, `blocks`

**Operations:** report_content, block_user, unblock_user, get_blocked_ids
