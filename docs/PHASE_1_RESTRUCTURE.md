# Phase 1 Restructure Guide — Eventz

**Version:** 2.0  
**Status:** Active  
**Last Updated:** August 2026

---

## Purpose

This document provides the step-by-step guide for restructuring the Eventz codebase from its current flat structure into a domain-driven architecture while keeping Supabase as the database and storage provider.

**This is Phase 0 of the migration plan — no infrastructure changes, just code organization.**

---

## Architecture Context

Eventz uses a **hybrid architecture**:
- **Frontend**: React SPA + Vite (application) + Next.js (marketing)
- **Backend**: Node.js/Express on Railway
- **Database**: PostgreSQL on Supabase (managed)
- **Storage**: Supabase Storage (managed)

Frontend talks to the custom backend, NOT directly to Supabase.

---

## Current Structure

```
src/
├── App.tsx                          # Root component (297 lines)
├── main.tsx                         # Entry point
├── types.ts                         # All types (111 lines)
├── queryClient.ts                   # TanStack Query config
├── queryKeys.ts                     # Query key factory
├── components/                      # 76 files, mixed concerns
│   ├── app/                         # App shell
│   ├── auth/                        # Auth components
│   ├── chat/                        # Chat components
│   ├── create-event/                # Event creation
│   ├── create-post/                 # Post creation
│   ├── dashboard/                   # Organizer dashboard
│   ├── desktop/                     # Desktop layout
│   ├── event-detail/                # Event detail
│   ├── event-details/               # Event detail (duplicate?)
│   ├── feed/                        # Feed components
│   ├── live/                        # Live streaming
│   ├── livestream/                  # Live streaming (duplicate?)
│   ├── post-card/                   # Post card
│   ├── post-detail/                 # Post detail
│   ├── profile/                     # Profile
│   ├── tickets/                     # Tickets
│   ├── ui/                          # Shared UI primitives
│   ├── wallet/                      # Wallet
│   └── ... (76 total)
├── hooks/                           # 52 custom hooks
│   ├── useFeedData.ts
│   ├── useEventForm.ts
│   ├── useChatMessages.ts
│   └── ... (52 total)
├── contexts/                        # React contexts
│   ├── AuthContext.tsx
│   ├── MessagingContext.tsx
│   └── ReportReasonContext.tsx
├── store/                           # Zustand stores
│   └── profileStore.ts
├── utils/                           # Utilities
│   └── supabase/
│       ├── client.tsx               # Supabase client
│       └── api/                     # 19 API modules
│           ├── auth.ts
│           ├── events.ts
│           ├── tickets.ts
│           ├── conversations.ts
│           └── ... (19 total)
└── integrations/
    └── supabase/                    # Auto-generated types
```

**Problems:**
- 76 component files with mixed concerns
- No clear domain boundaries
- Duplicate folders (event-detail vs event-details, live vs livestream)
- Types spread across files
- Hooks mixed across domains

---

## Target Structure

