# Frontend Architecture Analysis — EVENTZ

**Auditor:** Principal Software Engineer  
**Date:** July 7, 2026  
**Last Updated:** July 7, 2026 (Refactoring Pass Complete)

---

## EXECUTIVE SUMMARY

The frontend is a React 18 SPA built with Vite 6, TypeScript 6, Tailwind CSS v4, TanStack Query, Zustand, and approximately 25 Radix UI primitives. It totals ~51,000 lines of TypeScript/TSX across the `src/` directory.

**Frontend Readiness Score: 5/10** (improved from 3/10)

**Critical Issues Fixed in Latest Pass:**
- ✅ Focus outlines globally removed → **RESTORED** with proper `outline: 2px solid #7C3AED` + focus ring
- ✅ Shadows globally disabled → **RE-ENABLED** (destructive CSS workaround removed)
- ✅ Input focus indicators removed → **RESTORED** with purple outline + ring
- ✅ `PostDetailPage` (~974) + `PostDetailModal` (~892) → **CONSOLIDATED** into shared `PostDetailView` (874 lines), wrappers now 108 + 171 lines
- ✅ `WalletPage` (~672) + `WalletModal` (~695) → **DEDUPLICATED** via shared `useWalletData` hook (369 lines), now 319 + 349 lines
- ✅ 30+ silent catch blocks → **REDUCED TO 5** (all others log to console)
- ✅ `isVideo()` helper duplicated in 5 files → **CENTRALIZED** in `utils/media.ts`
- ✅ `window.prompt()` for editing → **REPLACED** with proper `EditCaptionModal` component
- ✅ Network detection, fullscreen API, haptic feedback → **EXTRACTED** to custom hooks
- ✅ `getFullPhone()` duplicated → **MERGED** into `utils/media.ts`
- ✅ Button component → added `accent` variant
- ✅ `CreateEvent.tsx` (1,429) → **REDUCED** to 1,166 (helpers extracted)
- ✅ `EmptyState` component created (ready for wiring into views)

**Critical Issues Remaining:**
- 8 component files still exceed 800 lines — large but several reduced
- No design system — hardcoded hex colors in 25+ locations
- 12 separate inline `useMemo`/`useCallback` workarounds for prop instability
- Missing empty states in 6+ views (component exists, not yet wired)
- Custom events still used for cross-component communication

---

## PART 1 — COMPONENT ARCHITECTURE

### 1.1 File Size Distribution

```
> 1000 lines: 2 files
 800-999 lines: 6 files
 600-799 lines: 6 files
 400-599 lines: 9 files
 200-399 lines: 22 files
 < 200 lines:  38 files
```

**22 out of 60 component files (37%) exceed 200 lines.** Industry best practice is that a single component file should rarely exceed 200-300 lines. Here's the list of the largest offenders:

| Rank | File | Lines | Problem |
|------|------|-------|---------|
| 1 | `CreateEvent.tsx` | 1,429 | Single-file multi-step form with 9+ sub-views |
| 2 | `EventDetails.tsx` | 1,306 | Discovery page + filtering + search + ticket modals |
| 3 | `SettingsModal.tsx` | 1,088 | Profile edit + privacy + help + support in one file |
| 4 | `PostDetailPage.tsx` | 974 | **90% duplicated** with PostDetailModal |
| 5 | `EventDetailModal.tsx` | 957 | Event display + streaming + ticketing + sharing |
| 6 | `OrganizerSettingsModal.tsx` | 898 | Organizer profile + analytics + settings |
| 7 | `PostCard.tsx` | 896 | Video carousel + likes + saves + reports + blocks + edits |
| 8 | `PostDetailModal.tsx` | 892 | **90% duplicated** with PostDetailPage |
| 9 | `StreamManagerNew.tsx` | 887 | Live streaming + Agora + chat + overlay |
| 10 | `LiveStreamViewerNew.tsx` | 886 | Stream viewing + chat + gifts + interactions |

### 1.2 Critically Large Component Breakdown

#### `PostCard.tsx` (896 lines) — Single Responsibility Violation

This component handles **11 distinct responsibilities**:

1. Video playback with autoplay (IntersectionObserver, lines 230-295)
2. Image carousel with embla (lines 567-709)
3. Like/unlike with optimistic update + animation (lines 297-315)
4. Save/unsave with haptic feedback (lines 327-335)
5. Report user flow (lines 382-403)
6. Block user flow (lines 431-445)
7. Edit caption via `window.prompt()` (lines 405-420) — synchronous dialog
8. Delete post (lines 422-429)
9. Message user (lines 447-453)
10. Fullscreen video with multiple vendor prefixes (lines 115-145)
11. Network connection type detection (lines 94-104)

**Each of these should be its own component or custom hook.**

#### `PostDetailPage.tsx` (974 lines) vs `PostDetailModal.tsx` (892 lines) — Massive Duplication

These two files share **~80% identical code**:

- Both import the same 20+ dependencies
- Both declare an identical `isVideo()` helper (lines 44-50 in both)
- Both have nearly identical JSX for: header, media carousel, comments section, action buttons
- Both implement the same `updateCarouselHeight` callback
- Both have the same comment posting logic
- Both render identical dropdown menus with identical items

**The only difference**: PostDetailPage wraps its content as a full-page view with back button, while PostDetailModal renders inside a modal overlay. The shared content should be extracted to a `PostDetailView` component.

### 1.3 Component Duplication Registry

