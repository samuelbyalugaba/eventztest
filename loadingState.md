# Loading, Navigation & Perceived-Performance Audit — Eventz

> Principal-level engineering review of the app's loading experience, navigation, transitions and feedback system. All findings cite real files/lines.

Severity legend: **P0** blocks perceived quality on every session · **P1** hurts polish, users notice · **P2** worth fixing before scaling · **P3** nice-to-have.

---

## PART 1 — Application Flow

**Files:** `src/main.tsx`, `src/App.tsx`, `src/components/app/AppRoutes.tsx`, `src/components/app/KeepAliveTabs.tsx`, `src/contexts/AuthContext.tsx`

### What actually happens on cold open
1. `index.html` loads Inter from Google Fonts via `media="print" onload=…` swap (`index.html:31`) — good, non-blocking.
2. `main.tsx` mounts a single tree: `Sentry.ErrorBoundary → QueryClientProvider → AuthProvider → BrowserRouter → MessagingProvider → App`.
3. `AuthProvider` calls `supabase.auth.getSession()` (`AuthContext.tsx:123`); while it resolves, `App.tsx:201` short-circuits to `<LoadingScreen>` — now a full **app-shell skeleton** matching the Events tab layout.
4. Once auth resolves, `App` renders `KeepAliveTabs` + `AppRoutes` (mostly `React.lazy`) inside per-route `<Suspense>`, then the active route's Suspense fallback runs (usually a skeleton).

### Findings
| # | Severity | Finding |
|---|---|---|
| 1.1 | ~~P0~~ ✅ | Cold start now shows an **app-shell skeleton** (`LoadingScreen.tsx`) — Events tab layout + bottom nav + safe-area strip. Includes a 10s auth timeout with retry CTA. No spinner on cold load. |
| 1.2 | **P1** | `KeepAliveTabs` intentionally mounts each of Events/Feed/Live/Profile only once (`App.tsx:167-170`) and toggles visibility with `display:none`. Great for return navigation, but the *first* visit to each tab still waits on its own data fetch + skeleton — there is no cross-tab prefetch except the feed page-1 prefetch scheduled via idle callback (`App.tsx:57-73`). Feed prefetch fires within ~500ms (was 5000ms), but Events, Live, and Profile tabs have no parallel prefetch. |
| 1.3 | **P1** | Route-tree design is sound (single `<Routes>` with `backgroundLocation` overlay for modals), but **transitions are instant/abrupt** — no `AnimatePresence`, no fade, no shared-element hint. On a mobile PWA this reads as "hard cut". |
| 1.4 | **P2** | Navigation predictability: `handleStartOrganizerSetup`, `handleCreateEvent`, `handleEditEvent` all `navigate('/create')` (`App.tsx:99-101`) with no loading indicator — user taps FAB, screen freezes briefly while `CreateEventWrapper` chunk downloads (see 2.2). |
| 1.5 | **P2** | Modal flow reuses `PostDetailWrapper`/`EventDetailWrapper`/`ProfileModalWrapper` twice in `AppRoutes.tsx` (once as page, once as background overlay). The wrapper is lazy — clicking a post opens Suspense fallback (`DetailPageSkeleton`) **on top of the still-visible feed** until chunk arrives. Prefetch on hover/press-in would kill this. |

---

## PART 2 — Route Loading

**Files:** `src/components/app/AppRoutes.tsx`

### What's already good
- Every non-trivial page is `React.lazy` (`AppRoutes.tsx:15-31`) — 17 lazy components.
- Every lazy route is wrapped in `<Suspense>` with a real skeleton (`ProfilePageSkeleton`, `DashboardPageSkeleton`, `MessagesPageSkeleton`, `ListPageSkeleton`, `GenericPageSkeleton`, `CreatePageSkeleton`, `LivePageSkeleton`, `DetailPageSkeleton`, `FeedPageSkeleton`).
- `ListPageSkeleton` layout-matches `ProfileListPage` (header + tabs + search + user cards) — no visual flash on navigation.
- `RouteErrorBoundary` wraps all important routes including `/dashboard`, `/wallet`, `/live/:id`, `/create`, `/compose/post`, `/search`, `/messages`.
- Vite `manualChunks` splits `react-core`, `radix`, `supabase`, `charts`, `icons`, `agora`, `hls` (`vite.config.ts:23-33`). Good.

