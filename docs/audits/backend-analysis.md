# Backend Architecture Analysis — EVENTZ (Supabase Backend)

**Auditor:** Principal Software Engineer  
**Date:** July 8, 2026  
**Codebase:** eventz-app-bd36658b  
**Scope:** Backend layer — Supabase (PostgreSQL, Edge Functions, Auth, Storage, Realtime), API abstraction layer

---

## EXECUTIVE SUMMARY

**Project**: Supabase BaaS (Backend-as-a-Service) — 28 PostgreSQL tables, 12 RPC functions, 15 Edge Functions, 18 API modules (~3,000 lines), 48 migrations.

**Backend Health Score: 4.2/10**

### Key Strengths
- **Comprehensive RLS hardening**: 48 migrations show progressive security tightening — profile privilege escalation blocked, messaging IDOR fixed, ticket purchase secured with transaction verification
- **RPC-based critical operations**: `purchase_ticket`, `become_organizer`, `scan_ticket`, `delete_event_complete` all execute as `SECURITY DEFINER` functions with row locking for race condition prevention
- **Payment verification**: `purchase_ticket` RPC requires a pre-existing `transaction_id` with `completed` status — prevents free ticket bypass
- **Cloudflare Stream integration**: 4 Edge Functions for live input provisioning, status polling, webhook handling, and VOD backfill — production-grade streaming infrastructure
- **Email delivery tracking**: `send-auth-email` logs every delivery to `email_deliveries` table via Resend API with webhook signature verification
- **Race condition protection**: `purchase_ticket` uses `FOR UPDATE` row locking and JSONB tier quantity decrement
- **Progressive migration discipline**: Each fix has its own migration, creating an audit trail of security improvements

### Critical Issues (Must Fix)
1. **`organizer_profiles` table has no FK to `profiles`** — orphaned rows possible, no referential integrity
2. **`comments` and `likes` tables duplicate `post_comments` and `post_likes`** — dead tables consuming resources and confusing queries
3. **`purchase_ticket` RPC overloaded with 3 different function signatures** — type confusion risk
4. **`tickets.price` stored as `string`** — prevents SQL aggregation, breaks mathematical operations
5. **No input validation in Edge Functions** — `send-gift`, `wallet-ticket-payment` accept unvalidated `eventId`/`amount` from client
6. **CORS `Access-Control-Allow-Origin: *` on all Edge Functions** — any origin can invoke payment/gifting functions
7. **No rate limiting on financial Edge Functions** — `send-gift` and `wallet-ticket-payment` can be spammed

### Significant Issues (Should Fix)
8. **N+1 query pattern in `getPosts`** — 3 extra queries per feed load (blocked users, liked posts, saved posts)
9. **No database indexes on `stream_chat_messages.event_id`** — real-time chat queries scan full table
10. **JSONB columns for `streaming`, `ticket_tiers`, `event_highlights`** — prevents proper constraints, indexing, and queryability
11. **No soft deletes** — hard deletes on events/posts with CASCADE destroy data permanently
12. **`getNotifications` makes 5 separate database queries** — N+1 pattern for notifications
13. **`subscribeToAllMessages` subscribes to ALL messages globally** — performance bomb at scale
14. **Edge Functions use inconsistent Supabase client creation patterns** — some use `createClient` from npm, others from esm.sh

---

## PART 1 — DATABASE SCHEMA

### 1.1 Table Inventory (28 tables)

| Table | Rows Type | Foreign Keys | RLS Enabled | Assessment |
|-------|-----------|-------------|-------------|------------|
| `profiles` | Core entity | None (self-contained) | ✅ | Good — no FK needed, auth.users reference implicit |
| `events` | Core entity | `organizer_id → profiles` | ✅ | Good |
| `posts` | Core entity | `user_id → profiles`, `event_id → events` | ✅ | Good |
| `tickets` | Transactional | `user_id → profiles`, `event_id → events` | ✅ | Price as string — BAD |
| `transactions` | Transactional | `user_id → profiles`, `event_id → events`, `ticket_id → tickets` | ✅ | Good |
| `conversations` | Messaging | `participant1_id → profiles`, `participant2_id → profiles` | ✅ | Good |
| `messages` | Messaging | `conversation_id → conversations`, `sender_id → profiles` | ✅ | Good |
| `follows` | Social | `follower_id → profiles`, `following_id → profiles` | ✅ | Good — CASCADE on delete |
| `post_likes` | Social | `post_id → posts`, `user_id → profiles` | ✅ | Good — CASCADE |
| `post_comments` | Social | `post_id → posts`, `user_id → profiles`, `parent_id → post_comments` (self) | ✅ | Good — supports threading |
| `comment_likes` | Social | `comment_id → post_comments`, `user_id → profiles` | ✅ | Good |
| `event_likes` | Social | `event_id → events`, `user_id → profiles` | ✅ | Good |
| `saved_events` | Social | `event_id → events`, `user_id → profiles` | ✅ | Good — CASCADE |
| `saved_posts` | Social | `post_id → posts`, `user_id → profiles` | ✅ | Good — CASCADE |
| `notifications` | System | `user_id → profiles`, `actor_id → profiles` | ⚠️ Not shown | Needs verification |
| `reports` | Moderation | `reporter_id → profiles`, `reported_user_id → profiles` | ⚠️ Not shown | Needs verification |
| `user_blocks` | Moderation | `blocker_id → profiles`, `blocked_id → profiles` | ⚠️ Not shown | Needs verification |
| `user_roles` | Auth | None (manual FK) | ⚠️ Not shown | No FK to profiles! |
| `organizer_profiles` | Legacy | **None** — `id` has no FK! | ✅ | **CRITICAL: orphaned rows** |
| `stream_chat_messages` | Real-time | `event_id → events`, `user_id → profiles` | ✅ | Good |
| `cloudflare_streams` | Streaming | `event_id → events`, `user_id → profiles` | ✅ | Good |
| `user_media` | Media | `event_id → events`, `user_id → profiles` | ✅ | Good |
| `feature_flags` | Config | None | ⚠️ Not shown | No RLS — anyone can read? |
| `push_subscriptions` | Notifications | None (manual FK) | ⚠️ Not shown | No FK constraint |
| `audit_logs` | Security | None (manual FK) | ⚠️ Not shown | No FK constraint |
| `comments` | **DEAD** | `post_id → posts`, `user_id → profiles` | Unknown | **Duplicate of `post_comments`** |
| `likes` | **DEAD** | `post_id → posts`, `user_id → profiles` | Unknown | **Duplicate of `post_likes`** |
| `notifications` | System | `user_id → profiles`, `actor_id → profiles` | ⚠️ | Unused — notifications built from follows/likes/comments at query time |

