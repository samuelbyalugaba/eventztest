# Edge Functions Reference

Supabase Edge Functions deployed in `supabase/functions/`. All functions are Deno-based, run on Supabase infrastructure, and use shared CORS helpers.

## Base URL

```
https://{project-ref}.supabase.co/functions/v1/{function-name}
```

Invoke via the client:

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  method: 'POST', // default
  body: { /* payload */ },
});
```

## Authentication

| Mechanism | Usage |
|---|---|
| `Authorization: Bearer <JWT>` | User-scoped functions validate JWT via `anonKey` + `getUser(token)` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations inside functions (bypasses RLS) |
| `EVENTZ_INTERNAL_FUNCTION_SECRET` | Internal-only functions (`send-push-notification`, `send-email`) checked via `x-eventz-internal-secret` header |
| `Webhook-Signature` / `x-ntzs-signature` | External webhook validation (Cloudflare, nTZS) |

## CORS Configuration

**File**: `supabase/functions/shared/cors.ts`

Allowed origins: `eventz.app`, `www.eventz.app`, `app.eventz.app`, `localhost:5173`, `localhost:3000`. All functions handle `OPTIONS` preflight via `corsOptionsResponse(req)`.

---

## Functions

### 1. `agora-rtc-token`

Generates Agora RTC tokens for live stream audio/video.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | None (public) |
| **Secrets** | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` |

**Request body**:

```json
{
  "channelName": "event-123",
  "uid": "user-uuid-or-number",
  "role": "publisher" | "subscriber",
  "expireSeconds": 3600
}
```

**Response**:

```json
{
  "token": "006abc...",
  "role": "publisher",
  "channel": "event-123",
  "expireAt": 1690000000
}
```

**Error responses**: `400` missing channelName, `500` missing secrets.

```bash
supabase functions deploy agora-rtc-token --no-verify-jwt
```

---

### 2. `cloudflare-stream-create`

Provisions a Cloudflare Stream Live Input for an event. Returns RTMPS ingest URL + stream key.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Bearer JWT (must be event organizer) |
| **Secrets** | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_TOKEN` |

**Request body**:

```json
{ "eventId": 42 }
```

**Response**:

```json
{
  "ingestUrl": "rtmps://live.cloudflare.com:443/live/",
  "streamKey": "abc123...",
  "playbackUrl": "https://videodelivery.net/uid/manifest/video.m3u8",
  "liveInputUid": "cf-uid",
  "reused": false
}
```

**Side effects**: Updates `events.streaming` JSONB with provider, keys, and URLs.

```bash
supabase functions deploy cloudflare-stream-create
```

---

### 3. `cloudflare-stream-status`

Polls Cloudflare Stream state and syncs `events.streaming.isLive`. Can check a single event or all provisioned events.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | None (public) |
| **Secrets** | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_TOKEN` |

**Request body**: `{ "eventId": 42 }` (optional — omit for all events)

**Response**:

```json
{
  "results": [
    { "eventId": 42, "state": "connected", "isLive": true, "changed": true }
  ]
}
```

```bash
supabase functions deploy cloudflare-stream-status --no-verify-jwt
```

---

### 4. `cloudflare-stream-webhook`

Receives Cloudflare Stream webhook notifications (connect/disconnect/recording ready). Updates event streaming state and saves recordings to `cloudflare_streams` table.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | HMAC SHA-256 (`Webhook-Signature` header) |
| **Secrets** | `CLOUDFLARE_STREAM_WEBHOOK_SECRET` |

**Request body**: Cloudflare webhook payload (auto-parsed).

**Response**: Always `200 OK` with `"ok"` body (webhook best-effort).

**Side effects**: Updates `events.streaming`, upserts `cloudflare_streams` row.

```bash
supabase functions deploy cloudflare-stream-webhook --no-verify-jwt
```

---

### 5. `cloudflare-stream-backfill`