| Duplicated Logic | Files | Lines | Impact |
|-----------------|-------|-------|--------|
| `isVideo()` helper | `PostCard.tsx`, `PostDetailPage.tsx`, `PostDetailModal.tsx`, `CreateEvent.tsx`, `PostDetailWrapper.tsx` | ~5 x 5 lines = 25 duplicated lines | Should live in `utils/media.ts` |
| Comment fetching + mapping | `Feed.tsx:188-209` and `Feed.tsx:219-247` | 2 x 20 lines | Same function called twice with different triggers |
| Video rendering (carousel vs single) | `PostCard.tsx:593-665` and `PostCard.tsx:720-788` | 2 x 70 lines | Near-identical video element with same event handlers |
| Full media viewer | `MediaViewer.tsx` (603 lines) vs embedded viewers | Various | Dedicated component exists but inline viewers still used |
| Carousel setup + API handling | `PostCard.tsx`, `PostDetailPage.tsx`, `PostDetailModal.tsx` | 3 x 40 lines | Same embla carousel initialization |
| Wallet UI | `WalletModal.tsx` (695 lines) and `WalletPage.tsx` (672 lines) | 2 x ~680 lines | **Near-complete duplication** — same state, same JSX, same logic |
| `getFullPhone()` helper | `WalletModal.tsx:30-35` and `WalletPage.tsx:27-32` | 2 x 6 lines | Small but indicates lack of shared utilities |

### 1.4 Props Interface Quality

**Only 3 out of 60 component files use `interface` for props.** The rest either:
- Use inline type annotations
- Re-export `any` types
- Have no explicit prop interface

Examples of `any` abuse:
```typescript
// PostDetailPage.tsx:28-30
interface PostDetailPageProps {
  post: any;           // Should be ApiPost
  currentUser: any;    // Should be SupabaseUser | null
  userProfile?: any;   // Should be Profile
}
```

```typescript
// Feed.tsx:35
currentUser?: any;    // Should be typed
```

```typescript
// EventDetailModal.tsx:18-24
interface EventDetailModalProps {
  event: ApiEvent;  // Correctly typed
  // but then:
  onStartConversation?: (user: { name: string; username?: string; avatar: string; verified: boolean; isOrganizer?: boolean }) => void;
  // Missing proper User type — inline anonymous interface
}
```

---

## PART 2 — DESIGN SYSTEM AUDIT

### 2.1 Design System Exists? **No.**

There is no centralized design system. The project uses:
- Radix UI primitives (25 packages) — good foundation
- Tailwind CSS v4 — good foundation
- Some CSS custom properties in `globals.css`
- Lucide React icons

**But none of these are composed into a coherent design system.**

### 2.2 Button Components

There is exactly **one** shared button component (`src/components/ui/button.tsx`, 58 lines) using `class-variance-authority`. However, **5+ different button patterns** exist across the codebase:

| Location | Style | Line |
|----------|-------|------|
| `App.tsx:354` | `rounded-full bg-[#7C3AED] px-5 py-2 text-sm font-semibold text-white` | Inline |
| `ErrorBoundary.tsx:98` | `w-full bg-purple-600 text-white py-3 px-4 rounded-xl font-semibold` | Inline |
| `RouteErrorBoundary.tsx:54` | `rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white` | Inline |
| `PostCard.tsx:54` | `inline-flex h-8 w-8 ... rounded-full bg-black/50 ... backdrop-blur-md` | CSS class |
| `EventCard.tsx:59` | `w-8 h-8 rounded-full bg-black/55 text-white backdrop-blur-sm` | Inline |

**Impact**: Changing the primary button style requires editing 25+ files. No `variant="primary"` / `variant="secondary"` pattern exists.

### 2.3 Color Hardcoding Analysis

The brand purple `#7C3AED` appears in **25+ locations** across the codebase:

| File | Lines | Context |
|------|-------|---------|
| `App.tsx` | 347, 353, 651, 660, 674, 694 | Spinner, buttons, nav links |
| `globals.css` | 11, 370, 396, 405 | CSS variables, search orb |
| `PostCard.tsx` | 477 | Organizer badge hover |
| `EventDetailModal.tsx` | 50, 54 | Calendar SVG icon |
| `RouteErrorBoundary.tsx` | 50 | Button color |
| `CreateEvent.tsx` | 99 | Tier colors array |
| `EventDetails.tsx` | 200+ | Category icons, filters |
| `SettingsModal.tsx` | Various | UI elements |
| `Feed.tsx` | Various | Like animation, icons |
| `Profile.tsx` | Various | Tab indicators |

Other hardcoded colors:
- `#F6F6F6` — appears ~10x (feed backgrounds)
- `#EDE9FE` — border color, ~5x
- `#999999` — text color, ~8x
- `#6D28D9` — dark purple, ~5x
- `#0C0C0C` — text color, ~4x

### 2.4 Typography Audit

The `globals.css` defines custom font sizes (lines 132-138):
```css
--text-2xs: 0.75rem;
--text-xs: 0.8125rem;
--text-sm: 0.875rem;
```

But these are inconsistently applied. Some components use Tailwind classes (`text-xs`, `text-sm`), others use inline `fontSize`, others use CSS classes with `!important`:

```css
/* globals.css:498 — Custom class with !important */
.feed-post-hashtag {
  font-size: 0.6875rem !important;
}
```

```css
/* globals.css:167-215 — Base typography layer */
h1 { font-size: var(--text-2xl); }
h2 { font-size: var(--text-xl); }
```

**Problem**: The typography system uses a confusing selector `:where(:not(:has([class*=' text-']), ...))` to try to avoid conflicts, but this is fragile and hard to reason about.

### 2.5 Spacing Inconsistencies

Spacing is a mix of:
- Tailwind spacing classes: `p-3`, `px-4`, `gap-2.5`
- Custom CSS: `padding: 0.8125rem 1rem 0.625rem` (feed-post-head)
- Inline styles: `style={{ paddingTop: feedHeaderHeight > 0 ? `${feedHeaderHeight}px` : '7rem' }}`

Examples of custom CSS with pixel values instead of Tailwind tokens:
```css
.feed-post-head { padding: 0.8125rem 1rem 0.625rem; gap: 0.625rem; }
.feed-post-actions { gap: 0.4375rem; padding: 0.6875rem 0.875rem 0.875rem; }
.feed-post-caption { padding: 0.625rem 1rem 0; }
```

These fractional `rem` values (0.8125, 0.6875, 0.4375) don't map to any Tailwind spacing scale and suggest pixel-pushing in a codebase that should use a 4px or 8px grid system.

