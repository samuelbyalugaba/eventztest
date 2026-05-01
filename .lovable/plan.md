## Goal

Add a dedicated **desktop layout** (≥`lg`, 1024px+) for Eventz while keeping the current mobile experience pixel-identical at smaller breakpoints. Today, every page is just a narrow centered column (`max-w-2xl` / `max-w-4xl`) with the bottom tab bar — desktop users see a giant phone in the middle of the screen.

## Design direction

A clean, editorial 3-zone layout consistent with the existing minimal aesthetic (off-white #FAFAFA, #1A1A1A text, #8A2BE2 strictly as accent, soft shadows, rounded 0.75rem, glassmorphism). No gradients, no large color blocks.

```text
┌──────────────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌────────────────────────────┐  ┌──────────────────┐ │
│  │  LEFT    │  │       MAIN CONTENT         │  │   RIGHT RAIL     │ │
│  │ SIDEBAR  │  │                            │  │                  │ │
│  │          │  │ Feed: 1-col centered card  │  │ - Search         │ │
│  │ Logo     │  │ Events: 2-3 col grid       │  │ - Trending       │ │
│  │ Events   │  │ Live:   2-3 col grid       │  │ - Suggested orgs │ │
│  │ Live●    │  │ Profile: header + grid     │  │ - Upcoming you   │ │
│  │ Feed     │  │                            │  │   bought         │ │
│  │ Profile  │  │                            │  │ (route-aware)    │ │
│  │          │  │                            │  │                  │ │
│  │ + Create │  │                            │  │                  │ │
│  │ Avatar▾  │  │                            │  │                  │ │
│  └──────────┘  └────────────────────────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
   ~256px              fluid (max ~720px)              ~340px
```

Breakpoints:
- `< lg` (≤1023px) — current mobile/tablet layout, **unchanged**
- `lg` (1024–1279px) — sidebar + main, no right rail
- `xl+` (1280px+) — sidebar + main + right rail

## Scope of changes

### 1. New shell components (`src/components/desktop/`)
- `DesktopShell.tsx` — wraps the authenticated app at `lg+`, renders `DesktopSidebar`, `<main>` slot, and conditional `RightRail`. Visible only via `hidden lg:flex`.
- `DesktopSidebar.tsx` — sticky left nav: logo, the 4 tab links (Events / Live / Feed / Profile) as full-width pill items with icon + label, "Create" primary button, current-user avatar + menu (logout, settings) at the bottom. Live red dot when `hasLiveEvents`.
- `RightRail.tsx` — sticky right column. Contents change per route:
  - Events / Live: search box + trending events + suggested organizers
  - Feed: search box + suggested users to follow + your upcoming events
  - Profile: search box + mutual events / quick actions
- `DesktopTopBar.tsx` (optional, lightweight) — page title + contextual actions inside main column.

### 2. `src/App.tsx`
- Hide the bottom `<nav>` at `lg+` (`lg:hidden`) instead of removing it on mobile.
- Wrap the existing tab-views + Routes block in a responsive container:
  - Mobile: existing `max-w-7xl mx-auto pb-20` (untouched).
  - Desktop (`lg+`): grid `grid-cols-[256px_minmax(0,1fr)] xl:grid-cols-[256px_minmax(0,1fr)_340px]` with `DesktopSidebar` + main + `RightRail`.
- The four keep-alive tab `<div>`s stay; they just render inside the new main column on desktop.

### 3. Content components — widen on desktop only
Minimal, additive Tailwind class changes (no logic/UI restructure):
- `src/components/Feed.tsx` — keep `max-w-2xl` (a single feed column reads better on desktop too, Twitter/IG style). No change needed beyond removing extra horizontal padding at `lg+`.
- `src/components/EventDetails.tsx` (events list view) — switch the events list from a vertical stack to `grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6` at `lg+`. Existing `EventCard` already works in a grid.
- `src/components/LiveFeed.tsx` — same grid treatment for the live cards at `lg+`; keep the single-column stack on mobile.
- `src/components/Profile.tsx` — at `lg+`, render the profile header full-width and the posts/highlights/tickets as a 2- or 3-column grid instead of the current vertical list.

All changes use `lg:` / `xl:` prefixes only — mobile classes are untouched.

### 4. Modal pages on desktop
`PostDetailModal`, `EventDetailModal`, `ProfileModalWrapper` — center as a true modal sheet (max-width ~640–960px, rounded, max-height 90vh, backdrop blur) at `lg+`. Mobile keeps the current full-screen sheet behavior.

### 5. Design tokens
No new colors. Reuse existing tokens. Add two utility classes in `src/index.css` if helpful:
- `.desktop-sidebar-link` (active vs idle states with #8A2BE2 accent on the active pill's left edge, not a full purple block)
- `.desktop-card-hover` (subtle lift: `hover:-translate-y-0.5 hover:shadow-md transition`)

## Out of scope
- No changes to data fetching, routing logic, scroll restoration, auth, or any business logic.
- No redesign of individual cards (`PostCard`, `EventCard`) — they already look good; we only re-arrange them on desktop.
- No mobile visual changes whatsoever.

## Files to create
- `src/components/desktop/DesktopShell.tsx`
- `src/components/desktop/DesktopSidebar.tsx`
- `src/components/desktop/RightRail.tsx`

## Files to edit
- `src/App.tsx` — wrap content in `DesktopShell` at `lg+`, hide bottom nav at `lg+`.
- `src/components/Feed.tsx` — minor padding tweak at `lg+`.
- `src/components/EventDetails.tsx` — grid layout for events list at `lg+`.
- `src/components/LiveFeed.tsx` — grid layout at `lg+`.
- `src/components/Profile.tsx` — grid layout for tabs content at `lg+`.
- `src/components/PostDetailModal.tsx`, `src/components/EventDetailModal.tsx`, `src/components/ProfileModalWrapper.tsx` — centered modal styling at `lg+`.
- `src/index.css` — 2 small utility classes.

## QA checklist
- 390×844 (mobile): pixel-identical to today.
- 768×1024 (tablet): still mobile layout (we use `lg` = 1024).
- 1280×800 (desktop): sidebar + main + right rail visible, bottom nav hidden.
- 1920×1080: comfortable max widths, no stretched cards.
- All 4 tabs + post/event/profile modals tested at desktop breakpoint.
