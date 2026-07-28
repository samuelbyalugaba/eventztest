# Product Requirements Document — Eventz

**Last Updated:** July 2026

---

## Feature Matrix

| Feature | Status | Priority | Description |
|---|---|---|---|
| **Authentication** | Implemented | P0 | Email/password, Google OAuth, Apple Sign-In, magic links |
| **User Profiles** | Implemented | P0 | Username, avatar, bio, location, verification badge |
| **Organizer Profiles** | Implemented | P1 | Dedicated organizer setup, cover photo, social links |
| **Social Feed** | Implemented | P0 | Rich posts with text, images, carousels, video highlights |
| **Post Interactions** | Implemented | P0 | Like, comment, share, save/bookmark |
| **Event Browsing** | Implemented | P0 | Browse events with details, date, location, organizer |
| **Event Creation** | Implemented | P0 | Create/edit events with image uploads |
| **Event Saving** | Implemented | P1 | Save events, toggle reminders |
| **Ticket Purchase** | Implemented | P0 | Mobile money (nTZS) ticket purchasing |
| **Ticket Scanning** | Implemented | P1 | QR code scanning for event check-in |
| **Real-time Messaging** | Implemented | P0 | One-to-one conversations with presence |
| **Live Streaming** | Implemented | P1 | Agora RTC broadcasting, Cloudflare Stream VOD |
| **Live Stream Chat** | Implemented | P1 | Real-time chat during live streams |
| **Notifications** | Implemented | P0 | In-app notifications, push notifications |
| **Search** | Implemented | P1 | Search people, events, posts with trending |
| **Wallet** | Implemented | P1 | nTZS wallet balance, transactions |
| **Virtual Gifts** | Implemented | P2 | Send virtual gifts via wallet |
| **Organizer Dashboard** | Implemented | P1 | Events, analytics, notifications, payouts |
| **PWA** | Implemented | P0 | Service worker, manifest, offline support |
| **Native Mobile** | Implemented | P1 | Capacitor Android/iOS builds |
| **Desktop Layout** | Implemented | P2 | Sidebar, right rail for desktop view |
| **Content Moderation** | Implemented | P2 | Report, block/unblock users |
| **Email System** | Implemented | P1 | Transactional emails via Resend |
| **Recommendations** | Planned | P2 | Personalized event/post recommendations |
| **Event Analytics** | Planned | P2 | Detailed analytics for organizers |
| **Sponsorship** | Planned | P3 | Brand presence and event promotion |
| **Multi-language** | Planned | P3 | Swahili, English, French |
| **Stripe Payments** | Planned | P2 | International payment support |

## Non-Functional Requirements

### Performance
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3.0s
- Bundle size: < 500KB gzipped (initial chunk)

### Security
- All data encrypted in transit (TLS 1.3)
- Supabase RLS policies on all tables
- JWT-based authentication with secure token refresh
- No secrets in client-side code
- CSRF and XSS protection

### Accessibility
- WCAG 2.1 AA compliance target
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios meet standards

### Scalability
- Support 10,000+ concurrent users (current architecture)
- Horizontal scaling path to 100K+ (see `TheArchitecture.md`)
- Database connection pooling via Supabase PgBouncer

### Reliability
- 99.9% uptime target
- Offline fallback for core features
- Optimistic UI updates with error recovery
- Automatic retry for failed network requests

## User Stories

### Attendee
- As an attendee, I want to discover events near me so I can find things to do
- As an attendee, I want to buy tickets with mobile money so I don't need a credit card
- As an attendee, I want to watch live streams so I can attend remotely
- As an attendee, I want to chat with friends about events we're attending

### Organizer
- As an organizer, I want to create events quickly so I can focus on my event
- As an organizer, I want to sell tickets online so I can reach more attendees
- As an organizer, I want to see analytics so I understand my audience
- As an organizer, I want to go live so remote attendees can watch

### Admin
- As an admin, I want to moderate content so the platform stays safe
- As an admin, I want to manage users so I can handle reports and violations