### 2.6 Border Radius Inconsistency

| Value | Where Used |
|-------|-----------|
| `rounded-full` | Buttons, avatars, badges |
| `rounded-2xl` | Cards (EventCard) |
| `rounded-xl` | Dropdown menu content |
| `rounded-lg` | Error boundary container |
| `rounded-md` | EventCard compact mode |
| `border-radius: 16px` | Toaster style (App.tsx:408) |
| `border-radius: 0.5rem` | `.event-card-compact` (globals.css) |
| `--radius: 0.75rem` | CSS variable (defined but not used consistently) |

---

## PART 3 — CSS & STYLING ANALYSIS

### 3.1 `globals.css` — 679 Lines of Technical Debt

**Critical Issues:**

**Line 663-669 — Shadow Removal (Destructive)**
```css
[class*="shadow-"] {
  box-shadow: none !important;
}
[class*="drop-shadow"] {
  filter: none !important;
}
```

This **globally disables all Tailwind shadow and drop-shadow utilities.** Any component using `shadow-sm`, `shadow-lg`, `shadow-xl`, `drop-shadow-lg`, etc. will have no effect. This is likely a workaround for some other CSS issue but creates a massive maintenance burden — developers will try to use shadows and wonder why they don't work.

**Impact**: The `EventCard.tsx` uses `hover:shadow-xl` in its className (line 41) but this will never show because of the global override.

**Line 672-679 — Focus Outline Removal (Accessibility Violation)**
```css
button:focus-visible,
a:focus-visible,
[role='button']:focus-visible,
[tabindex]:not([tabindex='-1']):focus-visible {
  outline: none !important;
  outline-offset: 0 !important;
  box-shadow: none !important;
}
```

This **completely removes keyboard focus indicators** for ALL interactive elements. This is a WCAG 2.1 SC 2.4.7 (Focus Visible) violation and makes the app unusable for keyboard-reliant users.

**Line 579-595 — Input Focus Removal**
```css
input:focus, textarea:focus, select:focus,
input:focus-visible, textarea:focus-visible, select:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
input:focus, textarea:focus, select:focus {
  border-color: #D1D5DB !important;
}
```

This removes focus indicators from ALL form inputs AND hardcodes the focus border color to `#D1D5DB` (light gray), which likely fails color contrast ratios.

**Lines 140-148 & 151-161 — Duplicate `@layer base` Blocks**
```css
@layer base {
  :where(input, textarea, select, button, a, ...):focus-visible { ... }
}
@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; ... }
}
```

These two `@layer base` blocks could be merged.

### 3.2 Feed Post Styles — 153 Lines of Custom CSS

The `.feed-post-*` class system (lines 425-577) is ~153 lines of custom CSS that should be Tailwind classes. Every class uses `!important` for properties that Tailwind handles natively:

```css
.feed-post-name {
  color: #0C0C0C;
  font-size: 0.8125rem !important;
  font-weight: 600;
  line-height: 1.1rem;
}
```

Could be replaced with: `className="text-[#0C0C0C] text-[0.8125rem] font-semibold leading-[1.1rem]"` — or better, a design token.

### 3.3 Inline Styles

Inline styles are used extensively, bypassing Tailwind's utility system:

| File | Line | Inline Style |
|------|------|-------------|
| `App.tsx` | 347 | `className="w-16 h-16 border-4 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full animate-spin mx-auto"` (Tailwind, acceptable) |
| `App.tsx` | 404-424 | Full style object for Toaster |
| `App.tsx` | 430, 433, 449, 464, 476, 499 | `style={{ display: isEventsTab ? 'block' : 'none' }}` |
| `Feed.tsx` | 521-526 | Large inline style object with paddingTop, visibility, pointerEvents |
| `PostCard.tsx` | 354-358 | `getMediaFrameStyle()` returns inline style objects |
| `PostCard.tsx` | 575 | `style={carouselHeight ? { height: `${carouselHeight}px` } : undefined}` |
| `globals.css` | 5-47, 54-89 | CSS custom properties (acceptable) |

---

## PART 4 — STATE MANAGEMENT

### 4.1 State Architecture Overview

The project uses **4 different state management approaches simultaneously**:

1. **TanStack Query** (`@tanstack/react-query`) — Server state (events, feed, posts, notifications, wallet)
2. **Zustand** (`src/store/profileStore.ts`, `src/store/eventStore.ts`) — Client state
3. **React Context** (`AuthContext`, `MessagingContext`) — Global client state
4. **Local component state** (`useState`) — UI state

### 4.2 Store Analysis

#### `profileStore.ts` (121 lines)

Uses Zustand with `persist` middleware. Issues:
- Stores PII (name, avatar_url, email, bio, location) in `localStorage` via persistence
- Migration function (line 103-109) is minimal — doesn't handle schema changes well
- `clear()` method keeps `userStatsCache` but clears everything else — confusing partial reset
- `partialize` (line 110-118) excludes `hostedCount` and `isOrganizer` but includes `dashboardCache` which could be large

#### `eventStore.ts` (38 lines) — **DELETED ✓**

Replaced with direct `queryClient` / `queryKeys` / `useQuery` in:
- `CreateEvent.tsx` → `queryClient.invalidateQueries({ queryKey: queryKeys.events.publicList })`
- `SearchPage.tsx` → `useQuery({ queryKey: queryKeys.events.publicList, ... })`
- `EventDetails.tsx` → `queryClient.getQueryData()` / `setQueryData()` + `useRef` for cache freshness

### 4.3 TanStack Query Configuration

