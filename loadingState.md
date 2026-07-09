# Loading, Navigation & Perceived-Performance Audit — Eventz

> Principal-level engineering review of the app's loading experience, navigation, transitions and feedback system. **No code changes made.** All findings cite real files/lines.

Severity legend: **P0** blocks perceived quality on every session · **P1** hurts polish, users notice · **P2** worth fixing before scaling · **P3** nice-to-have.

---

## PART 1 — Application Flow

**Files:** `src/main.tsx`, `src/App.tsx`, `src/components/app/AppRoutes.tsx`, `src/components/app/KeepAliveTabs.tsx`, `src/contexts/AuthContext.tsx`

### What actually happens on cold open
1. `index.html` loads Inter from Google Fonts via `media="print" onload=…` swap (`index.html:30`) — good, non-blocking.
2. `main.tsx` mounts a single tree: `Sentry.ErrorBoundary → QueryClientProvider → AuthProvider → BrowserRouter → MessagingProvider → App`.
3. `AuthProvider` calls `supabase.auth.getSession()` (`AuthContext.tsx:123`); while it resolves, `App.tsx:206` short-circuits to `<LoadingScreen>` — a **full-page centered spinner** with the text "Loading EVENTZ…".
4. Once auth resolves, `App` renders `KeepAliveTabs` + `AppRoutes` (mostly `React.lazy`) inside per-route `<Suspense>`, then the active route's Suspense fallback runs (usually a skeleton).

### Findings
| # | Severity | Finding |
|---|---|---|
| 1.1 | **P0** | Cold start = **spinner → skeleton → content** (three visual states). `LoadingScreen` (`components/app/LoadingScreen.tsx:22`) is a full-viewport spinner shown until `isCheckingAuth` flips. Linear/Vercel/Stripe never show a spinner on cold load — they render the shell (nav, sidebar, empty containers) immediately, then hydrate. Suggest replacing with a full **app-shell skeleton** (top bar bg-primary strip already exists at `App.tsx:214`, bottom nav, tab skeleton). |
| 1.2 | **P1** | `KeepAliveTabs` intentionally mounts each of Events/Feed/Live/Profile only once (`App.tsx:170-190`) and toggles visibility with `display:none`. Great for return navigation, but the *first* visit to each tab still waits on its own data fetch + skeleton — there is no cross-tab prefetch except the feed page-1 prefetch scheduled 5s after auth (`App.tsx:57`). Feed prefetch at 5000ms is far too late — most users hit `/feed` within 1s. |
| 1.3 | **P1** | Route-tree design is sound (single `<Routes>` with `backgroundLocation` overlay for modals), but **transitions are instant/abrupt** — no `AnimatePresence`, no fade, no shared-element hint. On a mobile PWA this reads as "hard cut". |
| 1.4 | **P2** | Navigation predictability: `handleStartOrganizerSetup`, `handleCreateEvent`, `handleEditEvent` all `navigate('/create')` (`App.tsx:96-98`) with no loading indicator — user taps FAB, screen freezes briefly while `CreateEventWrapper` chunk downloads (see 2.2). |
| 1.5 | **P2** | Modal flow reuses `PostDetailWrapper`/`EventDetailWrapper`/`ProfileModalWrapper` twice in `AppRoutes.tsx:100-110` and `:167-196` (once as page, once as background overlay). The wrapper is lazy — clicking a post opens Suspense fallback (`DetailPageSkeleton`) **on top of the still-visible feed** until chunk arrives. Prefetch on hover/press-in would kill this. |

---

## PART 2 — Route Loading

**Files:** `src/components/app/AppRoutes.tsx`

### What's already good
- Every non-trivial page is `React.lazy` (`AppRoutes.tsx:19-30`).
- Every lazy route is wrapped in `<Suspense>` with a real skeleton (`ProfilePageSkeleton`, `DashboardPageSkeleton`, `MessagesPageSkeleton`, `ListPageSkeleton`, etc.).
- `RouteErrorBoundary` wraps risky routes (`/profile/:id`, `/post/:id`, `/event/:id`, `/search`, `/messages`).
- Vite `manualChunks` splits `react-core`, `radix`, `supabase`, `charts`, `icons`, `agora`, `hls` (`vite.config.ts:23-33`). Good.