```
src/
├── App.tsx
├── main.tsx
├── queryClient.ts
├── queryKeys.ts
│
├── domains/
│   ├── identity/
│   │   ├── api/
│   │   │   ├── auth.ts
│   │   │   ├── profile.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── AuthScreen.tsx
│   │   │   ├── AuthCallbackPage.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── ProfileModalWrapper.tsx
│   │   │   ├── OrganizerProfileSetupSimple.tsx
│   │   │   ├── OrganizerSettingsModal.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useProfileData.ts
│   │   │   ├── useAuth.ts
│   │   │   └── index.ts
│   │   ├── types.ts
│   │   ├── context.tsx              # AuthContext
│   │   └── index.ts
│   │
│   ├── events/
│   │   ├── api/
│   │   │   ├── events.ts
│   │   │   ├── saved.ts
│   │   │   ├── search.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventDetails.tsx
│   │   │   ├── EventDetailModal.tsx
│   │   │   ├── EventDetailWrapper.tsx
│   │   │   ├── EventListModal.tsx
│   │   │   ├── CreateEvent.tsx
│   │   │   ├── CreateEventWrapper.tsx
│   │   │   ├── EditCaptionModal.tsx
│   │   │   ├── event-detail/
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useEventForm.ts
│   │   │   └── index.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── tickets/
│   │   ├── api/
│   │   │   ├── tickets.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── SimplifiedTicketModal.tsx
│   │   │   ├── TicketListModal.tsx
│   │   │   ├── TicketScannerModal.tsx
│   │   │   ├── TicketViewer.tsx
│   │   │   ├── VirtualTicketPurchaseModal.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── messaging/
│   │   ├── api/
│   │   │   ├── conversations.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── ChatDetail.tsx
│   │   │   ├── ChatList.tsx
│   │   │   ├── MessagesPage.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useChatMessages.ts
│   │   │   └── index.ts
│   │   ├── context.tsx              # MessagingContext
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── payments/
│   │   ├── api/
│   │   │   ├── transactions.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── WalletModal.tsx
│   │   │   ├── WalletPage.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useWalletData.ts
│   │   │   └── index.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── streaming/
│   │   ├── api/
│   │   │   ├── events.ts           # Streaming-related event functions
│   │   │   ├── streamChat.ts
│   │   │   ├── streams.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── LiveFeed.tsx
│   │   │   ├── LiveSetupModal.tsx
│   │   │   ├── LiveStreamPage.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useAgoraBroadcast.ts
│   │   │   ├── useCamera.ts
│   │   │   ├── useViewer*.ts
│   │   │   ├── useStream*.ts
│   │   │   └── index.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── notifications/
│   │   ├── api/
│   │   │   ├── notifications.ts
│   │   │   └── index.ts
│   │   ├── components/             # Notification components
│   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── social/
│   │   ├── api/
│   │   │   ├── follows.ts
│   │   │   └── index.ts
│   │   ├── components/             # Follow, presence components
│   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── media/
│   │   ├── api/
│   │   │   ├── storage.ts
│   │   │   ├── userMedia.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── MediaViewer.tsx
│   │   │   ├── media-viewer/
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── moderation/
│   │   ├── api/
│   │   │   ├── moderation.ts
│   │   │   └── index.ts
│   │   ├── components/             # Report, block components
│   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── context.tsx             # ReportReasonContext
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   └── feed/
│       ├── api/
│       │   ├── posts.ts
│       │   └── index.ts
│       ├── components/
│       │   ├── Feed.tsx
│       │   ├── FeedHeader.tsx
│       │   ├── CommentsSheet.tsx
│       │   ├── ShareModal.tsx
│       │   ├── CreatePostPage.tsx
│       │   ├── create-post/
│       │   ├── post-card/
│       │   ├── post-detail/
│       │   └── index.ts
│       ├── hooks/
│       │   ├── useFeedData.ts
│       │   ├── usePostCreation.ts
│       │   └── index.ts
│       ├── types.ts
│       └── index.ts
│
├── shared/
│   ├── api/
│   │   ├── client.ts               # Supabase client
│   │   └── index.ts
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── OfflineBanner.tsx
│   │   ├── UserAvatar.tsx
│   │   └── ... (shared UI primitives)
│   ├── utils/
│   │   ├── format.ts
│   │   ├── imageOptimize.ts
│   │   ├── media.ts
│   │   ├── share.ts
│   │   ├── categories.ts
│   │   ├── currencies.ts
│   │   ├── locations.ts
│   │   ├── nominatim.ts
│   │   └── ...
│   ├── hooks/
│   │   └── ... (shared hooks)
│   ├── types/
│   │   └── ... (shared types)
│   └── index.ts
│
├── infrastructure/
│   ├── auth/
│   │   └── AuthProvider.tsx         # Auth wrapper
│   ├── storage/
│   │   └── storage.ts               # Storage abstraction
│   ├── realtime/
│   │   └── realtime.ts              # Realtime abstraction
│   └── monitoring/
│       └── sentry.ts                # Sentry config
│
├── app/                             # App shell (keep minimal)
│   ├── AppRoutes.tsx
│   ├── BottomNav.tsx
│   ├── KeepAliveTabs.tsx
│   ├── LoadingScreen.tsx
│   └── UnauthenticatedApp.tsx
│
├── desktop/                         # Desktop-specific
│   ├── DesktopSidebar.tsx
│   └── RightRail.tsx
│
├── legal/                           # Legal pages
│   ├── PrivacyPage.tsx
│   ├── TermsPage.tsx
│   └── DeleteAccountPage.tsx
│
├── settings/                        # Settings
│   └── SettingsModal.tsx
│
├── support/                         # Support
│   └── SupportPage.tsx
│
├── dashboard/                       # Dashboard
│   └── DashboardPage.tsx
│
├── search/                          # Search
│   ├── SearchPage.tsx
│   ├── premium-search/
│   └── PremiumSearchModal.tsx
│
├── skeleton/                        # Loading skeletons
│   └── ...
│
└── figma/                           # Figma exports
    └── ...
```

---

## Migration Steps

### Step 1: Create Domain Folders (Day 1)

```bash
mkdir -p src/domains/{identity,events,tickets,messaging,payments,streaming,notifications,social,media,moderation,feed}
```