```typescript
// queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,     // 1 minute
      gcTime: 10 * 60_000,   // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

Issues:
- `gcTime: 10 minutes` — stale data persists in memory for 10 minutes even after unmount. On a feed page this means images and data for posts the user scrolled past stay in memory.
- `retry: 1` — only one retry with no exponential backoff. Network blips cause apparent failures.
- `refetchOnWindowFocus: false` — users won't see fresh data when returning to the app unless they manually refresh.

### 4.4 Unnecessary Re-render Analysis

**App.tsx** — The root component re-renders on every route change:
- Lines 219-228: `handleLogout`, `handleCreateEvent`, `handleStartOrganizerSetup`, `handleEditEvent` are recreated every render
- Lines 230-248: `handleViewPost` recreated every render
- The entire render output (~300 lines of JSX) reevaluates on every pathname change

**PostCard.tsx** uses `React.memo` (line 58) but:
- Receives inline callbacks from Feed.tsx unless memoized
- Feed.tsx has adapter wrappers at lines 465-468 (`onLikeId`, `onSaveId`) specifically to keep references stable — this is a workaround for prop instability

**MessagingContext.tsx** — The context value is wrapped in `useMemo` (line 279) but the dependencies include `conversations`, `isLoadingConversations`, `onlineFriends`, `hasLiveEvents`, plus 4 callbacks. Any change to any dependency re-renders all consumers.

### 4.5 Feed Data Caching

`App.tsx:81-172` implements a custom feed prefetch with `localStorage` caching:

```typescript
const FEED_CACHE_KEY = 'eventz-feed-cache-v1';
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
```

This duplicates TanStack Query's built-in caching and has issues:
- `localStorage.getItem()` is synchronous — blocks the main thread
- JSON.parse of large post arrays causes UI jank on the main thread
- The prefetched data is stored in TanStack Query BUT ALSO in localStorage — dual storage
- localStorage has a ~5MB limit — feed data with image URLs can easily exceed this
- The data is serialized/deserialized on every read (losing Date objects, functions, etc.)

---

## PART 5 — HOOKS ANALYSIS

### 5.1 Custom Hooks

| Hook | Lines | File | Quality |
|------|-------|------|---------|
| `useFeedData` | 222 | `src/hooks/useFeedData.ts` | Good — well-structured data fetching |
| `useProfileData` | 289 | `src/hooks/useProfileData.ts` | Good but long — handles too many concerns |
| `useLiveFeedData` | 130 | `src/hooks/useLiveFeedData.ts` | Solid |
| `useLocationPrefs` | 132 | `src/hooks/useLocationPrefs.ts` | Good |
| `useFeedData.test` | 48 | `src/hooks/useFeedData.test.ts` | Only hook test |

### 5.2 Hook Issues

**`useProfileData.ts` (289 lines)** — Too many responsibilities:
- Fetches profile data
- Manages follower/following counts
- Handles event organization data
- Manages ticket data
- Handles saved posts/events
- Manages streamed videos
- Handles blocking/unblocking

This should be split into smaller hooks: `useProfile`, `useFollows`, `useTickets`, `useSavedContent`.

**`useFeedData.ts` (222 lines)** — Solid implementation with:
- Proper infinite scroll pattern
- Cache management
- Scroll position tracking
- Error state handling

However, it also handles post deletion cache cleanup which should be a separate concern.

### 5.3 Missing Hooks

Several reusable behaviors are implemented inline instead of as hooks:

| Behavior | Inline Location | Recommendation |
|----------|----------------|----------------|
| Network connection detection | `PostCard.tsx:94-104` | `useNetworkStatus` hook |
| Video autoplay with IntersectionObserver | `PostCard.tsx:230-295` | `useVideoAutoplay` hook |
| Media aspect ratio calculation | `PostCard.tsx`, `PostDetailPage.tsx`, `PostDetailModal.tsx` | `useMediaAspectRatio` hook |
| Keyboard shortcut handling | Missing entirely | `useKeyboard` hook |
| Scroll position restoration | `Feed.tsx:120-183` | `useScrollRestore` hook |
| Debounced search | `EventDetails.tsx` (inline) | `useDebounce` hook |
| Click outside detection | Multiple inline implementations | `useClickOutside` hook |
| Fullscreen API | `PostCard.tsx:115-145` | `useFullscreen` hook |

---

## PART 6 — UI COMPONENT ANALYSIS

### 6.1 UI Primitives (`src/components/ui/`)

| Component | Lines | Quality Assessment |
|-----------|-------|-------------------|
| `alert-dialog.tsx` | 157 | Well-structured Radix wrapper |
| `button.tsx` | 58 | CVA-based, good |
| `carousel.tsx` | 241 | Embla wrapper, well done |
| `confirm-dialog.tsx` | 52 | Simple, good |
| `dropdown-menu.tsx` | 257 | Radix wrapper, well done |
| `sheet.tsx` | 143 | Radix wrapper, good |
| `skeleton.tsx` | 58 | Basic but functional |
| `tabs.tsx` | 66 | Radix wrapper, good |
| `use-mobile.ts` | 31 | Simple hook |
| `utils.ts` | ~5 | cn() utility |

**Issues with UI primitives:**

1. **`dropdown-menu.tsx` (257 lines)**: This is an auto-generated/shadcn-style file. It has been manually edited — the `DropdownMenuItem` component has custom styles, `variant="destructive"` prop (line ~180-200), and custom color overrides that deviate from the Radix defaults.

2. **`carousel.tsx` (241 lines)**: Embla wrapper with custom button positioning. The buttons use `opacity-0 group-hover:opacity-100` for show/hide, which hides navigation on mobile/touch devices. PostCard.tsx wraps this in another `hidden md:block` (line 693), making carousel navigation entirely unavailable on mobile screens.

3. **`button.tsx` (58 lines)**: Defines only `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` variants. But the app uses many more button patterns not covered by these variants.

### 6.2 Custom SVG Icons

File: `src/components/icons/CommentIcon.tsx` (15 lines) — A single custom SVG icon for comments. The rest of the app uses Lucide icons. This inconsistency means:
- CommentIcon has a different visual style than Lucide's `MessageCircle`
- It adds a custom dependency (the SVG file) for a single icon that Lucide likely already provides

### 6.3 Image Handling

File: `src/components/figma/ImageWithFallback.tsx` (147 lines)

This is the only image component in the app. It handles:
- Image loading with placeholder
- Error fallback (shows a gray placeholder)
- Optional Supabase transformation params (`displayWidth`, `quality`, `resize`)
- Skeleton while loading

**Issues:**
- The Supabase URL transformation logic assumes the image is from Supabase Storage — external URLs will not be transformed but still receive transformation query params
- No blur-up or low-quality image placeholder (LQIP) technique
- No lazy loading configuration — the parent must pass `loading` prop
- No `srcSet` for responsive images
- No WebP/AVIF format negotiation
- The `onLoad` callback pattern creates race conditions in carousels

---

## PART 7 — ACCESSIBILITY AUDIT

### 7.1 Critical Issues

| # | Issue | File | Line | WCAG Criterion |
|---|-------|------|------|----------------|
| 1 | Focus outlines removed globally | `globals.css` | 672-679 | 2.4.7 (Level AA) |
| 2 | Input focus indicators removed | `globals.css` | 579-595 | 2.4.7 (Level AA) |
| 3 | No skip-to-content link | `App.tsx` | — | 2.4.1 (Level A) |
| 4 | ARIA labels missing on icon buttons | Multiple | Various | 4.1.2 (Level A) |

### 7.2 Detailed Accessibility Findings

**Focus Management:**
- The global focus outline removal (Issue #1) affects every button, link, and interactive element
- `RouteErrorBoundary.tsx:48-53` has a "Try again" button with no focus management when errors occur
- Modal dialogs (`PostDetailModal`, `EventDetailModal`) do not trap focus — Tab key exits the modal
- When modals close, focus is not returned to the triggering element

**ARIA Attributes:**
- `PostCard.tsx:497`: `<button aria-label="Post options">` — good
- `PostCard.tsx:883-892`: Share and save buttons have ARIA labels — good
- `EventCard.tsx:57`: `<button aria-label="Event actions">` — good
- BUT many icon-only buttons lack ARIA labels:
  - Feed action buttons (PostCard.tsx:857-893) — like button has no ARIA label
  - Video control buttons (PostCard.tsx:639-662) — no ARIA labels
  - Carousel navigation (carousel.tsx) — relies on embla defaults

**Semantic HTML:**
- `PostCard.tsx:456`: Uses `<article>` — correct
- Post list items should use `<li>` inside `<ul>` or `<ol>` — not found
- Heading hierarchy is inconsistent:
  - `EventCard.tsx:109`: `<h3>` for event title — good
  - `PostCard.tsx:471-476`: `<span>` for user name — should be `<h2>` or `<h3>`
  - `Feed.tsx`: No semantic heading structure for the page

**Color Contrast:**
- `#999999` text on white background (feed post time) — contrast ratio ~3:1, fails WCAG AA (4.5:1 for normal text)
- `#7C3AED` on `#F3EEFF` (hashtags) — needs measurement but likely marginal
- `#1A0533` on `#FFFFFF` (primary text) — acceptable

