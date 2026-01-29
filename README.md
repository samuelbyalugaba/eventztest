# EVENTZ — Progressive Web App

EVENTZ is a modern, real‑time social events platform built as a Progressive Web App. It brings together event discovery, organizer tools, rich social feeds, messaging, live streaming, and tickets — all optimized for mobile‑first use with a responsive, animated UI.

## Highlights

- Real‑time messaging with online presence and read receipts
- Social feed with rich media, videos, carousels, likes, comments, shares
- Event browsing, saving, reminders, and ticket management
- Organizer workflows: become organizer, set up profile, create/edit events, dashboard
- Live streaming experiences and a full‑screen video player UX
- Notifications, follows, mutual friends, and advanced search
- Local avatar initials fallback with consistent, clean UI components

## Core Features

### Authentication & Profiles
- Supabase Auth integration with a friendly Auth screen.
- User profiles: username, full name, avatar, bio, location, verification badge.
- Avatar fallback: if no photo is uploaded, displays user initials via a local `UserAvatar` component.
- Organizer profiles: dedicated setup, organizer type, cover, social links.

### Social Graph & Discovery
- Follow/unfollow users with notifications for new followers.
- Mutual follows logic (friends) used to surface online users for chat.
- Search people and messages; premium/advanced search modal available.
- Trending/recommended filters to discover content and organizers.

### Feed & Posts
- Rich posts with text, single image, or image carousels.
- Video highlights with a full‑screen player:
  - Swipe between clips
  - Double‑tap rewind/forward
  - Tap areas for previous/next clip
  - Animated controls and visual feedback
- Interactions:
  - Like/unlike with counts and subtle “thumbs up” animations
  - Comment with threaded UI
  - Share and save/bookmark posts
- Hashtags, views, and highlight aggregations where available.
- Full‑screen image viewer with swipe gestures.
- Notifications panel: reads, types, and live updates.

### Messaging
- One‑to‑one conversations with real‑time updates via Supabase Realtime.
- Online presence tracking (friends = mutual follows).
- Chat list:
  - Search conversations or start a new chat
  - Online friends carousel
  - Unread counters and last message previews
  - Delete conversation (safe cascade deletes messages first)
- Chat detail:
  - Clean header with avatar, username, full name, and online status
  - Functional menu: View Profile, Block (placeholder)
  - Real‑time message delivery and read receipts
  - Keyboard “Enter to send”, debounce‑free input
  - Local optimistic UI for sending

### Events
- Browse published events with details, date/time, location, and organizer info.
- Save events and toggle reminders.
- Organizer events view and editing for event lifecycle.
- Storage-backed image uploads for events with robust bucket fallback logic.

### Tickets
- Ticket purchase flow (data model and storage integration).
- View purchased tickets associated with user account.

### Live Streaming
- Live feed surface with real‑time updates and badges.
- Integrated full‑screen player UX consistent with Feed’s highlight player.

### Notifications
- Real‑time subscription to notification changes per user.
- Mark notifications as read, with categorized icons and visuals.

### Real‑Time & Presence
- Supabase Realtime channels for:
  - Messages in conversations
  - Online presence tracking
  - Saved events subscriptions
  - Notifications
- Optimistic UI updates with graceful error recovery.

### Media & Storage
- Supabase Storage for events, avatars, posts.
- Smart fallback between buckets to survive RLS/bucket configuration differences.
- Public URLs used consistently across the app.

## UI/UX
- TailwindCSS‑styled, mobile‑first components with subtle animations.
- Lucide icons for crisp, lightweight visuals.
- Sonner toasts for status feedback.
- Clean header bars, sticky input areas, and gesture‑friendly media players.

## Tech Stack
- Frontend: React + TypeScript
- Styling: TailwindCSS
- Icons: Lucide
- Notifications/Toasts: Sonner
- Backend/Data: Supabase (Auth, Database, Storage, Realtime)

## Key Modules

- App shell and navigation: `src/App.tsx`
- Feed and social surfaces: `src/components/Feed.tsx`
- Messaging:
  - Chat list: `src/components/ChatList.tsx`
  - Chat detail: `src/components/ChatDetail.tsx`
  - Avatar fallback: `src/components/UserAvatar.tsx`
- Events & tickets:
  - Event details: `src/components/EventDetails.tsx`
  - Organizer dashboard: `src/components/OrganizerDashboard.tsx`
  - Create/Edit event: `src/components/CreateEvent.tsx`
  - Tickets: Supabase API functions and `src/types.ts`
- Auth & profile:
  - Auth screen: `src/components/AuthScreen.tsx`
  - Profile page: `src/components/Profile.tsx`
  - Organizer setup: `src/components/OrganizerProfileSetup.tsx`
- Live streaming: `src/components/LiveFeed.tsx`
- Shared API utilities: `src/utils/supabase/api.ts`
  - Messaging, presence, notifications, follows, posts, events, tickets, storage uploads

## Data Models (Simplified)
- Conversation, Message, PurchasedTicket, Event, Profile, Post (see `src/types.ts` and API functions for exact fields).

## Running Locally

1. Install dependencies:
   - `npm i`
2. Start development server:
   - `npm run dev`
3. Configure environment:
   - Ensure Supabase project keys and URL are correctly set in the app’s environment.

## Development Notes
- Real‑time features require a live Supabase instance with Realtime enabled.
- Presence and subscriptions depend on channel names; ensure channel permissions are set.
- Storage buckets: `events`, `avatars`, `posts` with public read; app includes fallback logic across buckets.
- Some actions like “Block User” are placeholders for future moderation features.

## Contributing
- Open issues for bugs or feature requests.
- Follow the existing component patterns and TypeScript typings.
- Keep secrets out of source control and avoid logging sensitive data.
