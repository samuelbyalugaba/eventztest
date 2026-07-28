# PostgreSQL RPC Functions

Database functions callable via `supabase.rpc()`. These functions run as `SECURITY DEFINER` to bypass RLS and perform privileged operations.

## How to Call RPC Functions

```typescript
const { data, error } = await supabase.rpc('function_name', {
  param1: value1,
  param2: value2,
});
if (error) throw error;
```

---

## 1. `purchase_ticket`

Creates a ticket and links it to a verified transaction. Uses row-level locking to prevent race conditions on tier availability.

**File**: `supabase/migrations/20260226000100_secure_purchase_ticket.sql`

| | |
|---|---|
| **Security** | `SECURITY DEFINER` (runs as owner) |
| **Returns** | `json` — `{ id: number, status: "success" }` |
| **Side effects** | Inserts ticket, decrements tier availability, links transaction |

**Parameters**:

| Name | Type | Required | Description |
|---|---|---|---|
| `p_event_id` | `BIGINT` | Yes | Event to purchase ticket for |
| `p_ticket_type` | `TEXT` | Yes | Must match a tier name in `events.ticket_tiers` |
| `p_customer_name` | `TEXT` | Yes | Buyer's display name |
| `p_customer_email` | `TEXT` | Yes | Buyer's email |
| `p_ticket_number` | `TEXT` | Yes | Unique ticket identifier |
| `p_qr_code` | `TEXT` | Yes | QR code data (nullable) |
| `p_user_id` | `UUID` | No | Defaults to `auth.uid()` |
| `p_price` | `TEXT` | No | Price string (informational) |
| `p_transaction_id` | `BIGINT` | Yes | Must reference a `completed`/`success` transaction belonging to the user |

**Race condition handling**:
- `SELECT ... FROM events WHERE id = p_event_id FOR UPDATE` — locks the event row
- Tier availability check + decrement is atomic within the transaction
- Transaction row is locked with `FOR UPDATE` to prevent reuse (`ticket_id` check)

**Error cases**:
- `Event not found`, `Invalid ticket type`, `Tickets sold out for this tier`
- `Transaction not found`, `Transaction does not belong to user`, `Transaction already used`
- `Transaction not completed`, `Insufficient transaction amount`

```typescript
await supabase.rpc('purchase_ticket', {
  p_event_id: 42,
  p_ticket_type: 'VIP',
  p_customer_name: 'Jane Doe',
  p_customer_email: 'jane@example.com',
  p_ticket_number: 'TIX-001',
  p_qr_code: null,
  p_price: 'TSh 50,000',
  p_transaction_id: 101,
});
```

---

## 2. `scan_ticket`

Validates and marks a ticket as used. Only the event organizer can scan.

**File**: `supabase/migrations/20260303_scan_ticket_rpc.sql`

| | |
|---|---|
| **Security** | `SECURITY DEFINER` |
| **Returns** | `jsonb` |
| **Side effects** | Updates ticket `status` to `'used'`, sets `scanned_at` and `scanned_by` |

**Parameters**:

| Name | Type | Required | Description |
|---|---|---|---|
| `p_ticket_code` | `TEXT` | Yes | Ticket barcode or ticket number |
| `p_event_id` | `BIGINT` | Yes | Event to scan against |

**Response shape**:

```json
{
  "success": true,
  "message": "Ticket Verified",
  "data": {
    "customer_name": "Jane Doe",
    "ticket_type": "VIP",
    "ticket_number": "TIX-001"
  }
}
```

**Error responses**:
- `success: false, message: "Event not found"`
- `success: false, message: "Unauthorized: You are not the organizer"`
- `success: false, message: "Invalid Ticket: Ticket not found for this event"`
- `success: false, message: "Already Scanned"` (includes scan timestamp)
- `success: false, message: "Invalid Ticket: Status is {status}"`

```typescript
const result = await supabase.rpc('scan_ticket', {
  p_ticket_code: 'TIX-001',
  p_event_id: 42,
});
```

---

## 3. `delete_event_complete`

Cascading delete of an event and all dependent data. Only the organizer can delete.

**File**: `supabase/migrations/20260310120005_fix_delete_event.sql`