**Touch Targets:**
- Feed action buttons (`PostCard.tsx:510-518`): `min-height: 2rem` (32px) — below WCAG recommendation of 44px
- Event category chips (`globals.css:309`): `height: 1.65rem` (~26px) — far below 44px minimum

### 7.3 Reduced Motion

The app uses animations (like animation, video autoplay, carousel transitions) without checking `prefers-reduced-motion`. Users with vestibular disorders may experience discomfort.

---

## PART 8 — PERFORMANCE ANALYSIS

### 8.1 Bundle Size Concerns

**Potential large bundles:**
- Radix UI (25 packages) — ~100-200KB gzipped
- Recharts + d3 — ~100KB gzipped
- Agora RTC SDK — ~2MB (only loaded on live pages, good)
- HLS.js — ~100KB (only on live pages, good)
- Lucide React — ~50KB (tree-shakeable)
- TanStack Query — ~30KB

**Chunking strategy** (vite.config.ts:62-81): Good manual chunking splits:
- `react-core`: React, ReactDOM, scheduler
- `charts`: Recharts + d3
- `radix`: All @radix-ui packages
- `supabase`: @supabase packages
- `icons`: lucide-react
- `agora`: agora-rtc-sdk-ng
- `hls`: hls.js

### 8.2 React Performance Issues

**Unnecessary re-renders from context:**
- `MessagingContext` provides conversations + online friends + 4 callbacks. Any change to any value causes all `useMessaging()` consumers to re-render.
- The `value` is wrapped in `useMemo` (line 279) but the dependency array includes `isLoadingConversations` which changes briefly on every query refetch.

**Infinite scroll memory growth:**
- `useFeedData.ts` appends all loaded posts to a single array — no windowing/virtualization
- As user scrolls through feed, DOM nodes accumulate indefinitely
- No `React.Virtualizer` or similar library used
- Each PostCard creates multiple DOM nodes (video elements, images, carousel)

**Video element management:**
- `PostCard.tsx:600-633`: Creates `<video>` elements for every post, even those not in view
- The IntersectionObserver pauses off-screen videos but the DOM elements persist
- With 50 visible posts in infinite scroll, 50 `<video>` elements exist in DOM

### 8.3 Image Optimization

**Current state:** Images are served from Supabase Storage with optional transformation params:
```typescript
// ImageWithFallback.tsx uses:
displayWidth={520}
quality={78}
resize="cover"
```

**Missing optimizations:**
- No responsive `srcSet` or `<picture>` element for different screen sizes
- No WebP/AVIF format negotiation
- No CDN caching beyond Supabase defaults
- No lazy loading for below-fold images (the `loading` prop is passed by parent but not all parents use it)
- No blur-up placeholder technique — images pop in as they load

### 8.4 Rendering Performance

**Server components vs client components:**
- This is a SPA with no SSR/SSG — every page is client-side rendered
- First paint requires downloading and executing the entire JS bundle
- No streaming or progressive rendering
- No hydration concerns (no SSR) but initial load is JS-heavy

