# Schema Reference

Complete column-level reference for all 30 tables. Types derived from Supabase generated types (`src/integrations/supabase/types.ts`) and migration files.

## Table of Contents

- [audit_logs](#audit_logs)
- [cloudflare_streams](#cloudflare_streams)
- [comment_likes](#comment_likes)
- [comments](#comments-dead)
- [conversations](#conversations)
- [email_deliveries](#email_deliveries)
- [email_preferences](#email_preferences)
- [event_likes](#event_likes)
- [events](#events)
- [feature_flags](#feature_flags)
- [follows](#follows)
- [idempotency_keys](#idempotency_keys)
- [likes](#likes-dead)
- [messages](#messages)
- [notifications](#notifications)
- [organizer_profiles](#organizer_profiles)
- [post_comments](#post_comments)
- [post_likes](#post_likes)
- [posts](#posts)
- [profiles](#profiles)
- [push_subscriptions](#push_subscriptions)
- [reports](#reports)
- [saved_events](#saved_events)
- [saved_posts](#saved_posts)
- [stream_chat_messages](#stream_chat_messages)
- [tickets](#tickets)
- [transactions](#transactions)
- [user_blocks](#user_blocks)
- [user_media](#user_media)
- [user_roles](#user_roles)

---

## audit_logs

Admin action audit trail. No FK constraints (orphaned entries acceptable for audit).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `admin_id` | uuid | YES | NULL | Admin who performed action (no FK — orphaned OK) |
| `target_id` | uuid | YES | NULL | Target entity ID (no FK — orphaned OK) |
| `target_type` | text | YES | NULL | Type of target (e.g., 'user', 'event') |
| `action` | text | NO | — | Action performed |
| `old_value` | jsonb | YES | NULL | Previous state |
| `new_value` | jsonb | YES | NULL | New state |
| `metadata` | jsonb | YES | NULL | Additional context |
| `created_at` | timestamptz | YES | `NOW()` | When action occurred |

**RLS**: Enabled (service_role only)
**Migration**: Not in a dedicated migration; created via schema management

---

## cloudflare_streams

Cloudflare Stream VOD and live input metadata.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `user_id` | uuid | NO | — | Owner (`→ profiles.id`, CASCADE) |
| `event_id` | bigint | YES | NULL | Associated event (`→ events.id`, SET NULL) |
| `uid` | text | NO | — | Cloudflare Stream UID (UNIQUE) |
| `live_input_uid` | text | YES | NULL | Live input identifier |
| `title` | text | YES | `'Streamed video'` | Display title |
| `thumbnail_url` | text | YES | NULL | Thumbnail URL |
| `preview_url` | text | YES | NULL | Preview image URL |
| `playback_url` | text | YES | NULL | HLS playback URL |
| `duration` | numeric | YES | NULL | Video duration in seconds |
| `status` | text | YES | NULL | Stream status |
| `raw_payload` | jsonb | NO | `'{}'` | Full Cloudflare API response |
| `created_at` | timestamptz | NO | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `NOW()` | Last update timestamp |

**Indexes**: `(user_id, created_at DESC)`, `(event_id)`
**RLS**: SELECT public; ALL own only
**Migration**: `20260313000004_create_cloudflare_streams.sql`

---

## comment_likes

Likes on post comments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `comment_id` | number | NO | — | Comment liked (`→ post_comments.id`, CASCADE) |
| `user_id` | uuid | NO | — | User who liked (`→ profiles.id`, CASCADE) |
| `created_at` | timestamptz | NO | `NOW()` | Like timestamp |

**RLS**: Enabled
**Migration**: Part of initial schema

---

## comments (DEAD)

**Status**: Duplicate of `post_comments`. Zero API references. Drop candidate.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `post_id` | number | NO | — | Post commented on (`→ posts.id`, CASCADE) |
| `user_id` | uuid | NO | — | Comment author (`→ profiles.id`, CASCADE) |
| `text` | text | NO | — | Comment body |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |

---

## conversations

1:1 direct message conversation between two users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `participant1_id` | uuid | NO | — | First participant (`→ profiles.id`, CASCADE) |
| `participant2_id` | uuid | NO | — | Second participant (`→ profiles.id`, CASCADE) |
| `created_at` | timestamptz | NO | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `NOW()` | Last message timestamp |

**RLS**: SELECT/INSERT/DELETE where user is a participant. INSERT requires `auth.uid() = participant1_id`.
**Migration**: `20260310120021_secure_messaging.sql`

---

## email_deliveries

Delivery log for emails sent via Resend provider.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | YES | NULL | Recipient (`→ profiles.id`, SET NULL) |
| `recipient_email` | text | NO | — | Email address sent to |
| `category` | text | NO | `'transactional'` | One of: transactional, security, update, event_reminder, social, marketing, support |
| `template` | text | YES | NULL | Email template name |
| `subject` | text | NO | — | Email subject line |
| `status` | text | NO | `'queued'` | One of: queued, sent, failed, skipped |
| `provider` | text | NO | `'resend'` | Email provider |
| `provider_message_id` | text | YES | NULL | Provider's message ID |
| `provider_response` | jsonb | NO | `'{}'` | Full provider response |
| `error` | text | YES | NULL | Error message if failed |
| `metadata` | jsonb | NO | `'{}'` | Additional context |
| `sent_at` | timestamptz | YES | NULL | When email was sent |
| `created_at` | timestamptz | NO | `NOW()` | Record creation |

**Indexes**: `(user_id, created_at DESC)`, `(status, created_at DESC)`
**RLS**: SELECT own only
**Migration**: `20260611145454_email_system.sql`

---

## email_preferences

Per-user email category opt-in settings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `user_id` | uuid | NO | — | Primary key = FK (`→ profiles.id`, CASCADE) |
| `product_updates` | boolean | NO | `true` | Product update emails |
| `event_reminders` | boolean | NO | `true` | Event reminder emails |
| `social_notifications` | boolean | NO | `false` | Social notification emails |
| `marketing` | boolean | NO | `true` | Marketing emails |
| `transactional` | boolean | NO | `true` | Transactional emails |
| `security` | boolean | NO | `true` | Security alert emails |
| `unsubscribed_at` | timestamptz | YES | NULL | Global unsubscribe timestamp |
| `created_at` | timestamptz | NO | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `NOW()` | Last update (trigger) |

**RLS**: SELECT/INSERT/UPDATE own only
**Migration**: `20260611145454_email_system.sql`

---

## event_likes

Users who liked/saved an event.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `event_id` | number | NO | — | Event liked (`→ events.id`, CASCADE) |
| `user_id` | uuid | NO | — | User who liked (`→ profiles.id`, CASCADE) |
| `created_at` | timestamptz | NO | `NOW()` | Like timestamp |

**RLS**: Enabled
**Migration**: Part of initial schema

---

## events

Core event entity. Contains JSONB columns for streaming config, ticket tiers, and highlights.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `organizer_id` | uuid | NO | — | Event organizer (`→ profiles.id`, RESTRICT) |
| `title` | text | NO | — | Event title |
| `description` | text | YES | NULL | Event description |
| `category` | text | NO | — | Event category |
| `subcategory` | text | YES | NULL | Event subcategory |
| `date` | text | NO | — | Event date (stored as text, not date) |
| `time` | text | YES | NULL | Event time |
| `location` | text | NO | — | Venue/location |
| `city` | text | YES | NULL | City |
| `image_url` | text | YES | NULL | Cover image URL |
| `price` | text | YES | NULL | Display price (text) |
| `price_range` | text | YES | NULL | Price range display |
| `attendees` | integer | YES | NULL | Attendee count |
| `views` | integer | YES | NULL | View counter |
| `status` | text | YES | NULL | Event status (e.g., 'published', 'draft') |
| `streaming` | jsonb | YES | NULL | Streaming config: `{provider, live_input_uid, stream_key, ingest_url, playback_url, isLive, liveViewers, available}` |
| `ticket_tiers` | jsonb | YES | NULL | Array of `{name, price, available, features, color}` |
| `event_highlights` | jsonb | YES | NULL | Array of `{image, video, caption, type, mediaType}` |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `NOW()` | Last update timestamp |

**Indexes**: `(organizer_id)`
**RLS**: SELECT public; INSERT/UPDATE organizer only; DELETE via RPC
**Migrations**: Initial schema, `20260309000100_unified_profile.sql`, `20260310120007_fix_integrity.sql`

---

## feature_flags

Feature toggle configuration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `key` | text | NO | — | Feature flag key (e.g., 'dark_mode') |
| `description` | text | YES | NULL | Human-readable description |
| `enabled` | boolean | YES | `false` | Whether flag is active |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `NOW()` | Last update |

**RLS**: Not verified — potential issue if public read is allowed
**Migration**: Part of initial schema

---

## follows

Follower/following relationships. CASCADE on both FKs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `follower_id` | uuid | NO | — | Follower user (`→ profiles.id`, CASCADE) |
| `following_id` | uuid | NO | — | Followed user (`→ profiles.id`, CASCADE) |
| `created_at` | timestamptz | NO | `NOW()` | Follow timestamp |

**Indexes**: `(follower_id)`, `(following_id)`
**RLS**: INSERT/DELETE self only
**Migration**: `20260310120007_fix_integrity.sql` (CASCADE fix)

---

## idempotency_keys

Prevents duplicate financial operations. 24-hour TTL with scheduled cleanup.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NO | — | User (`→ auth.users.id`, CASCADE) |
| `key` | text | NO | — | Idempotency key (client-generated) |
| `operation` | text | NO | — | Operation type (e.g., 'wallet_payment', 'gift') |
| `result` | jsonb | YES | NULL | Operation result |
| `status` | text | NO | `'pending'` | One of: pending, completed, failed |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |
| `expires_at` | timestamptz | YES | `NOW() + 24h` | Expiration (cleanup target) |

**Indexes**: `(user_id, key)`, `(expires_at)`
**RLS**: SELECT/INSERT/UPDATE own; service_role ALL
**Migration**: `20260723000000_create_idempotency_keys.sql`

---

## likes (DEAD)

**Status**: Duplicate of `post_likes`. Identical schema. Drop candidate.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `post_id` | number | NO | — | Post liked (`→ posts.id`, CASCADE) |
| `user_id` | uuid | NO | — | User who liked (`→ profiles.id`, CASCADE) |
| `created_at` | timestamptz | YES | `NOW()` | Like timestamp |

---

## messages

Individual message in a 1:1 conversation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `conversation_id` | number | NO | — | Parent conversation (`→ conversations.id`, CASCADE) |
| `sender_id` | uuid | NO | — | Message author (`→ profiles.id`, CASCADE) |
| `content` | text | NO | — | Message body |
| `image_url` | text | YES | NULL | Attached image URL |
| `is_read` | boolean | YES | `false` | Read status |
| `created_at` | timestamptz | NO | `NOW()` | Send timestamp |

**RLS**: SELECT/INSERT/UPDATE/DELETE where user is conversation participant. INSERT requires `auth.uid() = sender_id`.
**Migration**: `20260310120021_secure_messaging.sql`

---

## notifications

In-app notification events.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `user_id` | uuid | NO | — | Recipient (`→ profiles.id`, CASCADE) |
| `actor_id` | uuid | YES | NULL | User who triggered notification (`→ profiles.id`, CASCADE) |
| `type` | text | NO | — | Notification type (e.g., 'follow', 'like', 'comment') |
| `title` | text | NO | — | Notification title |
| `message` | text | NO | — | Notification body |
| `read` | boolean | YES | `false` | Read status |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |

**RLS**: Enabled
**Migration**: Part of initial schema

---

## organizer_profiles

Legacy organizer metadata table. **Missing FK to `profiles`** — orphaned rows possible.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | — | Should reference `profiles.id` but has NO FK |
| `organizer_name` | text | YES | NULL | Display name |
| `organizer_type` | text | YES | NULL | Type of organizer |
| `organizer_avatar_url` | text | YES | NULL | Avatar URL |
| `avatar_url` | text | YES | NULL | Avatar URL (alternate) |
| `cover_url` | text | YES | NULL | Cover image URL |
| `bio` | text | YES | NULL | Bio text |
| `description` | text | YES | NULL | Long description |
| `location` | text | YES | NULL | Location |
| `website` | text | YES | NULL | Website URL |
| `contact_email` | text | YES | NULL | Contact email |
| `phone` | text | YES | NULL | Phone number |
| `social_links` | jsonb | YES | `'{}'` | `{instagram, facebook, twitter}` |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `NOW()` | Last update |

**RLS**: SELECT public; INSERT/UPDATE own only (via `auth.uid() = id`)
**Migration**: `20260310120010_fix_qa_vulnerabilities.sql`, `20260309000100_unified_profile.sql`

---

## post_comments

Comments on posts with self-referential threading.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `post_id` | number | NO | — | Post commented on (`→ posts.id`, CASCADE) |
| `user_id` | uuid | NO | — | Comment author (`→ profiles.id`, CASCADE) |
| `text` | text | NO | — | Comment body |
| `parent_id` | number | YES | NULL | Parent comment for threading (`→ post_comments.id`, SET NULL) |
| `created_at` | timestamptz | NO | `NOW()` | Creation timestamp |

**Indexes**: `(post_id)`, `(user_id)`
**RLS**: INSERT self only
**Migration**: `20260310120007_fix_integrity.sql` (CASCADE fix)

---

## post_likes

Likes on posts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `post_id` | number | NO | — | Post liked (`→ posts.id`, CASCADE) |
| `user_id` | uuid | NO | — | User who liked (`→ profiles.id`, CASCADE) |
| `created_at` | timestamptz | NO | `NOW()` | Like timestamp |

**Indexes**: `(post_id)`, `(user_id)`
**RLS**: INSERT/DELETE self only
**Migration**: `20260310120007_fix_integrity.sql` (CASCADE fix)

---

## posts

User-generated posts (text, images, video). Optional event tag.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `user_id` | uuid | NO | — | Author (`→ profiles.id`, CASCADE) |
| `event_id` | number | YES | NULL | Tagged event (`→ events.id`, SET NULL) |
| `content` | text | YES | NULL | Post text body |
| `image_urls` | text[] | YES | NULL | Array of image URLs (carousel) |
| `video_url` | text | YES | NULL | Video URL |
| `duration` | text | YES | NULL | Video duration |
| `hashtags` | text[] | YES | NULL | Array of hashtags |
| `posted_as_organizer` | boolean | YES | `false` | Posted from organizer profile |
| `views` | integer | YES | NULL | View counter |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |

**RLS**: DELETE own only; SELECT public
**Migration**: `20260310120011_link_posts_to_organizer_profiles.sql`, `20260313000001_fix_posts_constraint.sql`

---

## profiles

Core user profile. Extends `auth.users` with app-specific fields.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | — | Primary key (matches `auth.users.id`) |
| `username` | text | YES | NULL | Unique username |
| `full_name` | text | YES | NULL | Display name |
| `email` | text | YES | NULL | Email address |
| `avatar_url` | text | YES | NULL | Profile picture URL |
| `cover_url` | text | YES | NULL | Cover image URL |
| `bio` | text | YES | NULL | Bio text |
| `description` | text | YES | NULL | Long description |
| `location` | text | YES | NULL | Location |
| `phone` | number | YES | NULL | Phone number |
| `contact_email` | text | YES | NULL | Contact email |
| `birthdate` | text | YES | NULL | Birth date |
| `website` | text | YES | NULL | Website URL |
| `is_organizer` | boolean | YES | `false` | Organizer flag (protected by trigger) |
| `organizer_type` | text | YES | NULL | Type of organizer (protected by trigger) |
| `verified` | boolean | YES | `false` | Verified badge (protected by trigger) |
| `social_links` | jsonb | YES | `'{}'` | Social media links |
| `last_notification_read_at` | timestamptz | YES | NULL | Last notification read timestamp |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `NOW()` | Last update (trigger) |

**RLS**: SELECT public; UPDATE self-only (cannot change `is_organizer`, `verified`, `organizer_type`)
**Trigger**: `check_profile_updates()` blocks privileged field changes
**Migration**: `20260309000100_unified_profile.sql` (merged organizer_profiles fields)

---

## push_subscriptions

Web push notification endpoint registrations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NO | — | Subscriber (`→ auth.users.id`, CASCADE) |
| `endpoint` | text | NO | — | Push subscription endpoint (UNIQUE) |
| `p256dh` | text | NO | — | Encryption key |
| `auth` | text | NO | — | Auth key |
| `user_agent` | text | YES | NULL | Browser user agent |
| `platform` | text | YES | NULL | Platform (e.g., 'web', 'android') |
| `enabled` | boolean | NO | `true` | Whether subscription is active |
| `last_used_at` | timestamptz | YES | NULL | Last push sent |
| `created_at` | timestamptz | NO | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `NOW()` | Last update (trigger) |

**Indexes**: `(user_id, enabled)`
**RLS**: SELECT/INSERT/UPDATE/DELETE own only
**Migration**: `20260602094112_add_push_subscriptions.sql`, `20260603072102_fix_push_subscription_rls.sql`

---

## reports

User-generated content reports for moderation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `reporter_id` | uuid | YES | NULL | Reporter (`→ profiles.id`, SET NULL) |
| `reported_user_id` | uuid | YES | NULL | Reported user (`→ profiles.id`, SET NULL) |
| `content_type` | text | NO | — | One of: post, comment, profile, message, event, stream |
| `content_id` | text | NO | — | ID of reported content |
| `reason` | text | NO | — | Report reason |
| `details` | text | YES | NULL | Additional details |
| `status` | text | YES | `'open'` | One of: open, reviewing, resolved, dismissed |
| `resolution_note` | text | YES | NULL | Moderator notes |
| `resolved_by` | uuid | YES | NULL | Moderator who resolved (`→ profiles.id`, SET NULL) |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `NOW()` | Last update (trigger) |

**Indexes**: `(status, created_at DESC)`, `(content_type, content_id)`, partial unique on `(reporter_id, content_type, content_id) WHERE status IN ('open','reviewing')`
**RLS**: INSERT own; SELECT reporter OR admin/moderator; UPDATE admin/moderator
**Migration**: `20260528223151_app_review_moderation_tables.sql`

---

## saved_events

Bookmarked events with optional reminder flag.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `event_id` | number | NO | — | Saved event (`→ events.id`, CASCADE) |
| `user_id` | uuid | NO | — | User who saved (`→ profiles.id`, CASCADE) |
| `is_reminder` | boolean | YES | `false` | Reminder enabled |
| `created_at` | timestamptz | NO | `NOW()` | Save timestamp |

**RLS**: Enabled
**Migration**: `20260310120007_fix_integrity.sql` (CASCADE fix)

---

## saved_posts

Bookmarked posts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `post_id` | number | NO | — | Saved post (`→ posts.id`, CASCADE) |
| `user_id` | uuid | NO | — | User who saved (`→ profiles.id`, CASCADE) |
| `created_at` | timestamptz | NO | `NOW()` | Save timestamp |

**RLS**: Enabled
**Migration**: `20260310120007_fix_integrity.sql` (CASCADE fix)

---

## stream_chat_messages

Live stream chat messages per event.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `event_id` | number | NO | — | Event (`→ events.id`, RESTRICT) |
| `user_id` | uuid | NO | — | Message author (`→ profiles.id`, CASCADE) |
| `message` | text | NO | — | Chat message body |
| `created_at` | timestamptz | NO | `NOW()` | Send timestamp |

**RLS**: Enabled
**Note**: Missing index on `event_id` (identified performance issue)
**Migration**: Part of initial schema

---

## tickets

Purchased event tickets.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `event_id` | number | NO | — | Event (`→ events.id`, RESTRICT) |
| `user_id` | uuid | NO | — | Purchaser (`→ profiles.id`, CASCADE) |
| `ticket_number` | text | NO | — | Unique ticket identifier |
| `barcode` | text | NO | — | Barcode value |
| `qr_code` | text | YES | NULL | QR code data |
| `price` | text | NO | — | **Stored as text** (e.g., "TZS 15,000") |
| `ticket_type` | text | NO | — | Tier name (e.g., "VIP", "General") |
| `customer_name` | text | NO | — | Buyer name |
| `customer_email` | text | NO | — | Buyer email |
| `status` | text | YES | NULL | Ticket status (e.g., 'valid', 'scanned', 'cancelled') |
| `scanned_at` | timestamptz | YES | NULL | Scan timestamp |
| `scanned_by` | text | YES | NULL | Scanner ID |
| `purchase_date` | timestamptz | YES | `NOW()` | Purchase timestamp |
| `created_at` | timestamptz | YES | `NOW()` | Record creation |

**Indexes**: `(user_id)`, `(event_id)`, `(purchase_date)`
**RLS**: INSERT via RPC only (policy dropped); SELECT own only
**Migration**: `20260310120013_race_condition_fixes.sql` (RPC rewrite)

---

## transactions

Payment ledger for wallet operations and ticket purchases.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `user_id` | uuid | NO | — | Payer (`→ profiles.id`, CASCADE) |
| `event_id` | number | YES | NULL | Related event (`→ events.id`, SET NULL) |
| `ticket_id` | number | YES | NULL | Related ticket (`→ tickets.id`, SET NULL) |
| `amount` | numeric | NO | — | Payment amount |
| `currency` | text | YES | NULL | Currency code |
| `provider` | text | NO | — | Payment provider (e.g., 'ntzs') |
| `provider_transaction_id` | text | YES | NULL | External transaction ID |
| `status` | text | YES | NULL | Status (e.g., 'pending', 'completed', 'failed') |
| `metadata` | jsonb | YES | NULL | Additional context |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `NOW()` | Last update |

**RLS**: INSERT self-only (`auth.uid() = user_id`); SELECT self-only
**Migration**: `20260310120016_create_transactions_table.sql`, `20260310120009_fix_transactions_rls.sql`, `20260310120019_fix_transactions_rls.sql`

---

## user_blocks

Block relationships between users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `blocker_id` | uuid | NO | — | User who blocks (`→ profiles.id`, CASCADE) |
| `blocked_id` | uuid | NO | — | User who is blocked (`→ profiles.id`, CASCADE) |
| `created_at` | timestamptz | NO | `NOW()` | Block timestamp |

**PK**: Composite `(blocker_id, blocked_id)`
**Check**: `blocker_id <> blocked_id` (no self-block)
**Indexes**: `(blocked_id)`
**RLS**: INSERT own; SELECT own (as blocker or blocked); DELETE own (as blocker)
**Migration**: `20260528223151_app_review_moderation_tables.sql`

---

## user_media

User-uploaded media (images, videos, highlights).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint | NO | `bigserial` | Primary key |
| `user_id` | uuid | NO | — | Uploader (`→ profiles.id`, CASCADE) |
| `event_id` | number | YES | NULL | Associated event (`→ events.id`, SET NULL) |
| `url` | text | NO | — | Media URL |
| `thumbnail_url` | text | YES | NULL | Thumbnail URL |
| `media_type` | text | NO | — | Type (e.g., 'image', 'video') |
| `caption` | text | YES | NULL | Caption text |
| `duration` | text | YES | NULL | Video duration |
| `likes` | integer | YES | NULL | Like count |
| `views` | integer | YES | NULL | View count |
| `created_at` | timestamptz | NO | `NOW()` | Upload timestamp |

**RLS**: Enabled
**Migration**: Part of initial schema

---

## user_roles

Role-based access control. **Missing FK to `profiles`**.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NO | — | User (no FK constraint) |
| `role` | app_role | NO | — | Enum: 'admin', 'moderator', 'user' |
| `created_at` | timestamptz | YES | `NOW()` | Creation timestamp |

**Enum**: `app_role = 'admin' | 'moderator' | 'user'`
**RLS**: Enabled
**Migration**: Part of initial schema

---

## RPC Functions

| Function | Parameters | Returns | Security | Purpose |
|----------|-----------|---------|----------|---------|
| `purchase_ticket` | `p_event_id`, `p_ticket_type`, `p_customer_name`, `p_customer_email`, `p_ticket_number`, `p_qr_code`, optional `p_price`, `p_user_id`, `p_transaction_id` | json | SECURITY DEFINER | Purchase ticket with race condition protection |
| `scan_ticket` | `p_event_id`, `p_ticket_code` | json | SECURITY DEFINER | Scan/validate ticket at event |
| `become_organizer` | `p_username`, `p_full_name`, `p_avatar_url`, `p_bio`, `p_location`, `p_organizer_type`, `p_contact_email` | json | SECURITY DEFINER | Upgrade user to organizer |
| `downgrade_to_personal_account` | none | void | SECURITY DEFINER | Remove organizer status |
| `delete_event_complete` | `target_event_id` | void | SECURITY DEFINER | Hard delete event with cascade |
| `get_organizer_stats` | `target_user_id` | json | SECURITY DEFINER | Aggregated organizer analytics |
| `get_event_analytics` | `target_event_id` | json | SECURITY DEFINER | Event analytics with trends |
| `increment_event_view` | `event_id` | void | — | Increment event view counter |
| `increment_post_view` | `post_id` | void | — | Increment post view counter |
| `increment_media_view` | `media_id` | void | — | Increment media view counter |
| `has_role` | `_role`, `_user_id` | boolean | — | Check user role |
| `cleanup_expired_idempotency_keys` | none | void | SECURITY DEFINER | Delete expired idempotency keys |