### Findings
| # | Severity | Finding |
|---|---|---|
| 2.1 | **P1** | `AppRoutes.tsx:115` (`/search`) and `:149` (`/compose/post`) fall back to a **raw spinner** instead of a skeleton — inconsistent with the rest of the app. |
| 2.2 | **P1** | No `<link rel="modulepreload">` hints and no route-level prefetching triggered by hover/focus. The idle-time warm-up in `App.tsx:76-86` only fires 1500ms after auth and only for a fixed list; `SearchPage`, `LiveStreamPage`, `LegalPage`, `SupportPage`, `TicketScannerModal`, `AuthCallbackPage` aren't warmed. |
| 2.3 | **P1** | 404 fallback (`AppRoutes.tsx:156-162`) uses hardcoded `text-purple-600 / bg-purple-600` — violates the design-system rule (semantic tokens only). Also no skeleton because it isn't lazy — fine, but it visually clashes. |
| 2.4 | **P2** | `LegalPage`, `SupportPage`, `DeleteAccountPage`, `AuthCallbackPage`, `HostedPage` are **eagerly imported** at the top of `AppRoutes.tsx:3-8`. They're rarely-visited; lazy-splitting them shrinks the entry chunk. |
| 2.5 | **P2** | Dashboard has 5 routes (`/dashboard`, `/dashboard/events`, `/dashboard/live`, `/dashboard/notify`, `/dashboard/payouts`) all rendering the same `<DashboardPage>` behind separate `<Suspense>` boundaries (`AppRoutes.tsx:130-144`). This works but every intra-dashboard "tab" click triggers a full remount if chunk is not yet cached. |
| 2.6 | **P2** | `/live/:id` and `/messages/:conversationId` — both large real-time surfaces — have no data prefetch on route change; they wait for component mount, then `useEffect`, then network. Classic waterfall. |

---

## PART 3 — Initial App Load

**Files:** `index.html`, `src/main.tsx`, `src/contexts/AuthContext.tsx`, `src/contexts/MessagingContext.tsx`

### What blocks first paint
1. **Google Fonts CSS** — already async via `media="print" onload=…` swap ✅.
2. **Sentry init** synchronous at `main.tsx:17` — cheap in dev, but still an import in the entry chunk.
3. **`AuthProvider` render gate** — `App.tsx:206` returns `<LoadingScreen>` until `isCheckingAuth` is false. `supabase.auth.getSession()` is fast when a token cookie exists but ~200–800ms on first visit / cold PWA. Nothing else on screen during that time.
4. **`MessagingProvider`** wraps the tree above `App` — if it fetches conversations eagerly, that request is a hidden waterfall behind auth.
5. **`ensureProfile` + `prefetchUserStats`** fire inside `startProfileBootstrap` (`AuthContext.tsx:107-110`) — not awaited, good. But `prefetchUserStats` is 4 parallel network calls kicked off on every load.

### Findings
| # | Severity | Finding |
|---|---|---|
| 3.1 | **P0** | The whole app is **blocked on auth** to render anything. There is no "static shell first, auth-required areas hydrate second" split. Products like Notion render the sidebar shell instantly and just gray the auth-gated content. |
| 3.2 | **P1** | No `<link rel="preload" as="image" fetchpriority="high">` for the Events tab's hero/LCP image. Feed video posters also aren't preloaded. |
| 3.3 | **P1** | Fonts: only Inter is loaded, but with weights **400, 500, 600, 700, 800, 900** (`index.html:30`) — that's up to 6 font files. Trim to `400;600;700` and use CSS `font-weight` for the rest → smaller network + faster fallback swap. |
| 3.4 | **P2** | `Sentry.init` runs in dev too (`main.tsx:17`) but is `enabled: import.meta.env.PROD` — fine, but the import cost is still paid. Could lazy-init after mount. |
| 3.5 | **P2** | `registerServiceWorker()` runs synchronously in the entry bundle (`main.tsx:25`). Defer to `requestIdleCallback` after paint. |
| 3.6 | **P3** | The `bg-primary` safe-area strip (`App.tsx:214`) is only rendered *after* auth resolves. Rendering it inside `index.html` as a static bar would give an instant colored top bar before React boots — a la Twitter/Instagram. |