---

## PART 9 — ERROR HANDLING IN COMPONENTS

### 9.1 Silent Catch Blocks

**30+ locations** across the frontend use empty catch blocks:

```typescript
catch {/* silent */}
catch {}
catch (error) {}  // Variable declared but unused
catch { /* silent */ }
```

**Complete inventory:**

| File | Lines | What's Ignored |
|------|-------|----------------|
| `App.tsx` | 155 | Feed prefetch failure |
| `App.tsx` | 223 | Sign-out failure |
| `AuthContext.tsx` | 129 | Profile creation failure |
| `AuthContext.tsx` | 152 | Profile fetch failure |
| `AuthContext.tsx` | 176 | Session check failure |
| `MessagingContext.tsx` | 97 | Live events polling failure |
| `MessagingContext.tsx` | 153 | Presence subscription failure |
| `MessagingContext.tsx` | 192 | Conversation start failure |
| `MessagingContext.tsx` | 210-213 | Chat message API call failure (line 234) |
| `MessagingContext.tsx` | 259 | Mark as read failure |
| `Feed.tsx` | All async handlers | Inline try/catch with console.error |
| `PostDetailModal.tsx` | Various | Comment posting, data fetching |
| `EventDetails.tsx` | Various | Data fetching, event operations |
| `SettingsModal.tsx` | Various | Profile update, data loading |
| `Events.ts` (API) | 39, 141 | View increment failure |
| `Posts.ts` (API) | 96, 212-216 | Like/saved fetch, cache cleanup |

### 9.2 Error Feedback to Users

When errors are not silently caught, the pattern is:
```typescript
toast.error('Failed to send message');  // MessagingContext.tsx:244
toast.error('Failed to delete conversation');  // MessagingContext.tsx:273
toast.error('Failed to update like');  // Feed.tsx:291
```

**Issues:**
- Error messages are user-facing but vague — "Failed to" doesn't help users understand what happened
- No error codes, no support reference numbers
- No retry mechanism in toast actions
- Some `toast.error` calls are inside catch blocks that also do `console.error` but no logging service

### 9.3 Error Boundaries

| Boundary | File | Coverage |
|----------|------|----------|
| `ErrorBoundary` (global) | `ErrorBoundary.tsx` | Root of entire app |
| `RouteErrorBoundary` | `RouteErrorBoundary.tsx` | Per-route in App.tsx |

**Issues:**
- `ErrorBoundary` handles chunk-load errors gracefully but uses `window.location.reload()` as the only recovery — this loses all app state
- `RouteErrorBoundary` catches errors but its "Try again" button (`handleReset`) only resets the error boundary state — it doesn't re-fetch data or re-run side effects
- Neither boundary reports errors to any monitoring service
- No error boundary for data-fetching errors (TanStack Query errors are not caught by React error boundaries)

---

## PART 10 — LOADING, EMPTY, AND ERROR STATES

### 10.1 Skeleton Components

File: `src/components/skeletons/PageSkeletons.tsx` (539 lines)

Exports 8 skeleton variants:
- `EventsPageSkeleton`
- `FeedPageSkeleton`
- `LivePageSkeleton`
- `ProfilePageSkeleton`
- `DetailPageSkeleton`
- `CreatePageSkeleton`
- `DashboardPageSkeleton`
- `MessagesPageSkeleton`
- `ListPageSkeleton`

**Issue**: This file is 539 lines — it defines 9 separate skeleton components that each re-implement similar layout patterns. The skeletons should use a shared `SkeletonCard` or `SkeletonLayout` primitive.

### 10.2 Empty States

**Missing empty states:**

| View | What Happens When Empty | Issue |
|------|------------------------|-------|
| Feed | Shows nothing / loader | No "No posts yet" message |
| Events | Shows nothing | No "No events found" message |
| Search | Blank page | No "No results found" |
| Messages | Shows empty list | No "No messages" prompt to start chatting |
| Notifications | Shows nothing | No "No notifications" |
| Profile tabs | Shows nothing for empty tabs | No "No saved events" etc. |
| Wallet | Shows loading state | No "No transactions" |

**Example of a good pattern (missing):**
```tsx
{posts.length === 0 && !isLoading && (
  <EmptyState
    icon={Calendar}
    title="No events yet"
    description="Events you're interested in will appear here"
    action={{ label: "Explore events", onClick: () => navigate('/events') }}
  />
)}
```

### 10.3 Error States

**Missing error states:**

| View | Error Handling | Gap |
|------|---------------|-----|
| Feed | TanStack Query error (invisible) | No error banner or retry CTA |
| Events | Silent catch on fetch | No "Failed to load events" |
| Auth | Shows timeout after 10s | Good — only error state in app |
| Profile | Catch on fetch | Shows loading permanently |
| Search | Toast error | Toast dismisses, page stays blank |

---

## PART 11 — PROPS DRILLING & COMPONENT COUPLING

### 11.1 Props Drilling Examples

**App.tsx → Feed.tsx → FeedContent.tsx → PostCard.tsx**

```typescript
// App.tsx:453-458
<Feed
  conversations={conversations}
  onStartConversation={handleStartConversation}
  currentUser={currentUser}
  onViewPost={handleViewPost}
  isPaused={!isFeedTab || !!backgroundLocation}
/>

// Feed.tsx:342-344 (passes 11 props to FeedContent)
<FeedContent
  isLoading={isLoading}
  filteredPosts={filteredPosts}
  isRestoringScroll={isRestoringScroll}
  hasMore={hasMore}
  isLoadingMore={isLoadingMore}
  isPaused={isFeedPaused}
  currentUserId={currentUser?.id}
  onProfileClick={handleOpenUserProfile}
  onLike={onLikeId}
  onSave={onSaveId}
  onShare={onShareP}
  onMessage={onMessageU}
  ...(5 more)
/>

// FeedContent → PostCard (12 props)
<PostCard
  post={post}
  onLike={onLike}
  onSave={onSave}
  onShare={onShare}
  onProfileClick={onProfileClick}
  currentUserId={currentUserId}
  onMessage={onMessage}
  onUserBlocked={onUserBlocked}
  onDelete={onDelete}
  onEditCaption={onEditCaption}
  onViewPost={onViewPost}
  onViewComments={onViewComments}
  isPaused={isPaused}
/>
```