### 1.2 Duplicate Tables (Critical)

Two pairs of duplicate tables exist:

| Dead Table | Active Table | Evidence |
|-----------|-------------|----------|
| `comments` (id, post_id, user_id, text, created_at) | `post_comments` (id, post_id, user_id, text, created_at, parent_id) | `post_comments` adds `parent_id` for threading. `comments` is referenced by zero API functions. |
| `likes` (id, post_id, user_id, created_at) | `post_likes` (id, post_id, user_id, created_at) | Identical schema. `post_likes` is used everywhere. `likes` is dead. |

**Impact**: Wasted storage, confusing schema, potential for queries against wrong table.

**Fix**: `DROP TABLE IF EXISTS comments; DROP TABLE IF EXISTS likes;` after verifying no RLS policies or functions reference them.

### 1.3 Missing Foreign Keys

| Table | Column | Should Reference | Impact |
|-------|--------|-----------------|--------|
| `organizer_profiles` | `id` | `profiles(id)` | Orphaned organizer profiles can exist after user deletion |
| `user_roles` | `user_id` | `profiles(id)` | Orphaned role entries after user deletion |
| `push_subscriptions` | `user_id` | `profiles(id)` | Orphaned push subscriptions after user deletion |
| `audit_logs` | `admin_id`, `target_id` | `profiles(id)` | Orphaned audit entries (acceptable for audit trail) |

### 1.4 JSONB Column Abuse

| Table | Column | Contents | Problem |
|-------|--------|----------|---------|
| `events` | `streaming` | Provider, live_input_uid, stream_key, ingest_url, playback_url, isLive, liveViewers, etc. | ~15 fields in a single JSONB blob. `stream_key` exposed in JSON — anyone with SELECT can read it. No constraints on structure. |
| `events` | `ticket_tiers` | Array of {name, price, available, features, color} | Price as string inside JSONB. No CHECK constraint on price format. `available` count modified by RPC but no DB-level constraint prevents negative values. |
| `events` | `event_highlights` | Array of {image, video, caption, type, mediaType} | No validation of media URLs. No constraint on array length. |
| `organizer_profiles` | `social_links` | {instagram, facebook, twitter} | Minor — acceptable for optional metadata. |

**Critical**: `events.streaming` contains `stream_key` — the RTMP stream key. If RLS allows any authenticated user to SELECT from events, they can extract stream keys and broadcast to any live stream.

### 1.5 Price Stored as String

`tickets.price` is `text` type. This means:
- Cannot use `SUM(price)` for revenue calculations
- Cannot use `AVG(price)` for analytics
- Must parse in application code: `parseInt(price.replace(/[^0-9]/g, ''))`
- Revenue RPCs use `REGEXP_REPLACE(price, '[^0-9]', '', 'g')` — fragile
- Currency handling is implicit (always TZS)

**Fix**: Add `price_numeric NUMERIC GENERATED ALWAYS AS (CAST(REGEXP_REPLACE(price, '[^0-9]', '', 'g') AS NUMERIC)) STORED` or migrate to `NUMERIC` column.

### 1.6 No Soft Deletes

All deletes are hard deletes with CASCADE:
- `DELETE FROM events WHERE id = X` cascades to tickets, saved_events, posts, stream_chat_messages, event_likes, cloudflare_streams
- No `deleted_at` timestamp
- No recovery mechanism
- `delete_event_complete` RPC does hard delete

**Impact**: Accidental deletion is irreversible. No audit trail of what was deleted.

### 1.7 Migration Health (48 files)

| Category | Count | Examples |
|----------|-------|---------|
| Schema creation | ~8 | Initial tables, organizer_profiles, cloudflare_streams |
| RLS hardening | ~12 | rls_hardening, secure_messaging, fix_transactions_rls |
| Security fixes | ~8 | security_fixes, qa_vulnerabilities, race_condition_fixes |
| Bug fixes | ~12 | fix_chat_trigger_error, fix_downgrade_*, fix_profile_trigger_bypass |
| Performance | ~3 | performance_fixes, fix_integrity (indexes) |
| Feature additions | ~5 | scan_ticket_rpc, email_system, push_subscriptions |

**Concerns**:
- Several migrations fix previous migrations (e.g., `fix_downgrade_permissions` → `fix_downgrade_trigger_bypass` → `fix_profile_trigger_bypass`)
- `purchase_ticket` has been rewritten 4 times across migrations
- Archive directory contains 7 old schema dumps — should be cleaned up
- No migration testing framework

---

## PART 2 — EDGE FUNCTIONS

### 2.1 Inventory (15 functions, 14 active)

| Function | Lines | Purpose | Auth Required | Security Level |
|----------|-------|---------|---------------|----------------|
| `send-gift` | 207 | Wallet-to-wallet gift transfer via nTZS API | ✅ JWT | **Critical** — financial |
| `wallet-ticket-payment` | 201 | Wallet ticket purchase via nTZS API | ✅ JWT | **Critical** — financial |
| `send-auth-email` | 305 | Auth emails via Resend (signup, recovery, etc.) | ✅ Webhook signature | High — email delivery |
| `send-email` | 651 | General transactional emails | ✅ Webhook signature | High |
| `send-push-notification` | 310 | Push notifications via web push | ✅ Service role | High |
| `delete-post-complete` | 117 | Delete post + storage cleanup | ✅ JWT | Medium |
| `delete-account` | 96 | Account deletion | ✅ JWT | Medium |
| `agora-rtc-token` | 94 | Generate Agora RTC tokens | ❌ Public | Medium — token generation |
| `cloudflare-stream-create` | 165 | Provision Cloudflare live input | ✅ JWT | Medium |
| `cloudflare-stream-status` | 89 | Poll Cloudflare stream state | ❌ Public | Low |
| `cloudflare-stream-backfill` | 134 | One-shot VOD backfill | ✅ JWT | Low |
| `cloudflare-stream-webhook` | 226 | Cloudflare webhook receiver | ✅ HMAC signature | Medium |
| `ntzs-proxy` | 397 | Proxy to nTZS payment API | ✅ JWT | **Critical** — financial |
| `ntzs-webhook` | 172 | nTZS payment webhook | ✅ HMAC signature | High |
| `apply-push-subscription-migration` | 0 | **EMPTY** — dead directory | — | — |