---

## PART 4 — Skeleton System

**File:** `src/components/skeletons/PageSkeletons.tsx` (539 lines)

### What's good
- One centralized library. Exports `PostSkeleton`, `EventCardSkeleton`, `EventGridSkeleton`, `EventCardsSkeleton`, `ListPageSkeleton`, `DetailPageSkeleton`, `DashboardPageSkeleton`, `MessagesPageSkeleton`, `ProfilePageSkeleton`, `LivePageSkeleton`, `CreatePageSkeleton`.
- Uses primitives (`Skeleton.Line`, `Skeleton.Circle`, `Skeleton.Image`) → consistent shimmer.
- Fallbacks match layouts (post skeleton matches PostCard, event grid matches Events tab grid).

### Findings
| # | Severity | Finding |
|---|---|---|
| 4.1 | **P1** | Two routes use raw spinners instead of the skeleton library — `/search` (`AppRoutes.tsx:115`) and `/compose/post` (`AppRoutes.tsx:149`). Add `SearchPageSkeleton` and `ComposePostSkeleton`. |
| 4.2 | **P1** | **`LoadingScreen` (cold start) is a spinner**, not a skeleton. This is the *first* thing every user sees and it's the least-polished loading state in the app. Replace with app-shell skeleton (bottom nav + top bar + tab skeleton). |
| 4.3 | **P1** | **`DashboardLoading`** (rendered in `DashboardPage.tsx:213`) — verify it's a real skeleton, not a spinner. From the import path (`./dashboard/shared`) it's a small helper — likely a spinner. Should be `DashboardPageSkeleton` from the shared library. |
| 4.4 | **P1** | `ProfileError.tsx:1-15` uses a red exclamation ball + centered layout — this is an *error* state pretending to be a loading state on failed profile fetch. Fine as error, but no separate "profile loading" skeleton path exists in that component tree. |
| 4.5 | **P2** | Skeletons render at the router-suspense layer, but individual data-driven sections inside a mounted page (e.g. stats badge, followers count, wallet balance in `DashboardPage`) render `0` / `-` first and *then* the real number — the exact bug already seen and fixed in `useProfileStats`. Audit reveals the same pattern still exists in **Dashboard** (`DashboardPage.tsx:35` initializes `stats` from `{ ...defaultStats, ...cachedStats }` and `walletBalance` from `cachedWalletBalance ?? 0`; new users with no cache see `0` before real values). |
| 4.6 | **P2** | No skeleton for empty conversation list, empty ticket list, empty wallet history — components jump straight to empty state without a placeholder frame. |
| 4.7 | **P3** | No consistent shimmer speed / direction across `Skeleton.Line` vs `Skeleton.Image` — verify visually. |

---

## PART 5 — Spinners

Search results — every remaining spinner in the app:

| Location | File:line | Verdict |
|---|---|---|
| Global cold-start | `components/app/LoadingScreen.tsx:22` | **Replace with app-shell skeleton** (P0) |
| `/search` Suspense fallback | `components/app/AppRoutes.tsx:115` | **Replace with SearchPageSkeleton** (P1) |
| `/compose/post` Suspense fallback | `components/app/AppRoutes.tsx:149` | **Replace with skeleton** (P1) |
| `DashboardLoading` | `components/dashboard/shared.tsx` | Verify — likely a spinner (P1) |
| `DashboardModalFallback` | `components/dashboard/shared.tsx` used at `DashboardPage.tsx:255` | Acceptable — scanner modal is a small overlay (P3) |
| `ProfileError` red badge | `components/profile/ProfileError.tsx` | Fine as error (P3) |