### Findings
| # | Severity | Finding |
|---|---|---|
| 2.1 | ~~P1~~ ✅ | `/search` now uses `GenericPageSkeleton`, `/compose/post` now uses `CreatePageSkeleton`. Both are proper skeletons, not spinners. |
| 2.2 | **P1** | No `<link rel="modulepreload">` hints and no route-level prefetching triggered by hover/focus. The idle-time warm-up in `App.tsx:76-86` fires 1500ms after auth for 8 components, but `SearchPage`, `LiveStreamPage`, `LegalPage`, `SupportPage`, `TicketScannerModal`, `AuthCallbackPage` aren't warmed. |
| 2.3 | ~~P1~~ ✅ | 404 fallback (`AppRoutes.tsx:187-193`) now uses semantic tokens: `text-primary`, `bg-primary`, `text-primary-foreground`. |
| 2.4 | ~~P2~~ ✅ | `LegalPage`, `SupportPage`, `DeleteAccountPage`, `AuthCallbackPage`, `HostedPage` are now all lazy-loaded (`AppRoutes.tsx:28-31`). |
| 2.5 | **P2** | Dashboard has 5 routes (`/dashboard`, `/dashboard/events`, `/dashboard/live`, `/dashboard/notify`, `/dashboard/payouts`) all rendering the same `<DashboardPage>` behind separate `<Suspense>` boundaries (`AppRoutes.tsx:137-161`). This works but every intra-dashboard "tab" click triggers a full remount if chunk is not yet cached. |
| 2.6 | **P2** | `/live/:id` and `/messages/:conversationId` — both large real-time surfaces — have no data prefetch on route change; they wait for component mount, then `useEffect`, then network. Classic waterfall. |

---

## PART 3 — Initial App Load

**Files:** `index.html`, `src/main.tsx`, `src/contexts/AuthContext.tsx`, `src/contexts/MessagingContext.tsx`

### What blocks first paint
1. **Google Fonts CSS** — already async via `media="print" onload=…` swap ✅.
2. **Sentry init** — `main.tsx:17-21`, `enabled: import.meta.env.PROD`. Import cost still paid but cheap.
3. **`AuthProvider` render gate** — `App.tsx:201` returns `<LoadingScreen>` (app-shell skeleton) until `isCheckingAuth` is false. Auth is fast with a session cookie (~200ms) but slower on first visit/cold PWA.
4. **`MessagingProvider`** wraps the tree above `App` — if it fetches conversations eagerly, that request is a hidden waterfall behind auth.
5. **`ensureProfile` + `prefetchUserStats`** fire inside `startProfileBootstrap` (`AuthContext.tsx:107-110`) — not awaited, good. But `prefetchUserStats` is 4 parallel network calls kicked off on every load.

### Findings
| # | Severity | Finding |
|---|---|---|
| 3.1 | **P0** | The whole app is **blocked on auth** to render anything. There is no "static shell first, auth-required areas hydrate second" split. Products like Notion render the sidebar shell instantly and just gray the auth-gated content. |
| 3.2 | **P1** | No `<link rel="preload" as="image" fetchpriority="high">` for the Events tab's hero/LCP image. Feed video posters also aren't preloaded. |
| 3.3 | ~~P1~~ ✅ | Fonts trimmed to weights **400, 600, 700** (`index.html:30-31`). Down from 6 weights. |
| 3.4 | **P2** | `Sentry.init` runs in dev too (`main.tsx:17`) but is `enabled: import.meta.env.PROD` — fine, but the import cost is still paid. Could lazy-init after mount. |
| 3.5 | ~~P2~~ ✅ | `registerServiceWorker()` now deferred to `requestIdleCallback` after paint (`main.tsx:24-37`). Native runtime init also deferred. |
| 3.6 | **P3** | The `bg-primary` safe-area strip (`App.tsx:212`) is only rendered *after* auth resolves. Rendering it inside `index.html` as a static bar would give an instant colored top bar before React boots — a la Twitter/Instagram. |