### 2.2 Financial Functions — Deep Dive

#### `send-gift` (207 lines)

**Flow**: Client → Edge Function → nTZS API → PostgreSQL transactions

**Security Analysis**:
- ✅ Validates JWT via `getClaims(token)`
- ✅ Checks `amount > 0` and `eventId` is finite
- ✅ Prevents self-gifting (`event.organizer_id === userId`)
- ✅ Checks wallet balance before transfer
- ✅ Creates paired transaction records (sender + recipient)
- ❌ No rate limiting — could be spammed to cause nTZS API rate limit issues
- ❌ No idempotency key — duplicate requests create duplicate transactions
- ❌ `eventId` accepted as `Number()` — truncates large IDs
- ❌ No transaction rollback if DB insert fails after nTZS transfer succeeds
- ❌ CORS `*` — any website can invoke this function with a valid JWT

#### `wallet-ticket-payment` (201 lines)

**Flow**: Client → Edge Function → nTZS API → PostgreSQL transactions → ticket creation (via RPC)

**Security Analysis**:
- ✅ Same JWT validation as `send-gift`
- ✅ Prevents self-purchase
- ✅ Balance check before transfer
- ❌ **Does not call `purchase_ticket` RPC** — inserts ticket via separate client call (inconsistent with `tickets.ts` which calls RPC)
- ❌ No idempotency — double-click creates double payment
- ❌ No transaction rollback if ticket creation fails after payment succeeds
- ❌ Accepts arbitrary `metadata` from client — could inject unexpected fields
- ❌ No server-side ticket tier validation — amount is client-provided, not verified against `events.ticket_tiers`

#### `ntzs-proxy` (397 lines)

**Purpose**: General-purpose proxy to nTZS API for wallet operations (balance check, transfers, user management).

**Security Analysis**:
- ✅ Validates JWT
- ✅ Whitelists allowed nTZS API paths
- ❌ **Forwards user-provided body directly to nTZS API** — potential for request smuggling
- ❌ No request body size limit
- ❌ No response caching — every request hits nTZS API

### 2.3 CORS Configuration

**Every Edge Function** uses:
```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

**Impact**: Any website on the internet can invoke these Edge Functions with a valid Supabase JWT. This means:
- A malicious site can send gifts from any logged-in user's wallet
- A malicious site can purchase tickets using any user's wallet balance
- A malicious site can invoke any Edge Function

**Fix**: Set `Access-Control-Allow-Origin` to the app's domain(s): `https://eventz.app`, `https://*.eventz.app`, `capacitor://localhost`

### 2.4 Inconsistent Import Patterns

| Function | Supabase Client Import | Deno Standard Library |
|----------|----------------------|----------------------|
| `send-gift` | `npm:@supabase/supabase-js@2` | None |
| `wallet-ticket-payment` | `npm:@supabase/supabase-js@2` | None |
| `send-auth-email` | `npm:@supabase/supabase-js@2` | None |
| `delete-post-complete` | `esm.sh/@supabase/supabase-js@2.45.0` | `deno.land/std@0.177.0` |
| `agora-rtc-token` | None | `deno.land/std@0.168.0` |
| `cloudflare-stream-*` | `esm.sh/@supabase/supabase-js@2.45.0` | None |
| `ntzs-*` | `npm:@supabase/supabase-js@2` | None |

**Problems**:
1. Two different Supabase client versions: `@2` (latest) vs `@2.45.0` (pinned)
2. Two different import strategies: `npm:` prefix vs `esm.sh` CDN
3. Deno standard library pinned to old versions (`0.168.0`, `0.177.0`)
4. No `import_map.json` for centralized dependency management

### 2.5 Dead/Empty Functions

| Function | Status | Action |
|----------|--------|--------|
| `apply-push-subscription-migration` | Empty directory | Delete |

### 2.6 Error Handling Patterns

| Pattern | Functions Using It | Quality |
|---------|-------------------|---------|
| `try/catch` with JSON error response | All | Good |
| `console.error` before return | `wallet-ticket-payment`, `cloudflare-stream-*` | Good — aids debugging |
| Silent catch | `delete-post-complete` (storage cleanup) | Acceptable — best-effort cleanup |
| HTTP status mapping | `send-gift`, `wallet-ticket-payment` (maps nTZS errors to HTTP codes) | Good |

### 2.7 Webhook Signature Verification

| Webhook | Verification | Quality |
|---------|-------------|---------|
| `send-auth-email` | `standardwebhooks` library with `SEND_EMAIL_HOOK_SECRET` | **Excellent** — industry standard |
| `cloudflare-stream-webhook` | Custom HMAC SHA-256 with `CLOUDFLARE_STREAM_WEBHOOK_SECRET` | Good — falls through if no secret configured (⚠️) |
| `ntzs-webhook` | HMAC SHA-256 with `NTZS_WEBHOOK_SECRET` | Good |

**Issue**: `cloudflare-stream-webhook` skips verification if `WEBHOOK_SECRET` is not set:
```ts
if (WEBHOOK_SECRET) {
  // verify
}
// else: proceeds without verification
```
This means if the secret is not configured, anyone can fake webhook calls.

---

## PART 3 — API ABSTRACTION LAYER

### 3.1 Organization

```
src/utils/supabase/api/
├── index.ts              (136 lines — barrel export)
├── client.ts             (1 line — re-export)
├── auth.ts               (22 lines — auth operations)
├── profile.ts            (237 lines — profile CRUD)
├── events.ts             (682 lines — event CRUD + streaming + analytics)
├── posts.ts              (390 lines — post CRUD + likes + comments)
├── conversations.ts      (297 lines — DMs + messaging)
├── follows.ts            (195 lines — follow/unfollow + presence)
├── moderation.ts         (96 lines — block/report)
├── notifications.ts      (228 lines — notification aggregation)
├── streamChat.ts         (101 lines — live stream chat)
├── streams.ts            (115 lines — Cloudflare Stream videos)
├── tickets.ts            (115 lines — ticket purchase + scanning)
├── transactions.ts       (80 lines — transaction creation + waiting)
├── saved.ts              (147 lines — saved events/posts)
├── storage.ts            (161 lines — file upload/delete)
├── userMedia.ts          (32 lines — user media)
├── platform.ts           (59 lines — organizer/platform stats)
└── search.ts             (23 lines — trending)
```