| | |
|---|---|
| **Security** | `SECURITY DEFINER` (bypasses RLS for cross-user cascade) |
| **Returns** | `VOID` |
| **Side effects** | Unlinks posts, deletes chat messages, saved events, tickets, and the event |

**Parameters**:

| Name | Type | Required | Description |
|---|---|---|---|
| `target_event_id` | `BIGINT` | Yes | Event to delete |

**Deletion order**:
1. Verify `organizer_id = auth.uid()`
2. `UPDATE posts SET event_id = NULL WHERE event_id = target_event_id` (unlink, not delete)
3. `DELETE FROM stream_chat_messages WHERE event_id = target_event_id`
4. `DELETE FROM saved_events WHERE event_id = target_event_id`
5. `DELETE FROM tickets WHERE event_id = target_event_id`
6. `DELETE FROM events WHERE id = target_event_id`

```typescript
await supabase.rpc('delete_event_complete', { target_event_id: 42 });
```

---

## 4. `become_organizer`

Upgrades a personal account to an organizer. Sets `is_organizer=true` and updates profile fields.

**File**: `supabase/migrations/20260313000002_final_profile_fix.sql`

| | |
|---|---|
| **Security** | `SECURITY DEFINER` with `SET search_path = public` |
| **Returns** | `jsonb` (updated profile) |
| **Side effects** | Updates `profiles` row, sets `app.bypass_profile_trigger` config |

**Parameters**:

| Name | Type | Required | Description |
|---|---|---|---|
| `p_full_name` | `TEXT` | Yes | Display name |
| `p_username` | `TEXT` | Yes | Must be unique |
| `p_organizer_type` | `TEXT` | Yes | e.g., "Professional", "Community" |
| `p_location` | `TEXT` | Yes | City/region |
| `p_bio` | `TEXT` | Yes | Short bio |
| `p_avatar_url` | `TEXT` | Yes | Profile image URL |
| `p_contact_email` | `TEXT` | No | Public contact email |

**Mechanism**: Uses `set_config('app.bypass_profile_trigger', 'true', true)` to allow setting `is_organizer` (normally blocked by the `protect_profile_updates` trigger).

```typescript
await supabase.rpc('become_organizer', {
  p_full_name: 'John Events',
  p_username: 'johnevents',
  p_organizer_type: 'Professional',
  p_location: 'Dar es Salaam',
  p_bio: 'Event organizer',
  p_avatar_url: 'https://...',
});
```

---

## 5. `downgrade_to_personal_account`

Reverts an organizer account back to a personal account.

**File**: `supabase/migrations/20260308_downgrade_account_rpc.sql`

| | |
|---|---|
| **Security** | `SECURITY DEFINER` with `SET search_path = public` |
| **Returns** | `void` |
| **Side effects** | Sets `is_organizer=false`, deletes `organizer_profiles` row |

**Parameters**: None

```typescript
await supabase.rpc('downgrade_to_personal_account');
```

---

## 6. `increment_event_view`

Increments the view counter on an event.

**File**: Referenced in `archive/all.sql`

| | |
|---|---|
| **Security** | `SECURITY DEFINER` |
| **Returns** | `void` |
| **Side effects** | `UPDATE events SET views = views + 1 WHERE id = event_id` |

**Parameters**:

| Name | Type | Required | Description |
|---|---|---|---|
| `event_id` | `BIGINT` | Yes | Event to increment |

```typescript
await supabase.rpc('increment_event_view', { event_id: 42 });
```

---

## 7. `increment_post_view`

Increments the view counter on a post.

| | |
|---|---|
| **Security** | `SECURITY DEFINER` |
| **Returns** | `void` |

**Parameters**:

| Name | Type | Required | Description |
|---|---|---|---|
| `post_id` | `BIGINT` | Yes | Post to increment |

---

## 8. `increment_media_view`

Increments the view counter on a user media item.

| | |
|---|---|
| **Security** | `SECURITY DEFINER` |
| **Returns** | `void` |

**Parameters**:

| Name | Type | Required | Description |
|---|---|---|---|
| `media_id` | `BIGINT` | Yes | Media item to increment |

---

## 9. `get_organizer_stats`

Computes aggregate statistics for an organizer profile.

**File**: `supabase/migrations/20260310120012_performance_fixes.sql`

| | |
|---|---|
| **Security** | `SECURITY DEFINER` |
| **Returns** | `json` |

