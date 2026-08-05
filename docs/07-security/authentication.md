# Authentication

**Last Updated:** August 2026

## Overview

Eventz uses a **custom backend** for all authentication. The app supports multiple auth methods, uses JWT tokens for session management, and handles OAuth through the backend server.

## Auth Methods

| Method | Flow | Provider |
|--------|------|----------|
| Email + Password | Standard registration/login | Custom Backend |
| Google OAuth | Authorization code + PKCE | Google via Backend |
| Apple Sign-In | OAuth 2.0 | Apple via Backend |
| Magic Links | Email-based passwordless | Custom Backend |

### Google OAuth Flow

1. User clicks "Sign in with Google"
2. Redirect to Google consent screen
3. Google redirects back with authorization code
4. Backend exchanges code for tokens
5. Backend creates/links account
6. Session created, JWT issued

### Apple Sign-In Flow

1. User clicks "Sign in with Apple"
2. Apple OAuth consent screen
3. Redirect with authorization code
4. Backend creates/links account
5. Session created, JWT issued

### Magic Link Flow

1. User enters email
2. Backend sends magic link email
3. User clicks link in email
4. Session created, JWT issued

## Session Management

### Token Structure

- **Access Token**: JWT, short-lived (~1 hour), contains user ID, role, metadata
- **Refresh Token**: Long-lived, used to obtain new access tokens
- **Token Storage**: `localStorage` via frontend (flagged in security audit)

### Refresh Flow

```
Access Token expires
    │
    ▼
Frontend detects 401
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
// Frontend stores tokens in localStorage
// Backend validates JWT on each request
// Session survives page reloads
```

## AuthContext Provider

**File**: `src/contexts/AuthContext.tsx`

The `AuthContext` provides auth state to the entire app:

```typescript
interface AuthContextType {
  user: User | null;           // Backend auth user
  profile: Profile | null;     // App profile from profiles table
  session: Session | null;     // Current session with JWT
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
2. Backend creates user record
3. Backend creates `profiles` row
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
2. Backend API invoked
3. CASCADE deletes related data (events, posts, tickets, messages)
4. Profile record deleted
5. User record deleted
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

## Backend Auth

### JWT Verification

Backend verifies JWT on all protected routes:

```typescript
// Backend middleware
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const user = jwt.verify(token, JWT_SECRET);
if (!user) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Service Role Key

Backend uses service role key for elevated database access:

```typescript
// Backend database connection
const knex = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL, // Direct connection
});
```

## Auth Security

| Measure | Status | Notes |
|---------|--------|-------|
| JWT tokens | Implemented | Short-lived access tokens |
| Token refresh | Automatic | Via frontend |
| Backend middleware | Implemented | On all protected routes |
| Rate limiting | Recommended | On login/register endpoints |
| MFA | Not implemented | Recommended |
| Email verification | Backend default | Configurable |

## Common Auth Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Token expired | Access token lifetime | Auto-refresh should handle |
| Session lost | localStorage cleared | Re-authenticate |
| OAuth redirect fails | Incorrect redirect URL | Check backend OAuth settings |
| Profile not loading | Backend error | Check backend logs |
