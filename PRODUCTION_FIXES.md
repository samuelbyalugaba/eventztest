# Production Fixes - Phase List

## Phase 1: Critical (P0 - Must Fix Before Ship)

### 1.1 Error Handling Overhaul
**Files:** All components using try/catch

- [ ] Add toast notifications to ALL catch blocks
- [ ] Create `useAsyncError` hook for consistent error handling
- [ ] Add `ErrorBoundary` to each major page (Feed, EventDetails, Profile, LiveFeed)
- [ ] Create `ApiErrorAlert` reusable component

**Locations to fix:**
```
src/hooks/useFeedData.ts:50,70,92,113
src/hooks/useProfileData.ts:289
src/hooks/useFeedConversationState.ts:33
src/components/Feed.tsx:351,358,364,383,389,399,404,415,421,426,431
src/components/EventDetails.tsx:302,316,319,331
src/components/Profile.tsx:123,125,138,153,201
```

### 1.2 Security Hardening
**Files:** `src/utils/supabase/api.ts`, `src/utils/paymentLimits.ts`

- [ ] Move ALL price validation to server-side (never trust client)
- [ ] Remove hardcoded console.log from webhooks
- [ ] Add request signing for critical transactions
- [ ] Validate all input with zod in API layer

**Files:**
```
supabase/functions/snippe-webhook/index.ts:18,32,49,67,71,75
supabase/functions/snippe-payment/index.ts:91,95,110,116,118,121,129,142,179,183,195,200,205,210
```

---

## Phase 2: High Priority (P1 - Fix Before Scale)

### 2.1 Memory Leaks
**Files:** `src/App.tsx`, `src/hooks/*.ts`

- [ ] Add unsubscription cleanup to all realtime subscriptions
- [ ] Clear setInterval on unmount (App.tsx:228)
- [ ] Add cleanup to useLiveFeedData subscriptions

**Fix:**
```typescript
// App.tsx line 228
const interval = setInterval(checkLiveEvents, 60000);
// Change to:
useEffect(() => {
  const interval = setInterval(checkLiveEvents, 60000);
  return () => clearInterval(interval);
}, []);
```

### 2.2 Request Throttling
**Files:** `src/components/Feed.tsx`, `src/components/EventDetails.tsx`

- [ ] Add debounce to infinite scroll (500ms)
- [ ] Add request coalescing for rapid actions
- [ ] Implement request queue for offline

### 2.3 Optimistic Updates Rollback
**Files:** `src/components/Feed.tsx`, `src/App.tsx`

- [ ] Follow toggle: Add rollback on failure
- [ ] Post delete: Add rollback on failure
- [ ] Post save: Add rollback on failure

---

## Phase 3: Medium Priority (P2 - Before GA)

### 3.1 Performance Optimization
**Files:** `src/components/Feed.tsx`, `src/components/EventDetails.tsx`

- [ ] Add virtualization for long lists (react-window)
- [ ] Implement image lazy loading
- [ ] Add skeleton Suspense boundaries
- [ ] Prefetch critical routes only

### 3.2 Offline Support
**Files:** `src/App.tsx`, `service-worker`

- [ ] Add offline action queue
- [ ] Implement background sync
- [ ] Add offline indicator UI
- [ ] Cache critical API responses

### 3.3 Accessibility
**Files:** All modals, toasts, forms

- [ ] Add ARIA live regions
- [ ] Focus trap in all modals
- [ ] Keyboard navigation for menus
- [ ] Color contrast audit

---

## Phase 4: Nice to Have (P3 - Future)

### 4.1 Monitoring
- [ ] Install and configure Sentry
- [ ] Add performance marks
- [ ] Create error tracking dashboard
- [ ] Add health check endpoint

### 4.2 Testing
- [ ] Add Vitest configuration
- [ ] Write unit tests for hooks
- [ ] Write e2e tests for auth flow
- [ ] Add CI pipeline

### 4.3 SEO
- [ ] Add SSR/SSG with React Server Components
- [ ] Add Open Graph images
- [ ] Add JSON-LD structured data
- [ ] Add sitemap generation

---

## Quick Wins (Can Fix Now)

### Inline fixes:

```typescript
// 1. Fix empty catch blocks - src/hooks/useFeedData.ts:92
catch (error) { 
  console.error('Error loading more posts:', error);
  // Add:
  toast.error('Failed to load more posts');
  setHasMore(false);
}

// 2. Fix setInterval cleanup - src/App.tsx:228
useEffect(() => {
  const interval = setInterval(checkLiveEvents, 60000);
  return () => clearInterval(interval);
}, []);

// 3. Fix optimistic rollback - src/components/Feed.tsx:383
} catch (error) { 
  console.error('Error deleting post:', error);
  toast.error('Failed to delete post');
  setPosts(previousPosts); // rollback
}

// 4. Add debounce - src/components/Feed.tsx
import { useDeferredValue } from 'react';
const deferredQuery = useDeferredValue(query);
// Or use lodash.debounce

// 5. Add ErrorBoundary wrapper - src/App.tsx
import { ErrorBoundary } from './components/ErrorBoundary';
// Wrap each tab view with ErrorBoundary
```

---

## File-by-File Fixes

### HIGH PRIORITY FILES:
| File | Issues | Priority |
|------|--------|----------|
| src/hooks/useFeedData.ts | No error toast, no fallback | P0 |
| src/hooks/useProfileData.ts | Silent catch | P0 |
| src/components/Feed.tsx | Multiple empty catches | P0 |
| src/App.tsx | setInterval leak | P1 |
| src/components/EventDetails.tsx | Silent catch | P1 |
| src/components/Profile.tsx | Silent catch | P1 |
| supabase/functions/snippe-webhook/index.ts | console.log | P0 |
| supabase/functions/snippe-payment/index.ts | console.log | P0 |

### MEDIUM PRIORITY FILES:
| File | Issues | Priority |
|------|--------|----------|
| src/components/CreateEvent.tsx | Needs review | P2 |
| src/components/livestream/*.tsx | Needs review | P2 |
| src/components/ChatDetail.tsx | Needs review | P2 |
| src/utils/supabase/api.ts | No validation | P2 |

---

## Checklist Status

- [ ] Phase 1 (P0) complete
- [ ] Phase 2 (P1) complete
- [ ] Phase 3 (P2) complete
- [ ] Phase 4 (P3) complete

## Estimated Effort

| Phase | Files | Hours |
|-------|-------|-------|
| Phase 1 | 15 | 8h |
| Phase 2 | 8 | 6h |
| Phase 3 | 12 | 12h |
| Phase 4 | 8 | 16h |
| **Total** | **43** | **42h** |