**Total**: ~3,000 lines across 18 files.

### 3.2 N+1 Query Patterns

#### `getPosts` (posts.ts:42-107)

```
For EACH feed load:
  1. Main query: posts + user + event + likes(count) + comments(count)
  2. getBlockedUserIds(userId) → SELECT from user_blocks
  3. SELECT post_id FROM post_likes WHERE user_id = X
  4. SELECT post_id FROM saved_posts WHERE user_id = X
```

**Impact**: 4 queries per feed load regardless of post count. But the pattern is per-load, not per-post, so it's O(4) not O(4n). Still, queries 2-4 could be combined into a single RPC.

#### `getConversations` (conversations.ts:42-100)

```
1. SELECT conversations with participant profiles
2. SELECT ALL messages for all conversation IDs
3. SELECT unread messages for all conversation IDs
```

**Impact**: At 100 conversations, query 2 fetches ALL messages from ALL conversations. Should use a subquery or lateral join for last message only.

#### `getNotifications` (notifications.ts:17-228)

```
1. SELECT profile.last_notification_read_at
2. SELECT follows (20) with follower profile
3. SELECT post_likes (20) with user profile + post
4. SELECT post_comments (20) with user profile + post
5. SELECT tickets (20) with event + user profile
6. SELECT upcoming tickets with event
```

**Impact**: 6 queries per notification load. All limit to 20 rows, but still excessive. Should be a single RPC.

### 3.3 Direct Supabase Calls in Components (Bypassing API Layer)

9+ components import `supabase` directly and call `supabase.from()` inline:

| Component | Direct Query | Impact |
|-----------|-------------|--------|
| `Feed.tsx` | `supabase.from('posts')...` | Untestable, duplicates API layer |
| `EventDetails.tsx` | `supabase.from('events')...` | Same |
| `Profile.tsx` | `supabase.from('profiles')...` | Same |
| `WalletModal.tsx` | `supabase.from('transactions')...` | Same |
| `AuthScreen.tsx` | `supabase.from('profiles')...` | Same |
| `CommentsSheet.tsx` | `supabase.from('post_comments')...` | Same |
| `EventDetailModal.tsx` | `supabase.from('events')...` | Same |
| `SettingsModal.tsx` | `supabase.from('profiles')...` | Same |
| `PostDetailView.tsx` | `supabase.from('posts')...` | Same |

**Impact**: Business logic scattered across components, impossible to test, inconsistent error handling.

### 3.4 Error Handling Patterns

| Pattern | Count | Example |
|---------|-------|---------|
| `if (error) throw error` | ~80% | Standard — good |
| `if (error) { }` (silent) | 4 | `incrementEventView`, `incrementPostView`, `deleteFile` |
| `catch { console.warn(...); return fallback }` | ~5 | `getBlockedUserIds` in conversations |
| `catch { /* silent */ }` | ~3 | Storage cleanup in delete flows |

### 3.5 Realtime Subscription Inventory

| Subscription | Channel Pattern | Scope | Concern |
|-------------|----------------|-------|---------|
| `subscribeToMessages` | `messages:{conversationId}` | Per-conversation | Good — scoped |
| `subscribeToAllMessages` | `global_messages` | **ALL messages** | **Critical** — every user receives every message |
| `subscribeToEventStreaming` | `event-streaming-{eventId}-{random}` | Per-event | Good — scoped with random suffix |
| `subscribeToStreamPresence` | `stream-presence-{eventId}` | Per-event | Good — presence-based |
| `subscribeToEventLikes` | `event-likes-{eventId}-{random}` | Per-event | Good |
| `subscribeToStreamMessages` | `stream-chat-{eventId}-{random}` | Per-event | Good |
| `subscribeToSavedEvents` | `saved_events:{userId}` | Per-user | Good |
| `subscribeToSavedPosts` | `saved_posts:{userId}` | Per-user | Good |
| `subscribeToOnlineUsers` | `online-users:{userId}:{random}` | Global | **Concern** — all users in one channel |

**Critical**: `subscribeToAllMessages` creates a subscription on the entire `messages` table. Every user subscribed receives every INSERT on `messages`. At 10,000 concurrent users sending messages, this creates 10,000 callbacks per message.

### 3.6 Missing Features

| Feature | Status | Impact |
|---------|--------|--------|
| Input validation (Zod) | ❌ Not implemented | Client-side only validation |
| Request logging | ❌ Not implemented | No audit trail for API calls |
| Rate limiting | ❌ Not implemented | Abuse potential |
| Idempotency keys | ❌ Not implemented | Duplicate financial transactions |
| Pagination cursors | ❌ Only offset-based | Performance degrades at scale |
| Query result caching | ❌ Not implemented | Every request hits database |
| API versioning | ❌ Not implemented | Breaking changes affect all clients |

---

## PART 4 — AUTHENTICATION & AUTHORIZATION

### 4.1 Authentication Flow

**Method**: Supabase Auth with PKCE flow  
**Session**: Persisted to localStorage, auto-refresh enabled  
**Token verification**: Edge Functions verify JWT via `getClaims(token)` or `getUser(token)`

### 4.2 Row-Level Security (RLS) Audit

#### Tables with RLS Verified

| Table | Policies | Quality |
|-------|----------|---------|
| `events` | INSERT: organizer only. UPDATE: organizer only. SELECT: public. DELETE: via RPC. | ✅ Good |
| `profiles` | UPDATE: self-only, cannot change `is_organizer`/`verified`. SELECT: public. | ✅ Good — anti-escalation |
| `conversations` | SELECT/INSERT/DELETE: participants only. | ✅ Good |
| `messages` | SELECT/INSERT/UPDATE/DELETE: conversation participants only. Sender must match `auth.uid()`. | ✅ Good — IDOR fixed |
| `posts` | DELETE: own posts only. SELECT: public. | ✅ Good |
| `post_likes` | INSERT/DELETE: self only. | ✅ Good |
| `post_comments` | INSERT: self only. | ✅ Good |
| `tickets` | INSERT: via RPC only (policy dropped). SELECT: own tickets. | ✅ Good |
| `transactions` | INSERT: self only (`auth.uid() = user_id`). SELECT: self only. | ✅ Good |
| `cloudflare_streams` | SELECT: public. ALL: own streams only. | ✅ Good |
| `follows` | INSERT/DELETE: self only. | ✅ Good |

