# Index Strategy

## Current Indexes

Indexes created across migrations. Listed by table with creation migration reference.

### Existing Indexes

| Table | Index Name | Columns | Type | Migration |
|-------|-----------|---------|------|-----------|
| `post_likes` | `idx_post_likes_post_id` | `(post_id)` | B-tree | `20260310120007_fix_integrity.sql` |
| `post_likes` | `idx_post_likes_user_id` | `(user_id)` | B-tree | `20260310120007_fix_integrity.sql` |
| `post_comments` | `idx_post_comments_post_id` | `(post_id)` | B-tree | `20260310120007_fix_integrity.sql` |
| `post_comments` | `idx_post_comments_user_id` | `(user_id)` | B-tree | `20260310120007_fix_integrity.sql` |
| `follows` | `idx_follows_follower_id` | `(follower_id)` | B-tree | `20260310120007_fix_integrity.sql` |
| `follows` | `idx_follows_following_id` | `(following_id)` | B-tree | `20260310120007_fix_integrity.sql` |
| `tickets` | `idx_tickets_user_id` | `(user_id)` | B-tree | `20260310120007_fix_integrity.sql` |
| `tickets` | `idx_tickets_event_id` | `(event_id)` | B-tree | `20260310120007_fix_integrity.sql` |
| `tickets` | `idx_tickets_purchase_date` | `(purchase_date)` | B-tree | `20260310120008_fix_qa_vulnerabilities.sql` |
| `events` | `idx_events_organizer_id` | `(organizer_id)` | B-tree | `20260310120008_fix_qa_vulnerabilities.sql` |
| `organizer_profiles` | `idx_organizer_profiles_id` | `(id)` | B-tree | `20260310120008_fix_qa_vulnerabilities.sql` |
| `cloudflare_streams` | `cloudflare_streams_user_id_created_at_idx` | `(user_id, created_at DESC)` | B-tree | `20260313000004_create_cloudflare_streams.sql` |
| `cloudflare_streams` | `cloudflare_streams_event_id_idx` | `(event_id)` | B-tree | `20260313000004_create_cloudflare_streams.sql` |
| `reports` | `idx_reports_status_created_at` | `(status, created_at DESC)` | B-tree | `20260528223151_app_review_moderation_tables.sql` |
| `reports` | `idx_reports_content` | `(content_type, content_id)` | B-tree | `20260528223151_app_review_moderation_tables.sql` |
| `reports` | `idx_reports_open_unique_by_user` | `(reporter_id, content_type, content_id) WHERE status IN ('open','reviewing')` | Partial unique | `20260528223151_app_review_moderation_tables.sql` |
| `user_blocks` | `idx_user_blocks_blocked_id` | `(blocked_id)` | B-tree | `20260528223151_app_review_moderation_tables.sql` |
| `push_subscriptions` | `push_subscriptions_user_enabled_idx` | `(user_id, enabled)` | B-tree | `20260602094112_add_push_subscriptions.sql` |
| `email_deliveries` | `email_deliveries_user_created_idx` | `(user_id, created_at DESC)` | B-tree | `20260611145454_email_system.sql` |
| `email_deliveries` | `email_deliveries_status_created_idx` | `(status, created_at DESC)` | B-tree | `20260611145454_email_system.sql` |
| `idempotency_keys` | `idx_idempotency_keys_user_key` | `(user_id, key)` | B-tree | `20260723000000_create_idempotency_keys.sql` |
| `idempotency_keys` | `idx_idempotency_keys_expires` | `(expires_at)` | B-tree | `20260723000000_create_idempotency_keys.sql` |

### Implicit Indexes (Primary Keys + Unique Constraints)

PostgreSQL automatically creates B-tree indexes for:

| Table | Column(s) | Type |
|-------|-----------|------|
| All tables | Primary key column(s) | Unique B-tree |
| `conversations` | `(participant1_id, participant2_id)` | Unique (composite PK not explicit, but unique constraint exists) |
| `user_blocks` | `(blocker_id, blocked_id)` | Composite PK |
| `cloudflare_streams` | `(uid)` | Unique |
| `push_subscriptions` | `(endpoint)` | Unique |
| `idempotency_keys` | `(user_id, key)` | Unique |
| `email_preferences` | `(user_id)` | PK |

## Missing Indexes

Identified from backend analysis query patterns and migration gaps.

### Critical (Performance Impact)

| Table | Column(s) | Query Pattern | Impact | Migration Needed |
|-------|-----------|--------------|--------|-----------------|
| `stream_chat_messages` | `(event_id)` | `WHERE event_id = X ORDER BY created_at` | Full table scan for every live chat load. At scale, this is the most-read table during events. | High |
| `events` | `(organizer_id, date)` | `WHERE organizer_id = X ORDER BY date DESC` | Organizer event listing scans all events. Existing `idx_events_organizer_id` covers organizer but not date sort. | High |
| `events` | `(status, date)` | `WHERE status = 'published' AND date >= X ORDER BY date` | Event listing/browse page. No composite index exists. | High |
| `tickets` | `(event_id, status)` | `WHERE event_id = X AND status = 'valid'` | Ticket count by event for analytics. Existing `idx_tickets_event_id` doesn't cover status. | Medium |

### Moderate

| Table | Column(s) | Query Pattern | Impact | Migration Needed |
|-------|-----------|--------------|--------|-----------------|
| `posts` | `(user_id, created_at DESC)` | Profile page posts | Existing indexes don't cover this composite. | Medium |
| `notifications` | `(user_id, read, created_at DESC)` | Notification feed | No indexes on notifications table. | Medium |
| `messages` | `(conversation_id, created_at)` | Conversation message history | No composite index. Existing FK lookup doesn't cover sort. | Medium |
| `saved_events` | `(user_id, created_at DESC)` | Saved events list | No composite index. | Low |
| `saved_posts` | `(user_id, created_at DESC)` | Saved posts list | No composite index. | Low |
| `user_media` | `(user_id, created_at DESC)` | User media gallery | No composite index. | Low |
| `event_likes` | `(event_id)` | Event like count | No index on `event_id`. | Low |

### Optional (Covering Indexes for Common Queries)

| Table | Columns | Purpose |
|-------|---------|---------|
| `tickets` | `(event_id, status, price)` | Covering index for `get_event_analytics` revenue calculation |
| `posts` | `(event_id, created_at DESC)` | Covering index for event feed posts |
| `post_comments` | `(post_id, created_at)` | Covering index for comment listing |

## Recommended Index Additions

### Migration: Performance Index Additions

```sql
-- stream_chat_messages: Critical for live chat
CREATE INDEX IF NOT EXISTS idx_stream_chat_messages_event_created
  ON stream_chat_messages (event_id, created_at DESC);

-- events: Organizer event listing with date sort
CREATE INDEX IF NOT EXISTS idx_events_organizer_date
  ON events (organizer_id, date DESC);

-- events: Event browse/listing
CREATE INDEX IF NOT EXISTS idx_events_status_date
  ON events (status, date);

-- tickets: Ticket count by event + status
CREATE INDEX IF NOT EXISTS idx_tickets_event_status
  ON tickets (event_id, status);

-- posts: Profile page listing
CREATE INDEX IF NOT EXISTS idx_posts_user_created
  ON posts (user_id, created_at DESC);

-- notifications: Notification feed
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications (user_id, read, created_at DESC);

-- messages: Conversation history
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at);

-- event_likes: Event like count
CREATE INDEX IF NOT EXISTS idx_event_likes_event_id
  ON event_likes (event_id);

-- saved_events: User saved events
CREATE INDEX IF NOT EXISTS idx_saved_events_user_created
  ON saved_events (user_id, created_at DESC);

-- saved_posts: User saved posts
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_created
  ON saved_posts (user_id, created_at DESC);

-- user_media: User media gallery
CREATE INDEX IF NOT EXISTS idx_user_media_user_created
  ON user_media (user_id, created_at DESC);
```