**Parameters**:

| Name | Type | Required | Description |
|---|---|---|---|
| `target_user_id` | `UUID` | Yes | Organizer user ID |

**Response shape**:

```json
{
  "totalEvents": 12,
  "followers": 340,
  "totalViews": 15000,
  "ticketsSold": 89,
  "revenue": 4500000,
  "liveStreams": 3,
  "avgRating": 0
}
```

**Aggregation queries**:
- Event count from `events`
- Follower count from `follows`
- Views sum from `events.views` + `posts.views` + `user_media.views`
- Tickets + revenue from `tickets` joined with `events` (regex price parsing)

---

## 10. `get_event_analytics`

Computes detailed analytics for a single event.

**File**: `supabase/migrations/20260310120012_performance_fixes.sql`

| | |
|---|---|
| **Security** | `SECURITY DEFINER` |
| **Returns** | `json` |

**Parameters**:

| Name | Type | Required | Description |
|---|---|---|---|
| `target_event_id` | `BIGINT` | Yes | Event to analyze |

**Response shape**:

```json
{
  "views": 1500,
  "interested": 45,
  "ticketsSold": 30,
  "shares": 12,
  "revenue": 1500000,
  "trends": {
    "interested": { "last7": 10, "prev7": 5 },
    "tickets": { "last7": 8, "prev7": 12 },
    "shares": { "last7": 3, "prev7": 2 }
  },
  "dailyActivity": [2, 5, 8, 3, 7, 12, 6],
  "demographics": {
    "locations": { "Dar es Salaam": 60, "Arusha": 25 },
    "ageGroups": { "18-24": 30, "25-34": 45, "35-44": 15, "45+": 10 }
  }
}
```

**Side effects**: None (read-only).

---

## 11. `check_profile_updates` (Trigger Function)

Trigger function that protects privileged profile fields from unauthorized changes.

**File**: `supabase/migrations/20260313000002_final_profile_fix.sql`

| | |
|---|---|
| **Security** | `plpgsql` trigger (`BEFORE UPDATE ON profiles`) |
| **Returns** | `TRIGGER` |

**Protected fields**:
- `is_organizer` — only changeable with bypass flag
- `verified` — only changeable with bypass flag
- `organizer_type` — only changeable by the user themselves if already an organizer

**Bypass mechanism**: `SET app.bypass_profile_trigger = 'true'` (used by `become_organizer` and `downgrade_to_personal_account`).

---

## 12. `handle_new_message` (Trigger Function)

Trigger on the `messages` table that updates the parent conversation's `updated_at` timestamp.

**File**: `supabase/migrations/20260310120013_race_condition_fixes.sql`

| | |
|---|---|
| **Security** | `plpgsql` trigger (`AFTER INSERT ON messages`) |
| **Returns** | `TRIGGER` |

**Side effects**: `UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id`

---

## 13. `update_updated_at_column` (Trigger Function)

Generic trigger that auto-sets `updated_at` on row updates.

**File**: `supabase/migrations/20260310120010_fix_updated_at_column.sql`

Attached to: `events` table.

---

## 14. `update_event_attendees_count`

Synchronizes the `attendees` count on events based on ticket data.

**File**: `supabase/migrations/20260303000100_sync_attendees_count.sql`

---

## 15. `cleanup_expired_idempotency_keys`

Removes expired idempotency keys from the `idempotency_keys` table.

**File**: `supabase/migrations/20260723000000_create_idempotency_keys.sql`

---

## Security Model Summary

| Function | Auth Check | RLS Bypass | Row Locking |
|---|---|---|---|
| `purchase_ticket` | `auth.uid()` via `COALESCE` | Yes (SECURITY DEFINER) | `FOR UPDATE` on events + transactions |
| `scan_ticket` | `auth.uid()` vs `organizer_id` | Yes | None (atomic UPDATE) |
| `delete_event_complete` | `auth.uid()` vs `organizer_id` | Yes | None |
| `become_organizer` | `auth.uid()` required | Yes + bypass trigger | None |
| `downgrade_to_personal_account` | `auth.uid()` required | Yes | None |
| `increment_*_view` | None (public) | Yes | None |
| `get_*_stats` | None (public read) | Yes | None |