#### Critical RLS Finding: `events.streaming.stream_key`

If `events` has a public SELECT policy, any authenticated user can:
```sql
SELECT streaming->>'stream_key' FROM events WHERE id = <event_id>;
```
This extracts the RTMP stream key, allowing anyone to broadcast to any live stream.

**Fix**: Either remove `stream_key` from the `streaming` JSONB (store in separate table with restricted SELECT), or create a restricted SELECT policy that excludes the `streaming` column for non-organizers.

### 4.3 Profile Privilege Escalation Protection

**Mechanism**: Database trigger `check_profile_updates()` fires BEFORE UPDATE on `profiles`:
```sql
IF (NEW.is_organizer IS DISTINCT FROM OLD.is_organizer) OR
   (NEW.verified IS DISTINCT FROM OLD.verified) OR
   (NEW.organizer_type IS DISTINCT FROM OLD.organizer_type) THEN
    RAISE EXCEPTION 'Unauthorized: You cannot update privileged profile fields directly.';
END IF;
```

**Bypass mechanism**: `SET app.bypass_profile_trigger = 'true'` — used by `become_organizer` and `downgrade_to_personal_account` RPCs (both `SECURITY DEFINER`).

**Assessment**: ✅ Good — proper defense-in-depth. RLS prevents direct updates, trigger catches bypass attempts, RPCs use `SECURITY DEFINER` to execute with owner privileges.

### 4.4 Ticket Purchase Security

**Flow**:
1. Client creates `transaction` record (status: `pending`)
2. Client invokes nTZS payment (via Edge Function)
3. nTZS payment completes → transaction status updated to `completed`
4. Client calls `purchase_ticket` RPC with `transaction_id`
5. RPC verifies: transaction exists, belongs to user, not already used, status is `completed`, amount >= ticket price
6. RPC inserts ticket, links transaction to ticket

**Assessment**: ✅ Good — double-entry pattern. Transaction must exist and be completed before ticket is issued. Prevents free ticket bypass.

**Weakness**: Step 1-3 happen client-side. A malicious client could:
- Create a transaction with `status: 'completed'` directly (if RLS allows)
- Call `purchase_ticket` with that fake transaction

**Mitigation**: RLS on `transactions` allows INSERT with `auth.uid() = user_id` but status is not constrained by RLS. The `purchase_ticket` RPC checks status, so a fake `completed` transaction would pass the RPC check.

**Fix**: Add RLS policy: `FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending')` — only allow inserting pending transactions. Status changes should only happen via Edge Function/webhook.

---

## PART 5 — SECURITY AUDIT

### 5.1 Financial Security

| Issue | Severity | Location | Details |
|-------|----------|----------|---------|
| No idempotency on payments | **Critical** | `wallet-ticket-payment`, `send-gift` | Double-click creates double charge |
| No transaction rollback | **Critical** | `wallet-ticket-payment` | nTZS transfer succeeds but DB insert fails = money lost |
| No server-side ticket price validation | **High** | `wallet-ticket-payment` | Client sends `amount`, not verified against `ticket_tiers` |
| CORS `*` on payment functions | **High** | All Edge Functions | Any website can invoke with valid JWT |
| No rate limiting on financial endpoints | **High** | Edge Functions | Spamming possible |
| Transaction status not constrained by RLS | **Medium** | `transactions` table | Client could insert `completed` transaction directly |

### 5.2 Data Exposure

| Issue | Severity | Location | Details |
|-------|----------|----------|---------|
| `stream_key` in `events.streaming` JSONB | **High** | `events` table | RTMP key readable by anyone with SELECT on events |
| nTZS API key in Edge Function env | **Medium** | Edge Functions | Expected — secrets managed by Supabase |
| Service role key used in Edge Functions | **Medium** | Edge Functions | Expected — but means Edge Functions bypass all RLS |
| `password` field in `.env` | **Critical** | `.env` file | Database password committed to source |

### 5.3 Input Validation

**Edge Functions accept unvalidated input from client:**

| Function | Input | Validation | Gap |
|----------|-------|-----------|-----|
| `send-gift` | `eventId`, `amount`, `currency` | `Number.isFinite()`, `> 0` | No max amount check, no currency validation |
| `wallet-ticket-payment` | `eventId`, `amount`, `currency`, `metadata` | `Number.isFinite()`, `> 0` | No max amount, arbitrary metadata |
| `agora-rtc-token` | `channelName`, `uid`, `role`, `expireSeconds` | `channelName` required | No max expiry, no channel name format validation |
| `cloudflare-stream-create` | `eventId` | `Number(eventId)` | Minimal |
| `delete-post-complete` | `postId` | `typeof postId === 'number'` | Minimal |

**API layer validation (client-side only):**