One-shot backfill: fetches all Cloudflare Stream recordings for an organizer's live inputs and syncs them to the database.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Bearer JWT (organizer) |
| **Secrets** | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_TOKEN` |

**Response**:

```json
{
  "ok": true,
  "totalRecordings": 5,
  "eventsScanned": 3,
  "results": [...]
}
```

```bash
supabase functions deploy cloudflare-stream-backfill
```

---

### 6. `delete-account`

Deletes the authenticated user's account, storage files, and profile data.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Bearer JWT (user) |
| **Secrets** | `SUPABASE_SERVICE_ROLE_KEY` |

**Request body**: `{}`

**Response**: `{ "success": true }`

**Side effects**: Removes files from `avatars`, `events`, `posts` storage buckets; deletes auth user, profile, organizer_profile.

```bash
supabase functions deploy delete-account
```

---

### 7. `delete-post-complete`

Deletes a post and its associated storage files. Owner-only.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Bearer JWT (post owner) |
| **Secrets** | `SUPABASE_SERVICE_ROLE_KEY` |

**Request body**: `{ "postId": 123 }`

**Response**: `{ "success": true, "postId": 123 }`

**Side effects**: Deletes post row; removes images from `posts` storage bucket.

```bash
supabase functions deploy delete-post-complete
```

---

### 8. `send-gift`

Sends a gift from one user to an event organizer via nTZS wallet transfer.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Bearer JWT (sender) |
| **Secrets** | `NTZS_API_KEY` |

**Request body**:

```json
{
  "eventId": 42,
  "amount": 5000,
  "currency": "TZS",
  "idempotencyKey": "optional-key"
}
```

**Response**:

```json
{
  "id": 101,
  "success": true,
  "idempotent": false
}
```

**Side effects**: Creates nTZS user pair, transfers funds, inserts two transaction records (sender debit + recipient credit), stores idempotency key.

**Error responses**: `400` insufficient balance / self-gift, `404` event not found, `409` operation in progress.

```bash
supabase functions deploy send-gift
```

---

### 9. `wallet-ticket-payment`

Processes ticket purchase via nTZS wallet.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Bearer JWT (buyer) |
| **Secrets** | `NTZS_API_KEY` |

**Request body**:

```json
{
  "eventId": 42,
  "amount": 50000,
  "currency": "TZS",
  "metadata": { "ticketType": "VIP" }
}
```

**Response**:

```json
{
  "transactionId": 101,
  "transfer": { "id": "...", "txHash": "..." }
}
```

**Side effects**: Same idempotency + dual-transaction pattern as `send-gift`. Rolls back nTZS transfer on DB failure.

```bash
supabase functions deploy wallet-ticket-payment
```

---

### 10. `ntzs-proxy`

Proxies requests to the nTZS API. Handles user creation, balance queries, deposits, transfers, and withdrawals. Reconciles pending deposits.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Bearer JWT (user) |
| **Secrets** | `NTZS_API_KEY` |

**Request body**:

```json
{
  "action": "create_user" | "get_user" | "get_balance" | "deposit" | "get_deposit" | "transfer" | "withdraw" | "reconcile_pending_deposits",
  "payload": { /* action-specific */ }
}
```

**Response**: Action-specific nTZS API response, plus `reconciliation` field for `get_deposit`.

```bash
supabase functions deploy ntzs-proxy
```

---

### 11. `ntzs-webhook`

Receives nTZS webhook notifications (deposit/transfer/withdrawal completion).

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | HMAC SHA-256 (`x-ntzs-signature` header) |
| **Secrets** | `NTZS_WEBHOOK_SECRET` |

**Side effects**: Updates or inserts transaction records in `transactions` table.

```bash
supabase functions deploy ntzs-webhook --no-verify-jwt
```

---

### 12. `send-push-notification`

Sends Web Push notifications to users.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Bearer JWT (social kinds) or `EVENTZ_INTERNAL_FUNCTION_SECRET` (generic) |
| **Secrets** | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `EVENTZ_INTERNAL_FUNCTION_SECRET` |

**Request body (social)**:

```json
{
  "kind": "like" | "comment" | "follow",
  "postId": 123,
  "targetUserId": "uuid"
}
```

**Request body (generic, internal only)**:

```json
{
  "kind": "generic",
  "userIds": ["uuid"],
  "title": "Custom Title",
  "body": "Notification body",
  "url": "/events/42"
}
```

**Response**: `{ "ok": true, "sent": 3, "removed": 0 }`

**Side effects**: Cleans up expired push subscriptions (404/410).

```bash
supabase functions deploy send-push-notification
```

---

### 13. `send-email`

Sends emails via Resend. Supports templated social notifications and generic internal sends.

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Bearer JWT (social) or internal secret (generic) |
| **Secrets** | `RESEND_API_KEY`, `EMAIL_FROM`, `EVENTZ_INTERNAL_FUNCTION_SECRET` |

**Kinds**: `welcome`, `event_reminder`, `ticket_confirmation`, `product_update`, `support`, `like`, `comment`, `follow`, `generic`, `config`

**Response**: `{ "ok": true, "sent": 1, "skipped": 0, "failed": 0 }`

**Side effects**: Logs delivery status to `email_deliveries` table.

```bash
supabase functions deploy send-email
```

---

### 14. `send-auth-email`

Handles Supabase auth hook emails (signup confirmation, password reset, email change, reauthentication).

| | |
|---|---|
| **HTTP Method** | POST |
| **Auth** | Webhook (`SEND_EMAIL_HOOK_SECRET` via Standard Webhooks) |
| **Secrets** | `SEND_EMAIL_HOOK_SECRET`, `RESEND_API_KEY` |

**Response**: `{}` (empty on success)

**Side effects**: Logs to `email_deliveries` table.

```bash
supabase functions deploy send-auth-email --no-verify-jwt
```

---

### 15. `apply-push-subscription-migration`

One-shot migration utility for push subscription data. (Function directory may be empty or removed.)

---

## Cold Start Considerations

- Edge Functions on Supabase have a cold start latency of ~200-500ms
- Warm instances stay alive for ~5 minutes of inactivity
- Functions that call external APIs (nTZS, Cloudflare, Resend) add 100-500ms per external call
- Payment functions (`send-gift`, `wallet-ticket-payment`) have the highest latency due to idempotency checks + external wallet API + DB writes

**Recommendations**:
- Use idempotency keys for payment functions to safely retry
- Consider caching nTZS user lookups if high-frequency
- The `cloudflare-stream-status` function iterates over all events — paginate for large datasets

---

## Deployment

```bash
# Deploy a single function
supabase functions deploy function-name

# Deploy without JWT verification (webhooks)
supabase functions deploy function-name --no-verify-jwt

# Set a secret
supabase secrets set NTZS_API_KEY=xxx

# List deployed functions
supabase functions list
```