---

## PART 4 — Skeleton System

**File:** `src/components/skeletons/PageSkeletons.tsx` (539 lines)

### What's good
- One centralized library. Exports `PostSkeleton`, `EventCardSkeleton`, `EventGridSkeleton`, `EventCardsSkeleton`, `ListPageSkeleton`, `DetailPageSkeleton`, `DashboardPageSkeleton`, `MessagesPageSkeleton`, `ProfilePageSkeleton`, `LivePageSkeleton`, `CreatePageSkeleton`, `FeedPageSkeleton`, `GenericPageSkeleton`.
- Uses primitives (`Skeleton.Line`, `Skeleton.Circle`, `Skeleton.Image`) → consistent shimmer.
- Fallbacks match layouts (post skeleton matches PostCard, event grid matches Events tab grid).
- `ListPageSkeleton` now matches `ProfileListPage` layout (header, tabs, search bar, user cards) — seamless Suspense → component transition.

### Findings
| # | Severity | Finding |
|---|---|---|
| 4.1 | ~~P1~~ ✅ | `/search` and `/compose/post` now use proper skeletons from the library. |
| 4.2 | ~~P1~~ ✅ | **`LoadingScreen` (cold start)** is now a full app-shell skeleton (`LoadingScreen.tsx`) — Events tab layout, bottom nav, safe-area strip. No spinner. Includes 10s timeout with retry CTA. |
| 4.3 | ~~P1~~ ✅ | **`DashboardLoading`** (`dashboard/shared.tsx:488-514`) is now a full skeleton — header gradient, wallet card placeholder, metric grid. Not a spinner. |
| 4.4 | **P1** | `ProfileError.tsx:1-16` uses a red exclamation ball + centered layout — this is an *error* state, not a loading state. Fine as error, but no separate "profile loading" skeleton path exists in that component tree. |
| 4.5 | **P2** | Skeletons render at the router-suspense layer, but individual data-driven sections inside a mounted page (e.g. stats badge, followers count, wallet balance in `DashboardPage`) render `0` / `-` first and *then* the real number. `DashboardPage.tsx:40` initializes `stats` from `{ ...defaultStats, ...cachedStats }` and `:49` `walletBalance` from `cachedWalletBalance ?? 0`; new users with no cache see `0` before real values. |
| 4.6 | **P2** | No skeleton for empty conversation list, empty ticket list, empty wallet history — components jump straight to empty state without a placeholder frame. |
| 4.7 | **P3** | No consistent shimmer speed / direction across `Skeleton.Line` vs `Skeleton.Image` — verify visually. |

---

## PART 5 — Spinners

Search results — every remaining spinner in the app:

| Location | File:line | Verdict |
|---|---|---|
| Global cold-start | `LoadingScreen.tsx` | ✅ Now app-shell skeleton |
| `/search` Suspense fallback | `AppRoutes.tsx:122` | ✅ Now `GenericPageSkeleton` |
| `/compose/post` Suspense fallback | `AppRoutes.tsx:169` | ✅ Now `CreatePageSkeleton` |
| `DashboardLoading` | `dashboard/shared.tsx:488` | ✅ Now full skeleton |
| `DashboardModalFallback` | `dashboard/shared.tsx:516` used at `DashboardPage.tsx:271` | Acceptable — scanner modal is a small overlay (P3) |
| `ProfileError` red badge | `profile/ProfileError.tsx` | Fine as error (P3) |

**Rule to enforce project-wide:** spinners only for < 400ms button-scoped operations. Never for page/route/section loads.

---

## PART 6 — Data Fetching

**Files:** `src/queryClient.ts`, `src/utils/statsPrefetch.ts`, `src/App.tsx:55-73`, `src/hooks/useFeedData.ts`, `src/hooks/useEventsData.ts`, `src/hooks/useLiveFeedData.ts`

