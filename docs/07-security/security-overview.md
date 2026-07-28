# Security Overview

## Threat Model

Eventz handles event ticketing, payments, live streaming, and user-generated content. The top 5 threats:

| # | Threat | Impact | Likelihood |
|---|--------|--------|------------|
| 1 | **Authentication bypass** — session hijacking, token theft | Account takeover, payment fraud | Medium |
| 2 | **Payment fraud** — ticket purchase manipulation, wallet tampering | Financial loss | High |
| 3 | **IDOR** — accessing other users' data via predictable IDs | Data breach, privacy violation | Medium |
| 4 | **XSS** — malicious content in posts, comments, event descriptions | Session theft, defacement | Medium |
| 5 | **Privilege escalation** — regular user accessing admin functions | Data modification, fraud | Low |

## Authentication

### Methods

| Method | Provider | Flow |
|--------|----------|------|
| Email/Password | Supabase Auth | Standard email + password |
| Google OAuth | Supabase Auth + Google | OAuth 2.0 authorization code |
| Apple Sign-In | Supabase Auth + Apple | OAuth 2.0 with Apple |
| Magic Links | Supabase Auth | Email-based passwordless login |

### Session Management

- **JWT tokens**: Short-lived access tokens (1 hour), refresh tokens for renewal
- **PKCE flow**: Used for web OAuth (prevents authorization code interception)
- **Storage**: Tokens stored in `localStorage` via Supabase client (flagged in audits — see PII Handling)

## Authorization

### Row Level Security (RLS)

RLS is enabled on all tables. Policies enforce:

| Table | Read | Write | Delete |
|-------|------|-------|--------|
| `profiles` | Public profiles readable | Owner only | Owner only |
| `events` | Public | Organizer only | Organizer only |
| `tickets` | Owner only | System RPC only | N/A |
| `messages` | Conversation participants | Sender only | Sender only |
| `transactions` | Owner only | System RPC only | N/A |

### RPC Security

Critical operations use `SECURITY DEFINER` functions:
- `purchase_ticket` — Requires pre-existing `completed` transaction
- `scan_ticket` — Validates ticket ownership and event match
- `become_organizer` — Verifies profile exists
- `delete_event_complete` — Cascade deletion with authorization

## CORS Configuration

### Current State

| Location | CORS Policy | Status |
|----------|-------------|--------|
| Vercel headers | `Access-Control-Allow-Origin: https://app.eventz.live` | Correct |
| Edge Functions | `Access-Control-Allow-Origin: *` | **FLAGGED** |

**Issue**: Edge Functions allow requests from any origin. Financial functions (`send-gift`, `wallet-ticket-payment`) are vulnerable to cross-origin attacks.

**Recommendation**: Restrict Edge Function CORS to `https://app.eventz.live` and `capacitor://localhost` (native).

## Rate Limiting

### Current Gaps

| Endpoint | Rate Limit | Status |
|----------|------------|--------|
| `send-gift` | **None** | **FLAGGED** |
| `wallet-ticket-payment` | **None** | **FLAGGED** |
| `purchase_ticket` | **None** (via RPC) | **FLAGGED** |
| Auth endpoints | Supabase managed | OK |
| Regular API | None | Gap |

**Recommendation**: Implement rate limiting in Edge Functions or via Supabase database triggers.

## Input Validation

### Current State

- **No validation library** (Zod, Joi, etc.) — validation is ad-hoc and browser-side only
- Edge Functions accept unvalidated `eventId` and `amount` from client requests
- `purchase_ticket` RPC uses database-level constraints (NOT NULL, CHECK)

**Recommendation**: Add Zod schemas for all Edge Function inputs. Validate on server before processing.

## Secrets Management

| Secret | Location | Status |
|--------|----------|--------|
| Supabase anon key | `.env` (VITE_*) | Public by design |
| Supabase service role | Edge Functions | Server-side only |
| Sentry DSN | `.env` (VITE_*) | Semi-public |
| Database password | `.env` | **FLAGGED — was committed** |

**Critical Finding**: A `.env` file with plaintext database password and full connection URLs was found in the working tree during audit. This must be removed and added to `.gitignore`.

## PII Handling

### Current Storage

| Data | Storage | Risk |
|------|---------|------|
| Email | Supabase Auth | Low — encrypted at rest |
| Profile name | `profiles` table | Low — RLS protected |
| Payment data | Supabase (via transactions) | Medium — server-side |
| Auth tokens | `localStorage` | Medium — XSS accessible |
| User preferences | `localStorage` | Low — non-sensitive |

**Flagged Issue**: `localStorage` stores authentication state and user preferences. If XSS is achieved, tokens can be exfiltrated. Recommend HttpOnly cookies for session storage where possible.

## Key Vulnerabilities from Audits

| # | Vulnerability | Severity | Source |
|---|---------------|----------|--------|
| 1 | `.env` with secrets committed to repo | Critical | production-analysis |
| 2 | CORS `*` on Edge Functions | High | backend-analysis |
| 3 | No rate limiting on financial endpoints | High | backend-analysis |
| 4 | No input validation in Edge Functions | High | backend-analysis |
| 5 | 125+ `any` types bypassing TypeScript safety | High | frontend-analysis |
| 6 | Client-side-only role checks | Medium | production-analysis |
| 7 | Duplicate Supabase clients | Medium | production-analysis |
| 8 | Silent error catches (30+ occurrences) | Medium | production-analysis |
| 9 | No RBAC enforcement on server | Medium | production-analysis |
| 10 | No data validation layer (Zod) | Medium | production-analysis |

## Security Recommendations (Priority Order)

1. **Immediate**: Remove `.env` from repo, rotate all secrets
2. **High**: Restrict Edge Function CORS
3. **High**: Add rate limiting to financial endpoints
4. **High**: Add Zod validation to Edge Functions
5. **Medium**: Consolidate Supabase clients
6. **Medium**: Replace silent catches with proper error handling
7. **Medium**: Move session storage to HttpOnly cookies
8. **Low**: Add CSP meta tag to `index.html`