**Impact**: Changing any behavior in PostCard requires updating 3 parent components. Adding a feature to PostCard requires threading through 3 layers of props.

### 11.2 Tight Coupling to Supabase

Many components directly import and call `supabase`:

```typescript
// Feed.tsx:5
import { supabase } from '../utils/supabase/client';

// Feed.tsx:222-226
const { data: commentsData } = await supabase
  .from('post_comments')
  .select('*, user:profiles(*)')
  .eq('post_id', selectedPost.id)
  .order('created_at', { ascending: true });
```

This direct coupling means:
- Cannot test Feed.tsx without mocking the entire Supabase client
- Cannot reuse Feed.tsx with a different backend
- Database query logic is mixed with presentation logic

Similarly:
- `EventDetails.tsx:16`: imports `supabase` directly
- `Profile.tsx:5`: imports `supabase` directly
- `WalletModal.tsx:7`: imports `supabase` directly
- `AuthScreen.tsx:3`: imports `supabase` directly

---

## PART 12 — REACT PATTERN ISSUES

### 12.1 `window.prompt()` for Editing

```typescript
// PostCard.tsx:411
const nextCaption = window.prompt('Edit caption', post.content.text || '');
```

Using `window.prompt()` (a synchronous, browser-native dialog) is not a proper React pattern:
- Cannot be styled
- Blocks the main thread
- No form validation
- No undo/cancel properly handled
- Mobile browsers may not support it well

**Recommendation**: Use a modal with a controlled textarea.

### 12.2 `window.location.href` for Navigation

```typescript
// EventDetailModal.tsx:91
window.location.href = externalTicketingHref;
```

This performs a full page navigation instead of using React Router's `navigate()` — loses app state.

### 12.3 Custom Events for Cross-Component Communication

The app uses `window.dispatchEvent` and `window.addEventListener` as a communication bus:

| File | Event Name | Purpose |
|------|-----------|---------|
| `AuthContext.tsx:221` | `'profileUpdated'` | Notify profile changes |
| `Posts.ts:220` | `'postsUpdated'` | Notify post changes |
| `App.tsx:232-237` | `'video-play'` | Coordinate autoplay |
| `Events.ts:390` | `'liveStreamsUpdated'` | Notify stream status changes |
| `Feed.tsx:314` | `'savedPostsUpdated'` | Notify saved state changes |
| `Feed.tsx:343` | `'postsUpdated'` | Notify post deletion |

This is an anti-pattern. Custom events bypass React's data flow:
- Components listening to these events must manually manage cleanup (addEventListener/removeEventListener)
- Events are not type-checked
- It's impossible to trace data flow through custom events
- Events can be dispatched from anywhere, making debugging difficult

**Recommendation**: Use TanStack Query's `queryClient.invalidateQueries()` or Zustand actions for these notifications.

### 12.4 `useRef` for Component References

```typescript
// Feed.tsx:516-519
ref={(el) => {
  (feedScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  setFeedScrollContainer(el);
}}
```

This pattern of using both a ref AND state for the same element creates unnecessary re-renders (the `setFeedScrollContainer` call triggers a re-render). The ref should be sufficient with `useEffect` to observe changes.

### 12.5 Double `useEffect` for Same Data

```typescript
// Feed.tsx:188-209 AND Feed.tsx:219-247
// Both fetch comments for selectedPost
```

Two separate `useEffect` blocks fetch the same comments data for `selectedPost`:
- First effect (line 188): Triggers when `selectedPost` changes
- Second effect (line 219): Triggers when `selectedPost` changes AND checks if comments are empty

This should be a single effect with proper conditional logic.

---

## PART 13 — PATTERNS THAT SHOULD BE HOOKS

These behaviors are defined inline in components and should be extracted to custom hooks:

### 13.1 Network Connection Detection

```typescript
// PostCard.tsx:94-104
const connection = (navigator as any).connection;
if (connection) {
  const updateConnection = () => {
    setIsLowInternet(connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' || connection.saveData);
  };
  connection.addEventListener('change', updateConnection);
  updateConnection();
  return () => connection.removeEventListener('change', updateConnection);
}
```

**Recommendation**: `useNetworkStatus()` hook returning `{ isLowInternet, effectiveType, saveData }`.

### 13.2 Video Autoplay Manager

```typescript
// PostCard.tsx:230-295 (~65 lines of IntersectionObserver logic)
// Included in PostDetailPage, PostDetailModal, and anywhere with video
```

**Recommendation**: `useVideoAutoplay(videoRef, { isPaused, isLowInternet })` hook.

### 13.3 Fullscreen API

```typescript
// PostCard.tsx:115-145 (~30 lines with vendor prefix handling)
// Duplicated in spirit in PostDetailPage, PostDetailModal
```

**Recommendation**: `useFullscreen()` hook.

### 13.4 Haptic Feedback

```typescript
// PostCard.tsx:174-178
const triggerHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
};
```

**Recommendation**: `useHaptic()` hook.

---

## PART 14 — RECOMMENDATIONS

### 14.1 Immediate (Critical)

1. **Restore focus outlines**: Remove lines 672-679 from `globals.css`. Replace with a proper focus ring system using Tailwind's `focus-visible:ring-2` pattern.

2. **Re-enable shadows**: Remove or refactor lines 663-669 from `globals.css`. Fix whatever CSS issue caused this workaround.

3. **Consolidate `PostDetailPage` and `PostDetailModal`**: Extract shared content into `components/post/PostDetailView.tsx`. Both pages should use this as a child.

4. **Consolidate `WalletPage` and `WalletModal`**: Extract shared wallet logic into `components/wallet/WalletContent.tsx`.