### Step 2: Create Domain Types (Day 1-2)

Move types from `src/types.ts` into domain-specific `types.ts` files.

**Identity Domain:**
```typescript
// src/domains/identity/types.ts
export interface Profile {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  isVerified: boolean;
  isOrganizer: boolean;
}

export interface OrganizerProfile {
  id: string;
  userId: string;
  organizerType: string;
  coverUrl: string | null;
  socialLinks: Record<string, string>;
}
```

**Events Domain:**
```typescript
// src/domains/events/types.ts
export interface Event {
  id: number;
  organizerId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  city?: string;
  category: string;
  subcategory: string;
  price?: string;
  priceRange: string;
  imageUrl: string;
  attendees?: number;
  views?: number;
  status?: 'published' | 'draft' | 'cancelled';
  streaming?: EventStreaming;
  ticketTiers?: TicketTier[];
  organizer?: Profile;
  isSaved?: boolean;
  hasReminder?: boolean;
}

export interface EventStreaming {
  available: boolean;
  quality: 'HD' | '4K' | 'SD';
  isLive?: boolean;
  liveViewers?: number;
  replayAvailable?: boolean;
  playbackUrl?: string;
}

export interface TicketTier {
  name: string;
  price: string;
  priceNumeric: number;
  available: number;
  features: string[];
  color?: string;
}
```

### Step 3: Move API Modules (Day 2-3)

Move API files from `src/utils/supabase/api/` into domain folders.

```bash
# Identity
mv src/utils/supabase/api/auth.ts src/domains/identity/api/
mv src/utils/supabase/api/profile.ts src/domains/identity/api/

# Events
mv src/utils/supabase/api/events.ts src/domains/events/api/
mv src/utils/supabase/api/saved.ts src/domains/events/api/
mv src/utils/supabase/api/search.ts src/domains/events/api/

# Tickets
mv src/utils/supabase/api/tickets.ts src/domains/tickets/api/

# Messaging
mv src/utils/supabase/api/conversations.ts src/domains/messaging/api/

# Payments
mv src/utils/supabase/api/transactions.ts src/domains/payments/api/

# Streaming
mv src/utils/supabase/api/streamChat.ts src/domains/streaming/api/
mv src/utils/supabase/api/streams.ts src/domains/streaming/api/

# Notifications
mv src/utils/supabase/api/notifications.ts src/domains/notifications/api/

# Social
mv src/utils/supabase/api/follows.ts src/domains/social/api/

# Media
mv src/utils/supabase/api/storage.ts src/domains/media/api/
mv src/utils/supabase/api/userMedia.ts src/domains/media/api/

# Moderation
mv src/utils/supabase/api/moderation.ts src/domains/moderation/api/

# Feed
mv src/utils/supabase/api/posts.ts src/domains/feed/api/
```

### Step 4: Create Domain Index Files (Day 3)

Each domain needs an `index.ts` that exports its public API.

```typescript
// src/domains/events/index.ts
export { EventCard } from './components/EventCard';
export { EventDetails } from './components/EventDetails';
export { useEvent } from './hooks/useEvent';
export type { Event, EventStreaming, TicketTier } from './types';
```

### Step 5: Move Components (Day 4-7)

Move component files into their respective domain folders. Use the component mapping in the target structure above.

### Step 6: Move Hooks (Day 7-8)

Move hooks into their respective domain folders.

### Step 7: Update Imports (Day 8-12)

This is the most tedious step. Update all imports across the codebase.

**Before:**
```typescript
import { getEvents } from '../utils/supabase/api';
import { EventCard } from '../components/EventCard';
```

**After:**
```typescript
import { getEvents } from '../../domains/events/api';
import { EventCard } from '../../domains/events/components/EventCard';
```

### Step 8: Update Query Keys (Day 12-13)

Update `src/queryKeys.ts` to use domain-organized keys.

```typescript
export const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (filters?: EventFilters) => ['events', 'list', filters] as const,
    detail: (id: number) => ['events', 'detail', id] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    user: (userId: string) => ['tickets', 'user', userId] as const,
  },
  // ...
};
```

### Step 9: Write Domain Tests (Day 13-15)

Write tests for each domain's API functions and hooks.

### Step 10: Update Documentation (Day 15)

Update all documentation to reflect the new structure.

---

## Verification Checklist

After restructuring, verify:

- [ ] All imports resolve correctly
- [ ] No domain imports from another domain
- [ ] All tests pass
- [ ] TypeScript compiles without errors
- [ ] Build succeeds
- [ ] App runs without errors
- [ ] All features work as before
- [ ] Documentation updated