### Configuration
- `queryClient.ts` — `staleTime: 60_000`, `gcTime: 10 min`, `refetchOnWindowFocus: false`, `retry: 2` with exponential backoff. Mutations `retry: 0`. Good defaults.
- Feed prefetch in `App.tsx:55-73` — `prefetchInfiniteQuery` scheduled through `requestIdleCallback` with **500ms timeout**. Much faster than previous 5000ms.
- Component prefetch (`App.tsx:76-86`) — dynamic-import warm-up scheduled 1500ms after auth.

### Findings
| # | Severity | Finding |
|---|---|---|
| 6.1 | **P0** | **Waterfall: auth → profile → stats → dashboard cache → per-page fetch.** `AuthContext.tsx:135` calls `startProfileBootstrap`, which awaits nothing. Then `DashboardPage.tsx:83-85` calls `supabase.auth.getUser()` **again** (already loaded), then `supabase.from('profiles').select('*')` **again** (already loaded), then `runPrefetch` (again). Multiple duplicate round-trips per navigation into Dashboard. |
| 6.2 | **P0** | `DashboardPage.tsx:83-94` re-fetches profile even when `cachedProfile` exists. Should short-circuit if cache is fresh. Same for `runPrefetch` — it runs on every mount + every 30s poll + every realtime event + every visibility change. That's a lot of redundant work. |
| 6.3 | ~~P1~~ ✅ | Feed prefetch now fires within ~500ms via `scheduleIdle(..., 500)` (`App.tsx:70`). Much faster than previous 5000ms. |
| 6.4 | **P1** | No request cancellation on route change. TanStack Query handles this automatically for its own hooks, but the raw `supabase.from(...)` calls inside effects (Dashboard, several hooks) don't respect unmount → potential setState-after-unmount and wasted bandwidth. Dashboard's `alive` flag pattern is applied, but not consistently. |
| 6.5 | **P1** | Realtime subscriptions in `DashboardPage.tsx:102-112` fire a **full `runPrefetch`** on every ticket/transaction change → 4 parallel network requests per change event. Should refetch only the affected query. No debounce applied. |
| 6.6 | ~~P2~~ ✅ | `useProfileData.ts:73` now uses `placeholderData` from cached profile store — stale-while-revalidate on navigation. |
| 6.7 | ~~P2~~ ✅ | Retry policy is now `retry: 2` with exponential backoff (`queryClient.ts:10-11`). Mutations `retry: 0`. |
| 6.8 | **P2** | No `queryClient.prefetchQuery` on hover for lists → clicking an event card waits for the modal chunk *and* the network. |
| 6.9 | **P3** | `ReactQueryDevtools` only in dev — good. |

---

## PART 7 — Click Interactions

**Files reviewed:** `PostCardActions.tsx`, `ProfileActions.tsx`, `ChatInput.tsx`, `TicketCheckout.tsx`, `WalletDepositForm.tsx`, `SubmitButton.tsx`

### Findings
| # | Severity | Finding |
|---|---|---|
| 7.1 | **P1** | Many buttons don't visibly disable during in-flight actions. e.g., need to verify `TicketCheckout` and `WalletDepositForm` disable submit + swap label. |
| 7.2 | **P1** | FAB → `/create` (`App.tsx:99`) has no immediate feedback while the `CreateEventWrapper` chunk downloads. Users may double-tap. Should show `CreatePageSkeleton` (already exists) *plus* a haptic + press-scale animation. |
| 7.3 | **P2** | Optimistic UI absent for likes/follows/comments — the app already has `useProfileStore` cache; would be a good place to layer optimistic updates via TanStack Query `onMutate`. |
| 7.4 | **P2** | Bottom-nav taps switch tabs instantly (keep-alive) — good. But **first-visit** of each tab still shows a skeleton because data isn't prefetched. See 1.2. |

---

## PART 8 — Form Submissions

**Files:** `hooks/useAuthSubmit.ts`, `hooks/useEventForm.ts`, `hooks/usePostCreation.ts`, `components/tickets/TicketCheckout.tsx`, `components/wallet/WalletDepositForm.tsx`