5. **Extract `isVideo()` helper**: Move the duplicated regex to `src/utils/media.ts`.

### 14.2 Short-term (1-2 weeks)

6. **Split `CreateEvent.tsx`** (1,429 lines): Extract each form step into its own component under `create-event/`.

7. **Split `PostCard.tsx`** (896 lines): Extract into `PostCardHeader`, `PostMedia`, `PostVideoPlayer`, `PostActions`, `PostContent`.

8. **Create shared `EmptyState` component**: Reusable empty state with icon, title, description, optional action.

9. **Create `Button` design system**: Migrate all inline buttons to use `button.tsx` with proper variants.

10. **Replace `window.prompt()`**: Create a proper `EditCaptionModal` component.

11. **Replace custom events**: Use TanStack Query invalidation or Zustand actions instead of `window.dispatchEvent`.

### 14.3 Medium-term (1 month)

12. **Establish design tokens**: Move all hardcoded colors to CSS custom properties and Tailwind theme. Create a `tailwind.config.theme` with brand colors, spacing scale, typography.

13. **Create extractable hooks**: `useNetworkStatus`, `useVideoAutoplay`, `useFullscreen`, `useHaptic`, `useScrollRestore`.

14. **Add virtualization**: Use `@tanstack/react-virtual` for feed and event lists to limit DOM size.

15. **Add proper TypeScript types**: Replace all `any` with proper types. Create strict prop interfaces for all components.

16. **Add lint rules for accessibility**: `eslint-plugin-jsx-a11y` to enforce ARIA labels, focus management, color contrast.

### 14.4 Long-term

17. **Introduce Storybook**: Document all UI components with visual regression testing.

18. **Consider SSR/SSG**: Migrate to Next.js or Astro for better SEO and initial load performance.

19. **Implement proper error tracking**: Sentry or similar for production error monitoring.

20. **Build comprehensive E2E test suite**: Playwright for critical user journeys.

---

## PART 15 — FILE-BY-FILE LINE COUNT SUMMARY

```
src/
├── components/
│   ├── CreateEvent.tsx                             1,429
│   ├── EventDetails.tsx                            1,306
│   ├── SettingsModal.tsx                           1,088
│   ├── PostDetailPage.tsx                            974
│   ├── EventDetailModal.tsx                           957
│   ├── OrganizerSettingsModal.tsx                     898
│   ├── PostCard.tsx                                   896
│   ├── PostDetailModal.tsx                            892
│   ├── WalletModal.tsx                                695
│   ├── CreatePostPage.tsx                             675
│   ├── WalletPage.tsx                                 672
│   ├── AuthScreen.tsx                                 651
│   ├── Feed.tsx                                       642
│   ├── ChatDetail.tsx                                 628
│   ├── MediaViewer.tsx                                603
│   ├── Profile.tsx                                    583
│   ├── SimplifiedTicketModal.tsx                      510
│   ├── DashboardPage.tsx                              446
│   ├── PremiumSearchModal.tsx                         452
│   ├── OrganizerProfileSetupSimple.tsx                409
│   ├── ProfessionalDashboardModal.tsx                 388
│   ├── LiveSetupModal.tsx                             380
│   ├── MessagesPage.tsx                               332
│   ├── VirtualTicketPurchaseModal.tsx                 320
│   ├── TicketViewer.tsx                               318
│   ├── PostDetailWrapper.tsx                          305
│   ├── ProfileListPage.tsx                            297
│   ├── CommentsSheet.tsx                              294
│   ├── TicketScannerModal.tsx                         284
│   ├── ChatList.tsx                                   256
│   ├── LiveFeed.tsx                                   248
│   ├── FeedHeader.tsx                                 163
│   ├── LiveStreamPage.tsx                             139
│   ├── EventCard.tsx                                  136
│   ├── EventListModal.tsx                             136
│   ├── UserAvatar.tsx                                 141
│   ├── AuthCallbackPage.tsx                           140
│   ├── EventDetailWrapper.tsx                         129
│   ├── TicketListModal.tsx                            115
│   ├── ShareModal.tsx                                 108
│   ├── CreateEventWrapper.tsx                          87
│   ├── RouteErrorBoundary.tsx                          60
│   ├── ProfileModalWrapper.tsx                         35
│   ├── ErrorBoundary.tsx                              146
│   ├── SearchPage.tsx                                  51
│   │
│   ├── create-event/ (2 files)                       276
│   ├── dashboard/ (12 files)                          ~900
│   ├── desktop/ (2 files)                             214
│   ├── feed/ (5 files)                               ~873
│   ├── figma/ (1 file)                                147
│   ├── icons/ (1 file)                                 15
│   ├── legal/ (2 files)                               220
│   ├── live/ (3 files)                                398
│   ├── livestream/ (11 files)                       ~2,600
│   ├── profile/ (9 files)                           ~1,280
│   ├── settings/ (1 file)                               ?
│   ├── skeletons/ (1 file)                            539
│   ├── support/ (1 file)                              138
│   ├── tickets/ (1 file)                               37
│   └── ui/ (11 files)                               ~1,090
│
├── contexts/
│   ├── AuthContext.tsx                                 260
│   └── MessagingContext.tsx                            297
│
├── hooks/
│   ├── useFeedData.ts                                  222
│   ├── useProfileData.ts                               289
│   ├── useLiveFeedData.ts                              130
│   ├── useLocationPrefs.ts                             132
│   └── useFeedData.test.ts                              48
│
├── store/
│   └── profileStore.ts                                 121
│
├── App.tsx                                             705
├── main.tsx                                             67
├── queryClient.ts                                       15
├── queryKeys.ts                                         28
└── types.ts                                            (1467 auto-generated)
```

---

**Total frontend source (src/): ~52,500 lines across 100+ files.**

**Actionable takeaway**: 8 files account for 8,817 lines (17% of the codebase) and contain the most critical maintainability issues. Refactoring these 8 files will yield the highest ROI for code quality.