| Function | Validation | Gap |
|----------|-----------|-----|
| `createEvent` | Date not in past, title 3-100 chars, category required | No server-side enforcement |
| `updateEvent` | Date not in past | No server-side enforcement |
| `sendMessage` | Text trimmed, max 5000 chars | No server-side enforcement (RLS doesn't check length) |
| `sendStreamMessage` | Text trimmed, max 200 chars | No server-side enforcement |
| `updateProfile` | Username 3+ chars, name max 50, birthdate not future | Server-side via trigger only for privileged fields |

### 5.4 Authentication Edge Function Patterns

Two patterns for JWT verification in Edge Functions:

**Pattern 1** (newer functions — `send-gift`, `wallet-ticket-payment`):
```ts
const userClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },
});
const { data: claimsData } = await userClient.auth.getClaims(token);
const userId = claimsData.claims.sub;
```

**Pattern 2** (older functions — `delete-post-complete`, `cloudflare-stream-*`):
```ts
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const { data: userData } = await supabase.auth.getUser(token);
const userId = userData.user?.id;
```

**Issue**: Pattern 2 uses the service role key to create the client, then calls `getUser()` — this works but is less clean. Pattern 1 is preferred.

---

## PART 6 — PERFORMANCE

### 6.1 Database Query Performance

#### Identified N+1 Patterns

| Function | Queries | Impact | Fix |
|----------|---------|--------|-----|
| `getPosts` | 4 queries per load | 3 extra queries for blocked/liked/saved | Single RPC |
| `getConversations` | 3 queries | Fetches ALL messages for all conversations | Lateral join for last message |
| `getNotifications` | 6 queries | Separate queries for follows, likes, comments, tickets | Single RPC |
| `getSavedPosts` | 2 queries | Posts + separate likes query | Combine with subquery |
| `getProfileStreamedVideos` | 2 queries | Cloudflare streams + owned events | Single query with UNION |

#### Missing Indexes

| Table | Column(s) | Query Pattern | Impact |
|-------|-----------|--------------|--------|
| `stream_chat_messages` | `event_id` | `WHERE event_id = X ORDER BY created_at` | Full table scan for chat messages |
| `events` | `(organizer_id)` | `WHERE organizer_id = X` | Full table scan for organizer events |
| `events` | `(status, date)` | `WHERE status = 'published' AND date >= X` | Full table scan for event listing |
| `post_likes` | `(user_id, post_id)` | Composite lookup for like status | Already has individual indexes, composite would be faster |
| `tickets` | `(event_id, status)` | Ticket count by event | Partial index for active tickets |

#### Query Optimization Opportunities

**`getOrganizerEvents`**: Uses `select('*, tickets(count), saved_events(count), posts(count)')` — 3 subqueries per event. For an organizer with 50 events, this is 150 subqueries. Should use a single aggregation RPC.

**`getLiveStreams`**: Uses `.contains('streaming', { available: true, isLive: true })` — JSONB containment query cannot use standard indexes. Needs a generated column or materialized view for live status.

### 6.2 Realtime Performance

| Channel Type | Per-User Overhead | At 10K Users |
|-------------|-------------------|--------------|
| `subscribeToAllMessages` | 1 channel per user | 10K channels on same table |
| `subscribeToOnlineUsers` | 1 channel per user | 10K channels on same presence |
| `subscribeToEventStreaming` | 1 per viewed event | Variable |
| `subscribeToStreamPresence` | 1 per viewed event | Variable |
| `subscribeToStreamMessages` | 1 per viewed event | Variable |

**Critical**: `subscribeToAllMessages` creates N channels on the same table with no filter. Each INSERT triggers N callbacks. At 10K users, a single message generates 10K function calls.

### 6.3 Edge Function Cold Start

Supabase Edge Functions run on Deno Deploy. Cold start times:
- First invocation: ~500-2000ms (Deno runtime init + import resolution)
- Subsequent invocations: ~10-50ms

**Impact**: Financial functions (`send-gift`, `wallet-ticket-payment`) have noticeable latency on first call. Users may double-click.

### 6.4 Storage Performance

`uploadImage` function:
- Retries up to 3 times on network errors
- Uses `ArrayBuffer` for video uploads on mobile (Capacitor)
- Optimizes images before upload via `optimizeForUpload`
- Falls back to different bucket on "bucket not found" errors

**Concern**: Fallback from `posts` bucket to `events` bucket on error — silent data migration.

---

## PART 7 — CODE QUALITY

### 7.1 API Layer Quality

| Metric | Value | Assessment |
|--------|-------|------------|
| Total files | 18 | Good domain separation |
| Total lines | ~3,000 | Reasonable for feature scope |
| Largest file | `events.ts` (682 lines) | Too many concerns |
| Typed exports | Most functions have types | Good |
| `any` usage | ~40 occurrences across API files | Moderate — mostly in map/filter callbacks |
| Error handling | Consistent `throw error` pattern | Good |
| JSDoc/comments | None | Poor — no function documentation |

### 7.2 `events.ts` — God Module (682 lines)

This file handles: event CRUD, live streams, streaming status, likes, gifts, viewer counts, analytics, subscriptions, Cloudflare key generation. Should be split into:
- `events.ts` — CRUD operations
- `eventStreaming.ts` — streaming status, live viewers, subscriptions
- `eventLikes.ts` — like/unlike/subscribe
- `eventAnalytics.ts` — analytics aggregation

### 7.3 Dead Code

| Item | Location | Status |
|------|----------|--------|
| `comments` table | Database | Unused — duplicate of `post_comments` |
| `likes` table | Database | Unused — duplicate of `post_likes` |
| `apply-push-subscription-migration` | Edge Functions | Empty directory |
| `supabase/schemas/` | Config | Empty directory |
| `getEventAttendees` | `events.ts` | Queries `tickets` with user join — may be unused |

### 7.4 Naming Inconsistencies

| Pattern | Examples | Issue |
|---------|----------|-------|
| `getPosts` vs `getProfilePostsGrid` | Different naming conventions | Inconsistent |
| `incrementEventView` vs `incrementPostView` vs `incrementUserMediaView` | Same pattern, different names | Consistent within type, but `increment_media_view` RPC uses different naming |
| `toggleLikeEvent` vs `toggleLikePost` | Good | Consistent |
| `sendGift` vs `sendStreamMessage` | Different prefixes | Minor |

### 7.5 Migration Quality

| Issue | Frequency | Example |
|-------|-----------|---------|
| Self-fixing migrations | 4+ | `fix_downgrade_permissions` → `fix_downgrade_trigger_bypass` → `fix_profile_trigger_bypass` |
| `purchase_ticket` rewrites | 4 | Each migration replaces the entire function |
| No down migrations | All | No `DOWN` statements — impossible to rollback |
| No migration tests | All | No verification that migrations produce expected schema |

---

## PART 8 — SCALABILITY

### 8.1 Current Limits

| Resource | Limit | Impact |
|----------|-------|--------|
| PostgreSQL connections | 50-60 (Supabase free/pro) | 10K concurrent users → connection exhaustion |
| Edge Function invocations | Varies by plan | Financial functions could be spammed |
| Realtime connections | Varies by plan | `subscribeToAllMessages` scales poorly |
| Storage | 1GB free, 100GB pro | Video uploads consume rapidly |
| Bandwidth | Varies | Video streaming bandwidth-heavy |

### 8.2 Scaling Bottlenecks

1. **Connection Pooling**: Each Edge Function call creates a new PostgreSQL connection. At 100 concurrent Edge Function calls, that's 100 connections. Supabase free tier allows 60.

2. **JSONB Queries**: `streaming->>'cf_live_input_uid'` and `contains('streaming', {...})` cannot use B-tree indexes. Full table scans for live stream queries.

3. **`subscribeToAllMessages`**: O(N) callback execution per message. At 10K users, 10K callbacks per message.

4. **No Read Replicas**: All queries (reads + writes) hit primary database.

5. **No Caching Layer**: No Redis, no CDN for API responses. Every page load hits database.

### 8.3 Recommended Optimizations

| Priority | Optimization | Difficulty | Impact |
|----------|-------------|------------|--------|
| 1 | Add database indexes for common queries | Low | 10x query performance |
| 2 | Replace `subscribeToAllMessages` with per-conversation subscriptions | Low | Prevent O(N) callback storm |
| 3 | Create RPC for `getNotifications` (single query) | Medium | 6x reduction in queries |
| 4 | Create RPC for `getFeed` (blocked + liked + saved in one call) | Medium | 4x reduction in queries |
| 5 | Add generated columns for JSONB fields (`isLive`, `cf_live_input_uid`) | Medium | Enable index usage |
| 6 | Implement connection pooling via PgBouncer | Low | Handle 10x more concurrent users |
| 7 | Add Redis caching for hot queries (feed, events) | High | 100x read performance |
| 8 | Migrate `ticket_tiers` to related table | High | Proper constraints + indexing |

---

## PART 9 — TESTING

### 9.1 Current State

| Test Type | Count | Coverage |
|-----------|-------|----------|
| Database function tests | 0 | None |
| Edge Function tests | 0 | None |
| RLS policy tests | 0 | None |
| API layer unit tests | 0 | None |
| Integration tests | 0 | None |

**Verdict**: The backend has zero automated tests. All security depends on manual review of migrations and RLS policies.

### 9.2 Critical Missing Tests

1. **`purchase_ticket` RPC**: Should verify: transaction validation, tier availability decrement, ticket creation, idempotency
2. **`become_organizer` RPC**: Should verify: username uniqueness, profile update, trigger bypass
3. **`scan_ticket` RPC**: Should verify: organizer-only access, double-scan prevention, status transitions
4. **`send-gift` Edge Function**: Should verify: balance check, self-gift prevention, transaction pairing
5. **RLS policies**: Should verify: cross-user access blocked, privilege escalation blocked
6. **`check_profile_updates` trigger**: Should verify: privileged field protection, bypass mechanism

### 9.3 Recommended Testing Strategy

| Priority | Test Type | Tool | Target |
|----------|----------|------|--------|
| 1 | RPC unit tests | pgTAP | `purchase_ticket`, `become_organizer`, `scan_ticket` |
| 2 | RLS policy tests | pgTAP | All tables with RLS |
| 3 | Edge Function tests | Deno test | Financial functions |
| 4 | API layer tests | Vitest | All 18 API modules |
| 5 | Integration tests | Vitest + test DB | Full purchase flow, auth flow |

---

## PART 10 — SUMMARY OF ALL ISSUES BY SEVERITY

### CRITICAL (Fix Before Production)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | `organizer_profiles.id` has no FK to `profiles` | Database schema | Orphaned rows, data integrity loss |
| 2 | No idempotency on financial Edge Functions | `send-gift`, `wallet-ticket-payment` | Double charges |
| 3 | No transaction rollback on payment failure | `wallet-ticket-payment` | Money lost without ticket |
| 4 | `tickets.price` stored as `string` | Database schema | Cannot aggregate revenue in SQL |
| 5 | CORS `*` on all Edge Functions | All Edge Functions | Any website can invoke payments |
| 6 | `stream_key` exposed in `events.streaming` JSONB | Database schema | Anyone can broadcast to any stream |
| 7 | `comments` and `likes` duplicate tables | Database schema | Dead tables, schema confusion |
| 8 | `purchase_ticket` has 3 overloaded signatures | Database functions | Type confusion, maintenance burden |

### HIGH (Fix Within Sprint)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 9 | No rate limiting on financial Edge Functions | Edge Functions | Abuse potential |
| 10 | `subscribeToAllMessages` scales O(N) | `conversations.ts` | Performance bomb at scale |
| 11 | N+1 queries in `getNotifications` (6 queries) | `notifications.ts` | Slow notification loading |
| 12 | N+1 queries in `getConversations` (3 queries) | `conversations.ts` | Slow conversation loading |
| 13 | No server-side ticket price validation | `wallet-ticket-payment` | Client can manipulate price |
| 14 | Transaction status not constrained by RLS | `transactions` table | Client could fake completed transaction |
| 15 | No database indexes on `stream_chat_messages.event_id` | Database | Full table scan for chat |
| 16 | No database indexes on `events(organizer_id)` | Database | Full table scan for organizer events |
| 17 | `cloudflare-stream-webhook` skips verification if no secret | Edge Function | Unverified webhook calls |
| 18 | Inconsistent Supabase client versions in Edge Functions | Edge Functions | Version drift |

### MEDIUM

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 19 | `events.ts` is 682 lines — too many concerns | API layer | Unmaintainable |
| 20 | No input validation in Edge Functions | Edge Functions | Injection risk |
| 21 | No soft deletes | Database | Irreversible data loss |
| 22 | JSONB `ticket_tiers` prevents proper constraints | Database | No DB-level price/quantity validation |
| 23 | `getOrganizerEvents` uses 3 subcount queries per event | API layer | Slow for organizers with many events |
| 24 | No idempotency keys for Edge Function calls | Edge Functions | Duplicate operations |
| 25 | `waitForTransactionCompletion` polls then subscribes | `transactions.ts` | Race condition between poll and subscription |
| 26 | `getLiveStreams` uses JSONB containment query | API layer | Cannot use indexes |
| 27 | No request body size limits on Edge Functions | Edge Functions | DoS via large payloads |
| 28 | 48 migrations with self-fixing patterns | Migrations | Technical debt |
| 29 | No migration rollback scripts | Migrations | Cannot undo changes |
| 30 | `supabase/schemas/` empty directory | Config | Dead folder |

### LOW

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 31 | No JSDoc or function documentation | API layer | Poor discoverability |
| 32 | `search.ts` only returns trending — no full-text search | API layer | Limited search capability |
| 33 | `getPlatformStats` makes 3 separate count queries | `platform.ts` | Could be single query |
| 34 | Deno standard library pinned to old versions | Edge Functions | Missing security patches |
| 35 | Archive migrations directory with 7 files | Migrations | Repository clutter |
| 36 | `config.toml` only has project_id | Config | No local dev configuration |

---

## PART 11 — RECOMMENDATIONS (PRIORITIZED)

### Immediate — This Week

1. **Add idempotency keys** to `send-gift` and `wallet-ticket-payment` Edge Functions. Generate UUID per request, store in transaction metadata, reject duplicate keys.

2. **Restrict CORS** on all Edge Functions to app domain(s): `https://eventz.app`, `capacitor://localhost`.

3. **Add database indexes**:
   ```sql
   CREATE INDEX IF NOT EXISTS idx_stream_chat_messages_event_id ON stream_chat_messages(event_id, created_at);
   CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
   CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, date);
   CREATE INDEX IF NOT EXISTS idx_tickets_event_id_status ON tickets(event_id, status);
   ```

4. **Fix `organizer_profiles` FK**: `ALTER TABLE organizer_profiles ADD CONSTRAINT organizer_profiles_id_fkey FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;`

5. **Drop duplicate tables**: `DROP TABLE IF EXISTS comments; DROP TABLE IF EXISTS likes;`

### This Sprint (Week 2)

6. **Create `getFeed` RPC** that returns posts with blocked/liked/saved status in a single query.

7. **Create `getNotifications` RPC** that aggregates follows, likes, comments, tickets in a single query.

8. **Add generated columns** for JSONB fields:
   ```sql
   ALTER TABLE events ADD COLUMN is_live BOOLEAN GENERATED ALWAYS AS ((streaming->>'isLive')::boolean) STORED;
   ALTER TABLE events ADD COLUMN cf_live_input_uid TEXT GENERATED ALWAYS AS (streaming->>'cf_live_input_uid') STORED;
   CREATE INDEX idx_events_is_live ON events(is_live) WHERE is_live = true;
   ```

9. **Add transaction rollback** to `wallet-ticket-payment` — if ticket creation fails after nTZS transfer, reverse the transfer.

10. **Validate ticket price server-side** in `wallet-ticket-payment` — fetch `ticket_tiers` from DB and verify `amount` matches the tier price.

### Week 3

11. **Replace `subscribeToAllMessages`** with per-conversation subscriptions only.

12. **Add rate limiting** to Edge Functions (use Supabase's built-in rate limiting or add custom middleware).

13. **Split `events.ts`** into: `events.ts`, `eventStreaming.ts`, `eventLikes.ts`, `eventAnalytics.ts`.

14. **Add RLS constraint** on `transactions` to prevent inserting `completed` status directly:
    ```sql
    CREATE POLICY "Users can only insert pending transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
    ```

### Month 2

15. **Implement pgTAP tests** for critical RPCs: `purchase_ticket`, `become_organizer`, `scan_ticket`.

16. **Add RLS policy tests** for all tables.

17. **Migrate `ticket_tiers`** from JSONB to related table with proper constraints.

18. **Add `deleted_at` soft delete** column to events and posts.

19. **Move `stream_key`** to separate `stream_keys` table with restricted SELECT policy.

20. **Standardize Edge Function imports** — use `import_map.json` for centralized dependency management.

### Month 3+

21. **Add Redis caching** for hot queries (feed, events, notifications).

22. **Implement full-text search** using PostgreSQL `tsvector` + GIN index.

23. **Add database read replicas** for scaling read throughput.

24. **Consider migrating to proper backend** (Node.js/Deno) for: rate limiting, request validation, audit logging, webhook processing.

---

## PART 12 — SCORING BREAKDOWN

| Category | Score | Rationale |
|----------|-------|-----------|
| **Schema Design** | 4/10 | Good entity coverage, but duplicate tables, JSONB abuse, string prices, missing FKs |
| **RLS Policies** | 7/10 | Comprehensive hardening across 48 migrations, anti-escalation triggers, messaging IDOR fixed |
| **Edge Functions** | 5/10 | Good financial flow design, but no idempotency, no rollback, CORS `*`, inconsistent imports |
| **API Layer** | 5/10 | Good domain separation, consistent error handling, but N+1 queries, no validation, 682-line god module |
| **Authentication** | 7/10 | Proper PKCE, JWT verification in Edge Functions, trigger-based privilege protection |
| **Performance** | 3/10 | N+1 queries, missing indexes, O(N) subscriptions, JSONB queries without indexes |
| **Security** | 4/10 | Good RLS and RPC design, but financial functions lack idempotency/rollback, CORS wide open |
| **Testing** | 0/10 | Zero automated tests for database, Edge Functions, or API layer |
| **Code Quality** | 5/10 | Consistent error handling, good type exports, but god modules, no documentation |
| **Scalability** | 3/10 | Connection limits, O(N) subscriptions, no caching, no read replicas |
| **Migration Health** | 4/10 | Good audit trail, but self-fixing patterns, no rollbacks, 48 migrations |

### Overall: **4.2/10**

---

## PART 13 — COMPARISON WITH FRONTEND

| Aspect | Frontend | Backend | Winner |
|--------|----------|---------|--------|
| Type Safety | 125+ `any` annotations | ~40 `any` in API layer | Backend |
| Error Handling | 30+ silent catches | Consistent throw pattern | Backend |
| Testing | 2 test files | 0 test files | Frontend (barely) |
| Security | Client-side only | RLS + RPC + triggers | Backend |
| Performance | No virtualization | N+1 queries, missing indexes | Tie (both poor) |
| Code Organization | Flat components | Domain-separated API | Backend |
| Documentation | None | None | Tie |

---

*This audit was performed on July 8, 2026 by automated codebase analysis. The findings are based on static analysis of the source code, database schema, Edge Functions, and migration history. Dynamic analysis, load testing, and penetration testing would likely reveal additional issues.*