### Findings
| # | Severity | Finding |
|---|---|---|
| 8.1 | **P1** | No consistent form submission pattern. Verify each form: disables submit → shows spinner in-button → shows success toast → resets state. Some do (auth), others need audit. |
| 8.2 | **P1** | Toast system (Sonner) is well configured (`App.tsx:213-241`), duration 2500ms, custom styling. Good. But no *inline* success indicators on forms — users only get the top-center toast. |
| 8.3 | **P2** | No duplicate-submission guard by request-id — relies on button disable, which is bypassable by keyboard/enter spam. |
| 8.4 | **P2** | Validation runs on submit only in most forms — no debounced live validation. |

---

## PART 9 — Page Transitions

**Files:** `src/App.tsx`, `src/components/app/KeepAliveTabs.tsx`, `src/components/app/AppRoutes.tsx`

### Findings
| # | Severity | Finding |
|---|---|---|
| 9.1 | **P1** | **No page transitions at all.** No `AnimatePresence`, no CSS transitions on route change. Every navigation is a hard cut → screen goes blank → skeleton flashes → content appears. Modern apps use 150–200ms cross-fade or slide-in. |
| 9.2 | **P1** | Modal opens (post/event/profile modal via `backgroundLocation`) have no enter animation despite Framer Motion being available. |
| 9.3 | **P2** | Scroll restoration: manual `scrollTo(0,0)` in `App.tsx:188-198` on tab switch. Doesn't preserve scroll on Back navigation properly — needs `ScrollRestoration` or a scroll-position map keyed by history state. |
| 9.4 | **P2** | Layout shifts occur when profile stats hydrate from cache: cached-hit shows numbers instantly, cache-miss shows `-` then jumps to number. Fix width with `min-w` on stat pills. |

---

## PART 10 — Layout Shift (CLS)

| # | Severity | Finding |
|---|---|---|
| 10.1 | **P1** | `<img>` tags in `EventCard`, `PostCard`, `UserAvatar` — verify explicit `width`/`height` or aspect-ratio wrappers to prevent CLS. `Skeleton.Image` uses `aspect-*` correctly; real images should mirror. |
| 10.2 | **P1** | Web-font swap using `&display=swap` (`index.html:31`) will cause **FOUT** (Inter → Inter). Preload one weight (400) as `<link rel="preload" as="font" crossorigin>` to minimize the swap flash. |
| 10.3 | **P2** | Stat badges hydrate from `0`/`-` then real number → horizontal layout shift. Reserve a min-width via `tabular-nums` + `min-w-[2ch]`. |
| 10.4 | **P2** | Suspense boundaries swap skeleton → real content — dimensions must match. Verify `ProfilePageSkeleton` matches actual profile header height (avatar 96px, name row, bio row, stats row). |

---

## PART 11 — Progressive Rendering

Currently the app is largely **all-or-nothing per page**: Suspense fallback → full page.

### Findings
| # | Severity | Finding |
|---|---|---|
| 11.1 | **P1** | Split each page into progressive sections with its own Suspense: header (instant) → filters (fast) → grid (skeleton) → secondary (deferred). E.g. Events tab could render header + filter chips immediately, keep the card grid in its own Suspense. |
| 11.2 | **P1** | `DashboardPage.tsx:233` renders **whole page or `DashboardLoading`**. Should render header + scope selector immediately (all cached), then let each KPI card hydrate independently. |
| 11.3 | **P2** | `Profile` renders header only after profile query resolves. Split: avatar + name (from `useAuth` cache) → bio → stats → tabs. |

---

## PART 12 — Background Operations

**Files:** `src/components/DashboardPage.tsx:66-133`, `src/contexts/MessagingContext.tsx`, `src/utils/supabase/api/follows.ts` (subscribeToOnlineUsers)