**Rule to enforce project-wide:** spinners only for < 400ms button-scoped operations. Never for page/route/section loads.

---

## PART 6 — Data Fetching

**Files:** `src/queryClient.ts`, `src/utils/statsPrefetch.ts`, `src/App.tsx:56-71`, `src/hooks/useFeedData.ts`, `src/hooks/useEventsData.ts`, `src/hooks/useLiveFeedData.ts`

### Configuration
- `queryClient.ts` — `staleTime: 60_000`, `gcTime: 10 min`, `refetchOnWindowFocus: false`, `retry: 1`. Reasonable defaults.
- Feed prefetch in `App.tsx:57-70` — `prefetchInfiniteQuery` scheduled through `requestIdleCallback` with **5000ms timeout**.
- Component prefetch (`App.tsx:76-86`) — dynamic-import warm-up scheduled 1500ms after auth.

### Findings
| # | Severity | Finding |
|---|---|---|
| 6.1 | **P0** | **Waterfall: auth → profile → stats → dashboard cache → per-page fetch.** `AuthContext.tsx:135` calls `startProfileBootstrap`, which awaits nothing. Then `DashboardPage.tsx:76` calls `supabase.auth.getUser()` **again** (already loaded), then `supabase.from('profiles').select('*')` **again** (already loaded), then `runPrefetch` (again). Multiple duplicate round-trips per navigation into Dashboard. |
| 6.2 | **P0** | `DashboardPage.tsx:81-85` re-fetches profile even when `cachedProfile` exists. Should short-circuit if cache is fresh. Same for `runPrefetch` — it runs on every mount + every 30s poll + every realtime event + every visibility change. That's a lot of redundant work. |
| 6.3 | **P1** | Feed prefetch at 5s idle is too late (see 1.2). Should be triggered as soon as auth resolves (idle callback with 500ms max timeout) or on hover of the Feed nav item. |
| 6.4 | **P1** | No request cancellation on route change. TanStack Query handles this automatically for its own hooks, but the raw `supabase.from(...)` calls inside effects (Dashboard, several hooks) don't respect unmount → potential setState-after-unmount and wasted bandwidth. Dashboard's `alive` flag pattern is applied, but not consistently. |
| 6.5 | **P1** | Realtime subscriptions in `DashboardPage.tsx:96-108` fire a **full `runPrefetch`** on every ticket/transaction change → 4 parallel network requests per change event. Should refetch only the affected query. |
| 6.6 | **P2** | No `placeholderData` / `keepPreviousData` on paginated queries → pagination causes skeleton flash instead of stale-while-revalidate. |
| 6.7 | **P2** | Retry policy is `retry: 1` globally — for read queries on flaky mobile networks, exponential-backoff `retry: 3` with `retryDelay` is more forgiving. |
| 6.8 | **P2** | No `queryClient.prefetchQuery` on hover for lists → clicking an event card waits for the modal chunk *and* the network. |
| 6.9 | **P3** | `ReactQueryDevtools` only in dev — good. |

---

## PART 7 — Click Interactions

**Files reviewed:** `PostCardActions.tsx`, `ProfileActions.tsx`, `ChatInput.tsx`, `TicketCheckout.tsx`, `WalletDepositForm.tsx`, `SubmitButton.tsx`

### Findings
| # | Severity | Finding |
|---|---|---|
| 7.1 | **P1** | Focus rings were globally removed per user request. That's fine visually but **now there's no keyboard-focus feedback anywhere** — hurts accessibility and desktop UX. Consider a subtle scale/shadow on `:focus-visible` for keyboard users only. |
| 7.2 | **P1** | Many buttons don't visibly disable during in-flight actions. e.g., need to verify `TicketCheckout` and `WalletDepositForm` disable submit + swap label. |
| 7.3 | **P1** | FAB → `/create` (`App.tsx:96`) has no immediate feedback while the `CreateEventWrapper` chunk downloads. Users may double-tap. Should show `CreatePageSkeleton` (already exists) *plus* a haptic + press-scale animation. |
| 7.4 | **P2** | Optimistic UI absent for likes/follows/comments — the app already has `useProfileStore` cache; would be a good place to layer optimistic updates via TanStack Query `onMutate`. |
| 7.5 | **P2** | Bottom-nav taps switch tabs instantly (keep-alive) — good. But **first-visit** of each tab still shows a skeleton because data isn't prefetched. See 1.2. |

