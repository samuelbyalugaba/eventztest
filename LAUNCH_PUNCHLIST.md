## Eventz v1 Launch Punch‑List (Security‑First)

This checklist is ordered to get you to a **safe, production v1** as fast as possible, with an emphasis on **payments, auth, and data integrity**. Work through it **top‑to‑bottom**.

---

## 0. Pre‑Flight: Environment & Schema Alignment

- [ ] **Confirm environment variables for production**
  - [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set and match the target Supabase project.
  - [ ] Supabase service secrets set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
  - [ ] Payment / wallet secrets set (but not hardcoded anywhere):
    - [ ] `SNIPPE_API_KEY`
    - [ ] `SNIPPE_WEBHOOK_SECRET`
    - [ ] `NTZS_API_KEY` (if NTZS stays enabled)
    - [ ] Any Agora keys (e.g. `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE`) only in server‑side env.

- [ ] **Align database schema with repo**
  - [ ] Ensure all SQL migrations in `supabase/migrations` are applied to the target Supabase project using the Supabase CLI.
  - [ ] Specifically confirm that the **secure `purchase_ticket` RPC and RLS changes** referenced in `SCHEMA.md` and internal docs are present in the live DB.
  - [ ] Remove / archive any ad‑hoc SQL applied directly in the dashboard so the CLI migrations are the single source of truth.

---

## 1. Critical Security: Payments & Tickets (BLOCKING)

### 1.1 Snippe Webhook Hardening

- [ ] **Implement and enforce webhook signature verification**
  - [ ] Read Snippe docs for webhook signing (e.g. `X-Webhook-Signature` or equivalent).
  - [ ] In `supabase/functions/snippe-webhook/index.ts`:
    - [ ] Compute an HMAC (or required scheme) using `SNIPPE_WEBHOOK_SECRET` and the raw request body.
    - [ ] Compare it to the signature header in **constant‑time**; reject if invalid with `401` or `400`.
  - [ ] Remove any hardcoded default webhook secret values from the code.
  - [ ] Log but **do not process** webhook events that fail verification.

- [ ] **Tighten webhook behavior**
  - [ ] Only accept `POST` for webhook; respond with `405` or early exit for other methods.
  - [ ] Validate payload shape before touching the DB:
    - [ ] Ensure `transaction_id` is present in metadata and is a sane ID.
    - [ ] Only allow status transitions the system expects (e.g. `pending → success|failed`).
  - [ ] Return **non‑200 status codes** for actual processing errors so Snippe can retry appropriately.

### 1.2 Ticket Purchase Invariants

- [ ] **Lock down the `purchase_ticket` RPC**
  - [ ] Confirm function requires a `transaction_id` and verifies:
    - [ ] Transaction exists in `transactions`.
    - [ ] `status` is `success` or `completed`.
    - [ ] `amount` and currency match the expected ticket price.
    - [ ] Transaction is not already linked to an existing ticket.
  - [ ] Ensure the function is the **only** path that can create rows in `tickets` (RLS + privileges).

- [ ] **End‑to‑end negative tests (no code changes needed)**
  - [ ] From a client (or SQL editor), attempt to:
    - [ ] Call `purchase_ticket` with a random / nonexistent `transaction_id` → must **fail**.
    - [ ] Call `purchase_ticket` without a transaction or with status not `success` → must **fail**.
  - [ ] Attempt to `INSERT` directly into `tickets` as an authenticated normal user → must be **blocked by RLS**.

---

## 2. Critical Security: Edge Functions & Auth

### 2.1 Agora RTC Token Issuance

- [ ] **Authorize publisher token requests**
  - [ ] In `supabase/functions/agora-rtc-token/index.ts`, require a valid Supabase JWT:
    - [ ] Parse and validate `Authorization: Bearer <access_token>`.
    - [ ] Use Supabase Admin client to fetch user or trust the verified JWT claims.
  - [ ] When `role === "publisher"`:
    - [ ] Extract `eventId` from the request.
    - [ ] Query `events` to ensure the requester is the event’s organizer (or an allowed role).
    - [ ] Only then issue a publisher token; otherwise return `403`.
  - [ ] For viewer/subscriber tokens, still require a valid, authenticated user (or document anonymous rules clearly).

### 2.2 NTZS Proxy Hardening (or Temporary Disable)

- [ ] **Decide if NTZS is needed for v1**
  - [ ] If **not needed**, temporarily disable deployment of `ntzs-proxy` or guard it with a feature flag / early `403`.
  - [ ] If **needed**, implement the following:
    - [ ] Validate the Supabase JWT from `Authorization` header (not just presence).
    - [ ] Enforce per‑user rate limits or quotas (via Supabase rate limits or a small KV‑based counter).
    - [ ] Strictly validate `action` and payload types to avoid generic request forwarding.

### 2.3 Hono Server & Service Role Key Safety

- [ ] Review `src/supabase/functions/server/index.tsx` (`make-server-c3c04079`)
  - [ ] Ensure the `/signup` endpoint:
    - [ ] Is either disabled for public internet or protected behind admin/auth checks.
    - [ ] Has basic rate limiting and abuse protection if it remains public.
  - [ ] Confirm the deployment environment **never** exposes the `SUPABASE_SERVICE_ROLE_KEY` to untrusted clients.

---

## 3. Live Streaming: Scope Decision for v1

### 3.1 Decide: Include Live Streaming in v1 or Not

- [ ] **Option A (Recommended for fastest, safest v1): Ship without live streaming**
  - [ ] Hide or feature‑flag:
    - [ ] “Go Live” entry points in the UI.
    - [ ] Any direct “Live” navigation if it would mislead users.
  - [ ] Keep code but mark the feature as “Coming Soon” in product copy and UI.

- [ ] **Option B: Ship “watch only” using static/demo content**
  - [ ] Keep Live tab but:
    - [ ] Only show curated demo events with static video/HLS URLs you fully control.
    - [ ] Disable/feature‑flag broadcaster tools (`StreamManager`).

- [ ] **Option C: Full live streaming in v1 (highest effort/risk)**
  - [ ] Integrate a real streaming provider (Mux, AWS IVS, Cloudflare Stream, etc.).
  - [ ] Replace the fake RTMP URL in `generateStreamKeys` with real ingest + playback URLs.
  - [ ] Re‑audit all issues listed in `LIVESTREAM_ANALYSIS.md` and `LiveStream_Flaws.md`, especially:
    - [ ] Token security (already in section 2.1).
    - [ ] Viewer count race conditions (move to atomic RPC or presence).
    - [ ] Chat scalability (consider pub/sub and message caps).
  - [ ] Only choose this path if you can invest the extra backend work before launch.

> For quickest secure v1, pick **Option A or B**, and leave full, two‑way live streaming for a later release.

---

## 4. Core App Hardening & UX‑Safe Defaults

### 4.1 RLS & Profile/Role Safety Audit

- [ ] In Supabase, re‑check RLS for:
  - [ ] `profiles`: users can update only their own non‑privileged fields.
  - [ ] `events`, `tickets`, `transactions`, `conversations`, `messages`.
  - [ ] Any table that gates organizer or admin‑like powers.
- [ ] Confirm no client‑controlled flags (e.g. `is_organizer`, `verified`) can be set by regular updates.

### 4.2 Error Handling & Status Codes

- [ ] Standardize HTTP responses in Edge Functions:
  - [ ] Use `4xx` for client errors (validation, auth) and `5xx` for server issues.
  - [ ] Only use `200` for genuine success. If you must send structured errors, also set a non‑success status.
- [ ] Ensure frontend callers:
  - [ ] Check `response.status` or Supabase error fields, not only truthiness of data.
  - [ ] Surface friendly error toasts without leaking sensitive details.

### 4.3 Frontend Guardrails (no code architecture change required)

- [ ] Add simple guards where needed:
  - [ ] Disable payment / ticket purchase buttons while a request is in flight.
  - [ ] Debounce critical actions (follow/unfollow, like spam) to reduce accidental abuse.
  - [ ] Gracefully handle “best effort” actions (analytics increments, presence) when they fail.

---

## 5. Performance & Scale “Good Enough” for v1

(These are non‑blocking if your initial user base is small, but should be tackled early.)

- [ ] **Feed & comments list size caps**
  - [ ] For v1, enforce simple limits like:
    - [ ] Max N posts fetched per page.
    - [ ] Max M comments initially loaded per post.
  - [ ] If time allows, add virtualization to the feed and chat lists later.

- [ ] **Chat & notifications**
  - [ ] Keep per‑conversation message history loaded in the UI to a reasonable maximum (e.g. last 100–200 messages).
  - [ ] Avoid fan‑out subscriptions that are not needed for v1 (e.g. global channels if conversation‑scoped ones are enough).

- [ ] **Database indexes sanity check**
  - [ ] Confirm indexes exist on:
    - [ ] Common foreign keys (`user_id`, `event_id`, `conversation_id`, etc.).
    - [ ] Filter columns used in queries (`status`, `date`, `category`).
  - [ ] Run a couple of `EXPLAIN ANALYZE` checks on the heaviest queries (feed/events/tickets) and add missing B‑tree indexes if obvious.

---

## 6. Ops, Monitoring & Launch Checklist

- [ ] **Basic monitoring**
  - [ ] Turn on Supabase logs and set up alerts for:
    - [ ] Repeated 4xx / 5xx from Edge Functions.
    - [ ] RLS or permission errors on critical tables.
  - [ ] Keep an eye on DB CPU and connection usage during early rollout.

- [ ] **Backups & rollback**
  - [ ] Ensure regular automatic backups on Supabase are enabled.
  - [ ] Document a simple rollback plan:
    - [ ] How to revert the last migration if needed.
    - [ ] How to temporarily disable payments (e.g. by feature flagging purchase buttons) if an issue arises.

- [ ] **Final smoke tests before public traffic**
  - [ ] New user signup, profile setup, organizer onboarding.
  - [ ] Event creation, editing, deletion, and listing.
  - [ ] Ticket purchase with real (or sandbox) Snippe flow end‑to‑end:
    - [ ] Payment initiation.
    - [ ] Webhook callback processed.
    - [ ] Ticket created only after verified success.
  - [ ] Messaging and notifications behave as expected under a small multi‑user test.
  - [ ] PWA install flows on Android and desktop; app loads and works offline as designed.

Once everything above is checked off (or explicitly deferred with a clear reason), you’ll be in a solid position to open Eventz to real users for a **secure v1 launch**.