## Index Types Used

| Type | Usage | Tables |
|------|-------|--------|
| **B-tree** (default) | All existing indexes. Standard for equality, range, and ORDER BY queries. | All |
| **Partial** | Conditional index on subset of rows. | `reports` — unique constraint only on open/reviewing reports |
| **Composite** | Multi-column index for queries filtering/sorting on multiple columns. | `cloudflare_streams`, `push_subscriptions`, `idempotency_keys`, `email_deliveries` |

### Types NOT Currently Used

| Type | Use Case | When to Add |
|------|----------|-------------|
| **GIN** | Index JSONB columns for containment queries (`@>`) | `events.streaming` — if `WHERE streaming @> '{"isLive": true}'` is a hot query |
| **GIN (tsvector)** | Full-text search | `events.title`, `events.description` — if search is added |
| **BRIN** | Block-range index for naturally ordered data (timestamps) | `created_at` columns on very large tables (millions of rows) |
| **Hash** | Equality-only lookups, smaller than B-tree | Rarely beneficial over B-tree in modern PostgreSQL |

### JSONB Index Consideration

The `events.streaming` column is queried with JSONB containment:
```sql
WHERE streaming @> '{"available": true, "isLive": true}'
```

This cannot use B-tree indexes. Options:

1. **GIN index** on `streaming`:
   ```sql
   CREATE INDEX idx_events_streaming_gin ON events USING gin (streaming);
   ```
   Pros: Supports all JSONB operators. Cons: Larger index, slower writes.

2. **Generated column** for hot fields:
   ```sql
   ALTER TABLE events ADD COLUMN is_live boolean
     GENERATED ALWAYS AS ((streaming->>'isLive')::boolean) STORED;
   CREATE INDEX idx_events_is_live ON events (is_live);
   ```
   Pros: Standard B-tree, fast. Cons: Schema change, adds column.

**Recommendation**: Option 2 (generated column) for `is_live` and `available` if live stream listing is a frequent query.

## Partition Strategy Considerations

### stream_chat_messages (Highest Priority)

At scale, live stream chat generates massive write volume. Partitioning by `event_id` range or hash:

```sql
CREATE TABLE stream_chat_messages_partitioned (
  LIKE stream_chat_messages INCLUDING ALL
) PARTITION BY HASH (event_id);

CREATE TABLE stream_chat_messages_p0 PARTITION OF stream_chat_messages_partitioned
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
-- ... repeat for p1, p2, p3
```

**Trade-off**: Partitioning adds query complexity (must include `event_id` in WHERE). Best for tables >10M rows.

### events

If event count grows large, partition by `date` range for time-based queries:

```sql
CREATE TABLE events_partitioned (
  LIKE events INCLUDING ALL
) PARTITION BY RANGE (date);
```

**Trade-off**: `events` is unlikely to exceed 1M rows in this application. Partitioning adds overhead without benefit.

### messages

Partition by `conversation_id` hash if message volume grows:

```sql
CREATE TABLE messages_partitioned (
  LIKE messages INCLUDING ALL
) PARTITION BY HASH (conversation_id);
```

**Trade-off**: Messages are already scoped by conversation. FK constraints don't work across partitions — must use `Partition pruning` carefully.

### When to Partition

| Table | Trigger | Partition Key | Method |
|-------|---------|--------------|--------|
| `stream_chat_messages` | >10M rows or >1K events with active chat | `event_id` | Hash (4-8 parts) |
| `events` | >500K rows | `date` | Range (by month/quarter) |
| `messages` | >50M rows | `conversation_id` | Hash (8-16 parts) |
| `tickets` | >10M rows | `event_id` | Hash (4-8 parts) |
| `posts` | >10M rows | `created_at` | Range (by month) |

**General rule**: Don't partition until you have a measurable performance problem. Premature partitioning adds complexity without benefit.