---

## PART 8 — Form Submissions

**Files:** `hooks/useAuthSubmit.ts`, `hooks/useEventForm.ts`, `hooks/usePostCreation.ts`, `components/tickets/TicketCheckout.tsx`, `components/wallet/WalletDepositForm.tsx`

### Findings
| # | Severity | Finding |
|---|---|---|
| 8.1 | **P1** | No consistent form submission pattern. Verify each form: disables submit → shows spinner in-button → shows success toast → resets state. Some do (auth), others need audit. |
| 8.2 | **P1** | Toast system (Sonner) is well configured (`App.tsx:225-247`), duration 2500ms, custom styling. Good. But no *inline* success indicators on forms — users only get the top-center toast. |
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
| 9.3 | **P2** | Scroll restoration: manual `scrollTo(0,0)` in `App.tsx:192-201` on tab switch. Doesn't preserve scroll on Back navigation properly — needs `ScrollRestoration` or a scroll-position map keyed by history state. |
| 9.4 | **P2** | Layout shifts occur when profile stats hydrate from cache: cached-hit shows numbers instantly, cache-miss shows `-` then jumps to number. Fix width with `min-w` on stat pills. |

---

## PART 10 — Layout Shift (CLS)

| # | Severity | Finding |
|---|---|---|
| 10.1 | **P1** | `<img>` tags in `EventCard`, `PostCard`, `UserAvatar` — verify explicit `width`/`height` or aspect-ratio wrappers to prevent CLS. `Skeleton.Image` uses `aspect-*` correctly; real images should mirror. |
| 10.2 | **P1** | Web-font swap using `&display=swap` (`index.html:30`) will cause **FOUT** (Inter → Inter). Preload one weight (400) as `<link rel="preload" as="font" crossorigin>` to minimize the swap flash. |
| 10.3 | **P2** | Stat badges hydrate from `0`/`-` then real number → horizontal layout shift. Reserve a min-width via `tabular-nums` + `min-w-[2ch]`. |
| 10.4 | **P2** | Suspense boundaries swap skeleton → real content — dimensions must match. Verify `ProfilePageSkeleton` matches actual profile header height (avatar 96px, name row, bio row, stats row). |

---

## PART 11 — Progressive Rendering

Currently the app is largely **all-or-nothing per page**: Suspense fallback → full page.

### Findings
| # | Severity | Finding |
|---|---|---|
| 11.1 | **P1** | Split each page into progressive sections with its own Suspense:  header (instant) → filters (fast) → grid (skeleton) → secondary (deferred). E.g. Events tab could render header + filter chips immediately, keep the card grid in its own Suspense. |
| 11.2 | **P1** | `DashboardPage.tsx:213` renders **whole page or `DashboardLoading`**. Should render header + scope selector immediately (all cached), then let each KPI card hydrate independently. |
| 11.3 | **P2** | `Profile` renders header only after profile query resolves. Split: avatar + name (from `useAuth` cache) → bio → stats → tabs. |

---

## PART 12 — Background Operations

**Files:** `src/components/DashboardPage.tsx:74-127`, `src/contexts/MessagingContext.tsx`, `src/utils/supabase/api/follows.ts` (subscribeToOnlineUsers)

