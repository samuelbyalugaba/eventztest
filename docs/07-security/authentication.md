# Authentication

## Overview

Eventz uses **Supabase Auth** for all authentication. The app supports multiple auth methods, uses PKCE flow for web OAuth, and manages sessions via JWT tokens.

## Auth Methods

| Method | Flow | Provider |
|--------|------|----------|
| Email + Password | Standard registration/login | Supabase Auth |
| Google OAuth | Authorization code + PKCE | Google via Supabase |
| Apple Sign-In | OAuth 2.0 | Apple via Supabase |
| Magic Links | Email-based passwordless | Supabase Auth |

### Google OAuth Flow

1. User clicks "Sign in with Google"
2. Redirect to Google consent screen
3. Google redirects back with authorization code
4. Supabase exchanges code for tokens (PKCE)
5. Session created, user profile loaded

### Apple Sign-In Flow

1. User clicks "Sign in with Apple"
2. Apple OAuth consent screen
3. Redirect with authorization code
4. Supabase creates/links account
5. Session created, user profile loaded

### Magic Link Flow

1. User enters email
2. Supabase sends magic link email
3. User clicks link in email
4. Session created, redirected to app

## Session Management

### Token Structure

- **Access Token**: JWT, short-lived (~1 hour), contains user ID, role, metadata
- **Refresh Token**: Long-lived, used to obtain new access tokens
- **Token Storage**: `localStorage` via Supabase client (flagged in security audit)

### Refresh Flow

```
Access Token expires
    │
    ▼
Supabase client detects 401
    │
    ▼
Automatic refresh using refresh_token
    │
    ▼
New access_token stored
    │
    ▼
Request retried
```

### Session Persistence

```typescript
// Supabase client configured with session persistence
// Tokens stored in localStorage automatically
// Session survives page reloads
```

## AuthContext Provider

**File**: `src/contexts/AuthContext.tsx`

The `AuthContext` provides auth state to the entire app:

```typescript
interface AuthContextType {
  user: User | null;           // Supabase auth user
  profile: Profile | null;     // App profile from profiles table
  session: Session | null;     // Current session
  loading: boolean;            // Auth state loading
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, name) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithMagicLink: (email) => Promise<void>;
}
```

### Provider Structure

```tsx
<AuthProvider>
  <MessagingProvider>
    <App />
  </MessagingProvider>
</AuthProvider>
```

## Profile Bootstrapping

On first login, a profile is created automatically:

1. User signs up (email/password or OAuth)
2. `auth.users` record created by Supabase
3. Trigger or Edge Function creates `profiles` row
4. Profile data populated from auth metadata
5. `AuthContext` loads profile into state

### Profile State Management

The app uses triple-write pattern for profile state (flagged in audits):
- `AuthContext` useState
- Zustand `profileStore`
- `localStorage`

**Issue**: This creates potential for stale/inconsistent state. Recommended to consolidate to Zustand only.

## Account Deletion

### Flow

1. User requests account deletion
2. Edge Function `delete_account` invoked
3. CASCADE deletes related data (events, posts, tickets, messages)
4. Profile record deleted
5. Supabase auth user deleted
6. Session invalidated

### Data Removed

| Table | Delete Method |
|-------|---------------|
| `profiles` | Hard delete |
| `events` | CASCADE from `organizer_id` |
| `posts` | CASCADE from `user_id` |
| `tickets` | CASCADE from `user_id` |
| `messages` | CASCADE from `sender_id` |
| `conversations` | CASCADE from participant IDs |
| `follows` | CASCADE from both IDs |
| `post_likes` | CASCADE from `user_id` |
| `post_comments` | CASCADE from `user_id` |

## Edge Function Auth

### Service Role Key

Edge Functions use `SERVICE_ROLE_KEY` for elevated access:

```typescript
// Supabase Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!  // Bypasses RLS
);
```

### Function Secrets

Secrets are configured in the Supabase dashboard:
- `SERVICE_ROLE_KEY` — Bypasses RLS for admin operations
- `RESEND_API_KEY` — Email delivery
- `CLOUDFLARE_API_TOKEN` — Stream management
- Other service-specific keys

### Auth Verification in Functions

```typescript
// Verify user authentication
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const { data: { user }, error } = await supabase.auth.getUser(token!);
if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

## Auth Security

| Measure | Status | Notes |
|---------|--------|-------|
| PKCE flow | Implemented | Prevents code interception |
| Token refresh | Automatic | Via Supabase client |
| RLS enforcement | Enabled | On all tables |
| Rate limiting | Not implemented | On Edge Functions |
| MFA | Not implemented | Recommended |
| Email verification | Supabase default | Configurable |

## Common Auth Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Token expired | Access token lifetime | Auto-refresh should handle |
| Session lost | localStorage cleared | Re-authenticate |
| OAuth redirect fails | Incorrect redirect URL | Check Supabase auth settings |
| Profile not loading | RLS policy blocking | Check `profiles` RLS policies |
| Magic link not received | Email delivery issue | Check `email_deliveries` table |
