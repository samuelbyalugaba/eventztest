# System Architecture — Eventz

**Last Updated:** August 2026

---

## Overview

Eventz uses a **hybrid architecture** where a custom Node.js/Express backend handles authentication, API logic, and real-time communication, while Supabase provides managed PostgreSQL database and storage services.

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
│                  CUSTOM BACKEND (Railway)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │   API    │  │WebSocket │  │  Jobs    │   │
│  │ (JWT)    │  │ Routes   │  │ (Realtime)│  │ (BullMQ) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                     SUPABASE                                │
│  ┌──────────┐  ┌──────────┐                                │
│  │PostgreSQL│  │ Storage  │                                │
│  │ (RLS)    │  │ (Images) │                                │
│  └──────────┘  └──────────┘                                │
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
| Backend | Node.js/Express | API, Auth, Logic |
| Cache | Redis | Sessions, caching, pub/sub |
| Database | PostgreSQL 14 (Supabase) | Relational data |
| Storage | Supabase Storage | Images, videos |
| Streaming | Agora RTC + Cloudflare Stream | Live + VOD |
| Payments | nTZS (mobile money) | Tanzania payments |
| Email | Resend | Transactional email |
| Monitoring | Sentry | Error tracking |
| Hosting | Vercel (frontend) + Railway (backend) | Deployment |
| Mobile | Capacitor 8 | Native Android/iOS |
| PWA | Service Worker + manifest | Offline, installable |

## Data Flow Patterns

### Frontend → Backend → Database (All Operations)
```
Client → Backend API → PostgreSQL (via Knex.js)
```
Used for: All data operations — reading events, posts, profiles, sending messages, etc.

### Backend → Storage (File Operations)
```
Client → Backend API → Supabase Storage
```
Used for: File uploads, downloads, image optimization

### WebSocket (Real-time)
```
Client → WebSocket → Backend → Redis Pub/Sub
```
Used for: Messages, notifications, presence, live stream events

### External API Calls
```
Backend → External APIs (nTZS, Cloudflare, Agora, Resend)
```
Used for: Payments, streaming, email delivery

## Key Architectural Decisions

1. **Custom backend over BaaS** — Full control over auth, logic, and real-time
2. **Supabase for DB + Storage** — Managed services, connection pooling, CDN
3. **Backend middleware for auth** — JWT validation, role-based access
4. **TanStack Query for server state** — Automatic caching, retry, and refetching
5. **Zustand for client state** — Persisted profile store with PII stripping

## Current Limitations

- **No backend caching layer** — Can add Redis for caching
- **No message queue** — Can add BullMQ for background jobs
- **WebSocket not yet implemented** — Currently using Supabase Realtime (temporary)
- **Edge Functions not yet migrated** — 13 functions to migrate to backend

## Migration Path

See [MIGRATION_PLAN.md](../MIGRATION_PLAN.md) and [TARGET_ARCHITECTURE.md](../TARGET_ARCHITECTURE.md) for the planned migration:

- Phase 1: Backend foundation ✅
- Phase 2: Auth migration (in progress)
- Phase 3: API migration
- Phase 4: Real-time migration
- Phase 5: Edge Function migration
- Phase 6: Storage & cleanup
