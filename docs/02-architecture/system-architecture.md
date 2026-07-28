# System Architecture — Eventz

**Last Updated:** July 2026

---

## Overview

Eventz is a **React SPA** backed by **Supabase** (Backend-as-a-Service). The frontend talks directly to Supabase via the JavaScript SDK, with Supabase Edge Functions handling server-side logic that requires elevated permissions.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   PWA    │  │ Android  │  │   iOS    │  │ Desktop  │   │
│  │ (Vite)   │  │(Capacitor)│  │(Capacitor)│  │ (Browser)│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └──────────────┴──────────────┴──────────────┘        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────┴──────────────────────────────────┐
│                     SUPABASE                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │PostgreSQL│  │ Storage  │  │ Realtime │   │
│  │ (JWT)    │  │ (RLS)    │  │ (Images) │  │ (WS)     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Edge Functions (Deno)                    │  │
│  │  agora-rtc-token · send-email · ntzs-proxy · ...     │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                   EXTERNAL SERVICES                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Agora   │  │Cloudflare│  │   nTZS   │  │  Sentry  │   │
│  │ (Stream) │  │ (VOD/CDN)│  │(Payments)│  │(Monitoring)│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐                                │
│  │  Resend  │  │ Vercel   │                                │
│  │ (Email)  │  │ (Hosting)│                                │
│  └──────────┘  └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18, TypeScript, Vite | SPA with hot reload |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| State | Zustand + TanStack Query | Client + server state |
| UI | Radix UI primitives | Accessible components |
| Routing | react-router-dom v6 | Client-side routing |
| Backend | Supabase | Auth, DB, Storage, Realtime, Functions |
| Database | PostgreSQL 14 | Relational data |
| Streaming | Agora RTC + Cloudflare Stream | Live + VOD |
| Payments | nTZS (mobile money) | Tanzania payments |
| Email | Resend | Transactional email |
| Monitoring | Sentry | Error tracking |
| Hosting | Vercel | SPA deployment |
| Mobile | Capacitor 8 | Native Android/iOS |
| PWA | Service Worker + manifest | Offline, installable |

## Data Flow Patterns

### Direct Client → Supabase (Most Operations)
```
Client → Supabase JS SDK → PostgreSQL (RLS enforced)
```
Used for: reading events, posts, profiles, sending messages, notifications

### Edge Function (Elevated Permissions)
```
Client → Edge Function (SERVICE_ROLE_KEY) → PostgreSQL
```
Used for: payment processing, account deletion, email sending, token generation

### Real-time Subscription
```
Client → WebSocket → Supabase Realtime → PostgreSQL changes
```
Used for: messages, notifications, presence, live stream events

## Key Architectural Decisions

1. **BaaS over custom backend** — Supabase handles auth, DB, storage, and realtime, reducing backend code by ~80%
2. **Direct client queries** — Most data access goes directly from client to PostgreSQL via RLS
3. **Edge Functions for sensitive operations** — Payment, deletion, and email functions use SERVICE_ROLE_KEY
4. **TanStack Query for server state** — Automatic caching, retry, and refetching
5. **Zustand for client state** — Persisted profile store with PII stripping

## Current Limitations

- **No backend caching layer** — Every query hits PostgreSQL directly
- **No message queue** — Background jobs run in Edge Functions (cold starts)
- **No CDN for API responses** — Only static assets cached by Vercel/Cloudflare
- **Global Realtime subscriptions** — Scalability concern at high concurrency

## Migration Path

See [MIGRATION_PLAN.md](../MIGRATION_PLAN.md) and [TARGET_ARCHITECTURE.md](../TARGET_ARCHITECTURE.md) for the planned migration to:

- React SPA for application + Next.js for marketing (hybrid frontend)
- Redis for caching and queues
- BullMQ for background jobs
- Self-hosted PostgreSQL with read replicas
- Kafka for event streaming
- Kubernetes for orchestration