### Findings
| # | Severity | Finding |
|---|---|---|
| 12.1 | **P0** | Dashboard poll interval `30_000` **plus** two realtime channels **plus** visibility handler **plus** on-mount fetch = wasteful. On a busy account this hits Supabase constantly. Poll should be disabled while realtime is active (they're duplicates). |
| 12.2 | **P1** | Realtime handlers call full `runPrefetch` on any change (`DashboardPage.tsx:98, 104`) — no debounce. Bursty events cause request storms. Add trailing-edge debounce (500ms) and refetch only the changed dataset. |
| 12.3 | **P2** | Global `refetchOnWindowFocus: false` (`queryClient.ts:8`) means users returning to the tab after 10 minutes see stale data. Consider enabling per-query for time-sensitive data (feed, live streams, wallet). |
| 12.4 | **P2** | No visible sync/refresh indicator when background refetch is running — users can't tell if data is fresh. |

---

## PART 13 — Empty States

Audit needed per surface. Present:
- `ProfileError.tsx` (error, not empty)
- `ChatEmptyState.tsx` ✅ exists

Missing/needs verification:
- Empty feed, empty events grid, empty search results, empty notifications, empty wallet history, empty ticket list, empty followers/following lists, empty hosted events.

**Severity: P1** — every list surface must have a first-class empty state with illustration + CTA (e.g., "No events yet — create your first" with primary button).

---

## PART 14 — Error States

**Files:** `src/components/RouteErrorBoundary.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/profile/ProfileError.tsx`, Sentry boundary in `main.tsx:64-70`

### Findings
| # | Severity | Finding |
|---|---|---|
| 14.1 | **P1** | Sentry top-level fallback (`main.tsx:64-70`) uses `text-red-600`, `bg-blue-600` — violates design tokens. Should use semantic tokens. |
| 14.2 | **P1** | `RouteErrorBoundary` is applied to some routes only (`/profile/:id`, `/post/:id`, `/event/:id`, `/search`, `/messages`) — missing from `/dashboard`, `/wallet`, `/live/:id`, `/create`. Any crash there falls through to the ugly Sentry fallback. |
| 14.3 | **P1** | No offline detection UI. `useNetworkStatus.ts` exists — verify it's actually consumed to show an offline banner. |
| 14.4 | **P1** | API failures — most `try/catch` blocks `console.warn` and swallow. Need consistent toast + retry pattern. |
| 14.5 | **P2** | 404 page uses hardcoded purple colors, no consistent styling with rest of app (`AppRoutes.tsx:156-162`). |
| 14.6 | **P2** | No 500-class distinguishing UI — everything is either "loading" or "not found". |

---

## PART 15 — Loading Consistency

Two loading languages coexist:
1. **Skeleton system** (`PageSkeletons.tsx`) — used at route Suspense level.
2. **Spinners** — `LoadingScreen`, `/search`, `/compose/post`, dashboard modal, some in-form indicators.

No unified `<LoadingState size="page|section|inline|button">` primitive to enforce the rule "skeletons for structure, spinners only inside buttons".

**Severity: P1** — introduce a single `LoadingBoundary` wrapper that picks skeleton/spinner based on prop.

---

## PART 16 — Perceived Performance

Reference bar: Linear/Stripe/Notion/Vercel all target *sub-100ms visual response* on every interaction and *zero spinners* on route change.

| Aspect | Eventz today | Target |
|---|---|---|
| Cold start visual | Spinner then skeleton then content | App-shell skeleton → content |
| Tab switch (warm) | Instant (keep-alive) ✅ | Instant ✅ |
| Tab switch (cold) | Skeleton → content | Skeleton → content (prefetched ~ instant) |
| Route to detail modal | Skeleton flash + fetch | Prefetch on hover → open with cached data |
| Form submit | Toast on success, sometimes no button-state | In-button spinner + inline success + toast |
| Error | Sentry ugly fallback for unwrapped routes | Branded error with retry CTA |
| Empty | Inconsistent | Illustrated empty + CTA |
| Background refresh | Silent, no indicator | Small "syncing" indicator |

**Perceived-performance score today: ~5.5/10.** With the fixes below it can reach 8.5+.

---

## PART 17 — React + Vite Best Practices Checklist

| Practice | Status |
|---|---|
| Route-based code splitting | ✅ (`AppRoutes.tsx`) |
| React.lazy | ✅ 12 lazy components |
| Suspense boundaries | ✅ all lazy routes |
| Dynamic imports | ✅ + idle warm-up (`App.tsx:76-86`) |
| Route prefetching (on hover/focus) | ❌ **Missing** |
| TanStack Query loading states | ✅ but inconsistent |
| Optimistic updates | ❌ **Missing** |
| Background fetching | ⚠️ over-eager (Dashboard) |
| Query caching | ✅ (60s staleTime) |
| Placeholder data / `keepPreviousData` | ❌ |
| Stale-while-revalidate | ✅ default TSQ |
| Request deduplication | ✅ via TSQ, ❌ for raw supabase calls |
| Image lazy loading | ⚠️ verify per component |
| Font optimization | ⚠️ swap enabled, too many weights |
| Asset preloading (LCP image) | ❌ **Missing** |
| Manual chunk splitting | ✅ (`vite.config.ts`) |
| Efficient re-rendering | ⚠️ needs audit (Zustand selectors mostly OK) |
| Proper key usage | ⚠️ verify list components |
| Memoization | ⚠️ needs profiler pass |
| Route transitions | ❌ **Missing** |
| Scroll restoration | ⚠️ partial (manual) |
| ErrorBoundary coverage | ⚠️ only some routes |

---

## PART 18 — Performance Bottlenecks (ranked)

| Rank | Severity | Bottleneck | Location |
|---|---|---|---|
| 1 | **P0** | Full-screen spinner blocks first paint on every cold load | `App.tsx:206` → `LoadingScreen` |
| 2 | **P0** | Dashboard duplicate fetches on every mount (profile, user, stats) | `DashboardPage.tsx:74-127` |
| 3 | **P0** | Realtime + 30s poll + on-mount fetch on Dashboard all overlap | `DashboardPage.tsx:88-108` |
| 4 | **P1** | No route/data prefetch on hover — clicks feel laggy | Everywhere |
| 5 | **P1** | Feed prefetch scheduled at 5000ms idle (too late) | `App.tsx:57-70` |
| 6 | **P1** | Google Fonts loads 6 weights — reduce to 3 | `index.html:30` |
| 7 | **P1** | Zero page/modal transitions | `AppRoutes.tsx` |
| 8 | **P1** | Two spinner fallbacks contradict skeleton system | `AppRoutes.tsx:115, 149` |
| 9 | **P1** | Missing `RouteErrorBoundary` on `/dashboard`, `/wallet`, `/live`, `/create` | `AppRoutes.tsx` |
| 10 | **P2** | Layout shift on hydrating stats (`0` → real) | `useProfileStats`, `DashboardPage` |
| 11 | **P2** | No optimistic UI for likes/follows/comments | Feed & Profile hooks |
| 12 | **P2** | Eager imports of Legal/Support/AuthCallback in entry chunk | `AppRoutes.tsx:3-8` |
| 13 | **P2** | No offline / slow-network UI | `useNetworkStatus.ts` unused? |
| 14 | **P3** | ServiceWorker registered synchronously in entry | `main.tsx:25` |

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
- **`<AppShellSkeleton>`** — replaces `LoadingScreen`, includes nav, top bar, tab placeholder.
- **`<LoadingBoundary variant="page|section|inline|button">`** — enforces skeleton vs spinner rules.
- **`<PrefetchLink to={...}>`** — wrapper around React Router `Link` that fires `queryClient.prefetchQuery` and `import(...)` on `pointerenter`/`focus`.
- **`<PageTransition>`** — Framer Motion `AnimatePresence` fade/slide, 180ms.
- **`<OfflineBanner>`** — driven by `useNetworkStatus`, fixed top.
- **`<EmptyState icon={} title={} action={}>`** — unify empty presentation.
- **`<ErrorState onRetry title message>`** — unify errors, with `useMutation` retry handling.

### Strategy summary
| Layer | Strategy |
|---|---|
| Global loading | App-shell skeleton, no spinner. Auth hydrates behind. |
| Route loading | Lazy + matching skeleton + prefetch on hover. |
| Data loading | TSQ with `staleTime` per surface, `keepPreviousData`, optimistic mutations. |
| Error | Route + section boundaries with branded fallback + retry. |
| Retry | Per-query `retry: 3` w/ backoff for GETs; `retry: 0` for mutations. |
| Offline | `useNetworkStatus` → banner + queued mutations via TSQ persister. |
| Optimistic UI | Likes, follows, comments, wallet balance updates. |

---

## PART 20 — Final Report

### Scores (1–10)
| Dimension | Score |
|---|---|
| Overall Loading Experience | **6.0** |
| Navigation | **7.0** (keep-alive is excellent) |
| Responsiveness | **6.5** |
| Perceived Performance | **5.5** |
| Skeleton Quality | **7.5** (great library, inconsistent adoption) |
| Loading Consistency | **5.0** (mixed spinners + skeletons) |
| Async Architecture | **6.0** (TSQ good, Dashboard chaotic) |
| UX Polish | **5.5** |
| Production Readiness | **6.5** |

### Answers
1. **What makes the app feel slow?** Cold-start spinner (P0), Dashboard duplicate fetches (P0), waterfall Auth→Profile→Stats, missing transitions, layout shifts on hydrating stats, chunk-download latency on FAB/detail click (no route prefetch).
2. **What feels unpolished?** Full-screen spinner as first impression, hard-cut route changes, hard-coded purple in 404 & Sentry fallback, inconsistent form-submit feedback, no page transitions, layout shifts.
3. **Which interactions need immediate feedback?** FAB → `/create`, event card → detail modal, tab bar → cold tab, post like/follow, form submit buttons, dashboard refresh.
4. **Which pages need skeletons?** `/search`, `/compose/post`, all Dashboard sub-tabs (verify), profile subsections, empty lists (skeleton before empty state resolves).
5. **Which routes should be lazy loaded?** Already lazy: 12 routes ✅. Add: `LegalPage`, `SupportPage`, `DeleteAccountPage`, `AuthCallbackPage`, `HostedPage` (currently eager in `AppRoutes.tsx:3-8`).
6. **Which API calls should be prefetched?** Feed page 1 (currently 5s idle — move to immediate), events grid page 1, live grid, profile of self, dashboard scope 'all', wallet balance. On hover: detail modals, chat conversations.
7. **Which loading indicators should be replaced?** `LoadingScreen`, `/search` Suspense fallback, `/compose/post` Suspense fallback, `DashboardLoading`, Sentry error fallback.
8. **How would I redesign the entire loading experience?** Ship the architecture in PART 19: app-shell skeleton first paint, prefetch-on-hover navigation, per-section progressive Suspense, `LoadingBoundary` primitive to enforce skeleton-over-spinner, `PageTransition` wrapper (180ms fade), optimistic mutations for social actions, unified `EmptyState`/`ErrorState`/`OfflineBanner`. Deduplicate Dashboard fetches (cache-first, refetch only on cache-miss or realtime delta).

---

### Recommended roadmap (in this order)
1. **P0** — Replace `LoadingScreen` with `AppShellSkeleton`.
2. **P0** — Dedupe Dashboard bootstrap (skip fetches when cache exists, debounce realtime, remove poll while realtime alive).
3. **P0** — Fix stat hydration flash across Dashboard, Wallet, Profile (reserve widths, hide until cached-or-fresh).
4. **P1** — Add `PrefetchLink` and wire nav items + card links.
5. **P1** — Replace remaining spinners with skeletons; add `LoadingBoundary` primitive.
6. **P1** — Add `PageTransition` (Framer Motion `AnimatePresence`, 180ms).
7. **P1** — Trim Google Fonts weights to 3, preload one weight.
8. **P1** — Extend `RouteErrorBoundary` to all routes; rebrand Sentry fallback with tokens.
9. **P2** — Optimistic updates for likes/follows/comments.
10. **P2** — `OfflineBanner`, unified `EmptyState`/`ErrorState`.
11. **P2** — Lazy-load Legal/Support/AuthCallback pages.
12. **P3** — Defer `registerServiceWorker` and `Sentry.init` to idle.

---

_End of audit._