### Findings
| # | Severity | Finding |
|---|---|---|
| 12.1 | **P0** | Dashboard poll interval `30_000` **plus** two realtime channels **plus** visibility handler **plus** on-mount fetch = wasteful. On a busy account this hits Supabase constantly. Poll should be disabled while realtime is active (they're duplicates). |
| 12.2 | **P1** | Realtime handlers call full `runPrefetch` on any change (`DashboardPage.tsx:105, 111`) — no debounce. Bursty events cause request storms. Add trailing-edge debounce (500ms) and refetch only the changed dataset. |
| 12.3 | **P2** | Global `refetchOnWindowFocus: false` (`queryClient.ts:8`) means users returning to the tab after 10 minutes see stale data. Consider enabling per-query for time-sensitive data (feed, live streams, wallet). |
| 12.4 | **P2** | No visible sync/refresh indicator when background refetch is running — users can't tell if data is fresh. |

---

## PART 13 — Empty States

`EmptyState.tsx` component exists (`src/components/ui/EmptyState.tsx`) and is used across:
- `ChatList.tsx` — empty conversations ✅
- `ChatEmptyState.tsx` — dedicated chat empty ✅
- `CommentsSheet.tsx` — no comments ✅
- `SearchResults.tsx` — no search results ✅
- `WalletHistoryList.tsx` — no transactions ✅
- `EventsScreen.tsx` — no events ✅
- `ProfileContent.tsx` — empty tabs ✅
- `NotificationsPanel.tsx` — no notifications ✅
- `LiveFeed.tsx` — no live events ✅
- `FeedContent.tsx` — empty feed ✅
- `PostDetailComments.tsx` — no comments ✅
- `EventListSection.tsx` — empty event list ✅

### Findings
| # | Severity | Finding |
|---|---|---|
| 13.1 | ~~P1~~ ✅ | `EmptyState` component exists with icon, title, description, and optional CTA button. Used consistently across list surfaces. |
| 13.2 | **P2** | Some `EmptyState` calls are minimal (title only, no icon or CTA). Consider adding action CTAs where applicable — e.g., "No events yet — create your first" with primary button. |

---

## PART 14 — Error States

**Files:** `src/components/RouteErrorBoundary.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/profile/ProfileError.tsx`, Sentry boundary in `main.tsx:72-90`

### Findings
| # | Severity | Finding |
|---|---|---|
| 14.1 | ~~P1~~ ✅ | Sentry top-level fallback (`main.tsx:73-78`) now uses semantic tokens: `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`. Branded, consistent. |
| 14.2 | ~~P1~~ ✅ | `RouteErrorBoundary` now wraps all important routes: `/dashboard`, `/wallet`, `/live/:id`, `/create`, `/compose/post`, `/search`, `/messages`, `/profile/:id`, `/post/:id`, `/event/:id`. |
| 14.3 | **P1** | No offline detection UI. `useNetworkStatus.ts` exists and is consumed by `PostCard` for video preloading decisions — but no `OfflineBanner` is shown to the user when offline. |
| 14.4 | **P1** | API failures — most `try/catch` blocks `console.warn` and swallow. Need consistent toast + retry pattern. |
| 14.5 | ~~P2~~ ✅ | 404 page (`AppRoutes.tsx:187-193`) now uses semantic tokens: `text-primary`, `bg-primary`, `text-primary-foreground`. |
| 14.6 | **P2** | No 500-class distinguishing UI — everything is either "loading" or "not found". |

---

## PART 15 — Loading Consistency

Two loading languages coexist:
1. **Skeleton system** (`PageSkeletons.tsx`) — used at route Suspense level. Now covers all routes with layout-matched fallbacks.
2. **Spinners** — only `DashboardModalFallback` (acceptable for small overlay) and in-form indicators.

No unified `<LoadingState size="page|section|inline|button">` primitive to enforce the rule "skeletons for structure, spinners only inside buttons".

**Severity: P1** — introduce a single `LoadingBoundary` wrapper that picks skeleton/spinner based on prop.

---

## PART 16 — Perceived Performance

Reference bar: Linear/Stripe/Notion/Vercel all target *sub-100ms visual response* on every interaction and *zero spinners* on route change.

| Aspect | Eventz today | Target |
|---|---|---|
| Cold start visual | App-shell skeleton → content ✅ | App-shell skeleton → content |
| Tab switch (warm) | Instant (keep-alive) ✅ | Instant ✅ |
| Tab switch (cold) | Skeleton → content | Skeleton → content (prefetched ~ instant) |
| Route to detail modal | Skeleton flash + fetch | Prefetch on hover → open with cached data |
| Form submit | Toast on success, sometimes no button-state | In-button spinner + inline success + toast |
| Error | Branded error boundary with retry ✅ | Branded error with retry CTA |
| Empty | Unified EmptyState component ✅ | Illustrated empty + CTA |
| Background refresh | Silent, no indicator | Small "syncing" indicator |

**Perceived-performance score today: ~7.0/10.** With the remaining fixes it can reach 8.5+.

---

## PART 17 — React + Vite Best Practices Checklist

| Practice | Status |
|---|---|
| Route-based code splitting | ✅ (`AppRoutes.tsx`) |
| React.lazy | ✅ 17 lazy components |
| Suspense boundaries | ✅ all lazy routes with matching skeletons |
| Dynamic imports | ✅ + idle warm-up (`App.tsx:76-86`) |
| Route prefetching (on hover/focus) | ❌ **Missing** |
| TanStack Query loading states | ✅ but inconsistent |
| Optimistic updates | ❌ **Missing** |
| Background fetching | ⚠️ over-eager (Dashboard) |
| Query caching | ✅ (60s staleTime) |
| Placeholder data / `keepPreviousData` | ✅ in `useProfileData` |
| Stale-while-revalidate | ✅ default TSQ |
| Request deduplication | ✅ via TSQ, ❌ for raw supabase calls |
| Image lazy loading | ⚠️ verify per component |
| Font optimization | ✅ swap enabled, 3 weights |
| Asset preloading (LCP image) | ❌ **Missing** |
| Manual chunk splitting | ✅ (`vite.config.ts`) |
| Efficient re-rendering | ⚠️ needs audit (Zustand selectors mostly OK) |
| Proper key usage | ⚠️ verify list components |
| Memoization | ⚠️ needs profiler pass |
| Route transitions | ❌ **Missing** |
| Scroll restoration | ⚠️ partial (manual) |
| ErrorBoundary coverage | ✅ all important routes |

---

## PART 18 — Performance Bottlenecks (ranked)

| Rank | Severity | Bottleneck | Location |
|---|---|---|---|
| 1 | **P0** | Dashboard duplicate fetches on every mount (profile, user, stats) | `DashboardPage.tsx:83-94` |
| 2 | **P0** | Realtime + 30s poll + on-mount fetch on Dashboard all overlap | `DashboardPage.tsx:96-112` |
| 3 | **P1** | No route/data prefetch on hover — clicks feel laggy | Everywhere |
| 4 | **P1** | Zero page/modal transitions | `AppRoutes.tsx` |
| 5 | **P1** | No `<link rel="preload" as="image">` for LCP images | `index.html` |
| 6 | **P1** | Dashboard whole-page-or-loading (no progressive render) | `DashboardPage.tsx:233` |
| 7 | **P2** | Layout shift on hydrating stats (`0` → real) | `DashboardPage.tsx:40,49` |
| 8 | **P2** | No optimistic UI for likes/follows/comments | Feed & Profile hooks |
| 9 | **P2** | No offline / slow-network UI banner | `useNetworkStatus.ts` |
| 10 | **P2** | No visible sync/refresh indicator | Dashboard, Feed |

---

## PART 19 — Ideal Loading Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  1. Static shell (index.html) → primary-color top bar,      │
│     bottom-nav placeholder rendered before React boots       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. React mounts → AppShellSkeleton (nav + tab skeleton)    │
│     No spinner. Immediately visible.                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Auth resolves in background → routes hydrate            │
│     Unauthenticated → replace with AuthScreen (no flash)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Route Suspense (skeleton matching page)                  │
│     + parallel data prefetch (query + module)                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Progressive render inside page:                          │
│     header (cached instant) → filters → grid → secondary    │
└─────────────────────────────────────────────────────────────┘
```

### Components to add
- **`<PrefetchLink to={...}>`** — wrapper around React Router `Link` that fires `queryClient.prefetchQuery` and `import(...)` on `pointerenter`/`focus`.
- **`<PageTransition>`** — Framer Motion `AnimatePresence` fade/slide, 180ms.
- **`<OfflineBanner>`** — driven by `useNetworkStatus`, fixed top.
- **`<LoadingBoundary variant="page|section|inline|button">`** — enforces skeleton vs spinner rules.

### Strategy summary
| Layer | Strategy |
|---|---|
| Global loading | App-shell skeleton, no spinner. Auth hydrates behind. ✅ |
| Route loading | Lazy + matching skeleton + prefetch on hover. |
| Data loading | TSQ with `staleTime` per surface, `keepPreviousData`, optimistic mutations. |
| Error | Route + section boundaries with branded fallback + retry. ✅ |
| Retry | Per-query `retry: 2` w/ backoff for GETs; `retry: 0` for mutations. ✅ |
| Offline | `useNetworkStatus` → banner + queued mutations via TSQ persister. |
| Optimistic UI | Likes, follows, comments, wallet balance updates. |

---

## PART 20 — Final Report

### Scores (1–10)
| Dimension | Before | Current |
|---|---|---|
| Overall Loading Experience | 6.0 | **7.5** |
| Navigation | 7.0 | **7.0** (keep-alive unchanged) |
| Responsiveness | 6.5 | **7.0** |
| Perceived Performance | 5.5 | **7.0** |
| Skeleton Quality | 7.5 | **9.0** (consistent adoption, layout-matched fallbacks) |
| Loading Consistency | 5.0 | **8.0** (spinners eliminated) |
| Async Architecture | 6.0 | **6.5** (Dashboard still chaotic) |
| UX Polish | 5.5 | **6.5** |
| Production Readiness | 6.5 | **7.5** |

### Answers
1. **What makes the app feel slow?** Dashboard duplicate fetches (P0), waterfall Auth→Profile→Stats, missing transitions, layout shifts on hydrating stats, chunk-download latency on FAB/detail click (no route prefetch).
2. **What feels unpolished?** Hard-cut route changes, inconsistent form-submit feedback, no page transitions, layout shifts, no offline indicator.
3. **Which interactions need immediate feedback?** FAB → `/create`, event card → detail modal, tab bar → cold tab, post like/follow, form submit buttons, dashboard refresh.
4. **Which pages need skeletons?** All now have proper skeletons ✅. Remaining: progressive rendering within pages (Dashboard, Profile).
5. **Which routes should be lazy loaded?** All routes now lazy ✅ (17 components).
6. **Which API calls should be prefetched?** Events grid page 1, live grid, profile of self, dashboard scope 'all', wallet balance. On hover: detail modals, chat conversations.
7. **Which loading indicators should be replaced?** All spinners replaced ✅. Only `DashboardModalFallback` remains (acceptable).
8. **How would I redesign the entire loading experience?** Ship the remaining architecture in PART 19: prefetch-on-hover navigation (`PrefetchLink`), per-section progressive Suspense, `PageTransition` wrapper (180ms fade), `OfflineBanner`, optimistic mutations for social actions. Deduplicate Dashboard fetches (cache-first, refetch only on cache-miss or realtime delta).

---

### Recommended roadmap (in this order)
1. **P0** — Dedupe Dashboard bootstrap (skip fetches when cache exists, debounce realtime, remove poll while realtime alive).
2. **P0** — Fix stat hydration flash across Dashboard, Wallet, Profile (reserve widths, hide until cached-or-fresh).
3. **P1** — Add `PrefetchLink` and wire nav items + card links.
4. **P1** — Add `PageTransition` (Framer Motion `AnimatePresence`, 180ms).
5. **P1** — Preload LCP image weight for font and hero image.
6. **P1** — Add `OfflineBanner` driven by `useNetworkStatus`.
7. **P1** — Add `LoadingBoundary` primitive to enforce skeleton-over-spinner rules.
8. **P2** — Optimistic updates for likes/follows/comments.
9. **P2** — Dashboard progressive rendering (header + scope selector instant, KPI cards hydrate independently).
10. **P2** — `refetchOnWindowFocus` per-query for time-sensitive data.
11. **P2** — Visible sync indicator for background refetches.
12. **P3** — Defer `Sentry.init` to idle; static `bg-primary` bar in `index.html`.

---

_End of audit._
