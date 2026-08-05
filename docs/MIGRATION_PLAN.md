# Migration Plan — Eventz: Hybrid Architecture

**Version:** 2.0  
**Status:** Active  
**Last Updated:** August 2026

---

## Executive Summary

This document defines the phased migration from Eventz's current architecture (React SPA + Supabase BaaS) to a **hybrid architecture** where Supabase provides database and storage services, while a custom Node.js/Express backend handles authentication, API logic, and real-time communication.

The migration is designed to be **incremental** — each phase delivers value independently and the system remains operational throughout.

---

## Current State

```
┌─────────────────────────────────────────────┐
│              CURRENT ARCHITECTURE            │
│                                              │
│  ┌──────────┐     ┌──────────────────────┐  │
│  │ React SPA│────→│    Supabase BaaS     │  │
│  │ (Vite)   │     │ PostgreSQL + Auth +   │  │
│  └──────────┘     │ Storage + Realtime +  │  │
│                   │ Edge Functions        │  │
│                   └──────────────────────┘  │
│                                              │
│  External: Agora, Cloudflare, nTZS, Sentry  │
└─────────────────────────────────────────────┘
```

**Characteristics:**
- Single React SPA (~51K lines)
- Direct client → Supabase queries
- Supabase RLS for authorization
- 15 Edge Functions (Deno)
- No backend caching
- No event bus
- Basic CI/CD

---

## Target State

```
┌─────────────────────────────────────────────────────────────┐
│                    TARGET ARCHITECTURE                       │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │Marketing│  │   App   │  │ Mobile  │  │ Admin   │       │
│  │(Next.js)│  │(React SPA)│ │(Capacitor)│ │(React SPA)│    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│       └────────────┴────────────┴────────────┘              │
│                          │                                   │
│                   ┌──────┴──────┐                           │
│                   │Custom Backend│                          │
│                   │(Node.js/     │                          │
│                   │ Express)     │                          │
│                   └──────┬──────┘                           │
│                          │                                   │
│  ┌───────────┬───────────┼───────────┬───────────┐         │
│  │           │           │           │           │         │
│  ▼           ▼           ▼           ▼           ▼         │
│ PostgreSQL  Redis   WebSocket   Storage    External APIs   │
│ (Supabase)  (Railway) (Railway)  (Supabase) (nTZS, etc.)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Phases

### Phase 0: Foundation (Weeks 1-4) ✅ COMPLETE

**Goal:** Restructure codebase with DDD boundaries while keeping Supabase.

**No infrastructure changes. No new services. Just code organization.**

| Task | Effort | Status |
|---|---|---|
| Create `src/domains/` structure | 2 days | ✅ Done |
| Extract domain types from `types.ts` | 1 day | ✅ Done |
| Move API modules into domain folders | 3 days | ✅ Done |
| Move components into domain folders | 5 days | ⏳ Pending |
| Move hooks into domain folders | 3 days | ⏳ Pending |
| Create domain-level barrel exports | 2 days | ✅ Done |
| Update imports across codebase | 5 days | ⏳ Pending |
| Add domain-level tests | 5 days | ⏳ Pending |
| Update documentation | 2 days | ✅ Done |

**Deliverable:** Codebase organized by domain, ready for backend extraction.

---

### Phase 1: Backend Foundation (Weeks 5-6)

**Goal:** Deploy custom backend with auth and core API routes.

| Task | Effort | Risk |
|---|---|---|
| Fix `backend/package.json` dependencies | 1 day | Low |
| Install backend dependencies | 1 day | Low |
| Test Supabase PostgreSQL connection | 1 day | Low |
| Complete auth service (JWT, registration, login) | 3 days | Medium |
| Complete identity API routes | 2 days | Medium |
| Complete events API routes | 2 days | Low |
| Deploy to Railway | 2 days | Medium |
| Set up Redis on Railway | 1 day | Low |

**Total:** ~2 weeks (1 developer)

**Deliverable:** Custom backend deployed, auth working, core API routes live.

---

### Phase 2: Auth Migration (Weeks 7-9)

**Goal:** Migrate authentication from Supabase Auth to custom backend.

| Task | Effort | Risk |
|---|---|---|
| Implement Google OAuth in backend | 3 days | Medium |
| Implement Apple Sign-In in backend | 3 days | Medium |
| Create dual-auth transition period | 2 days | Medium |
| Update frontend AuthContext | 3 days | Medium |
| Replace `supabase.auth.*` calls | 5 days | High |
| Test OAuth flows end-to-end | 2 days | Medium |
| Remove Supabase Auth dependency | 1 day | Low |

**Total:** ~3 weeks (1 developer)

**Deliverable:** Authentication fully handled by custom backend.

---

### Phase 3: API Migration (Weeks 10-14)

**Goal:** Route all API calls through custom backend.

| Task | Effort | Risk |
|---|---|---|
| Create Express routes for all 11 domains | 5 days | Medium |
| Move business logic from Edge Functions | 5 days | High |
| Create frontend HTTP API client | 3 days | Medium |
| Replace `supabase.from()` calls | 10 days | High |
| Remove RLS policies | 2 days | Medium |
| Test all API endpoints | 5 days | Medium |

**Total:** ~5 weeks (1-2 developers)

**Deliverable:** All API calls routed through custom backend.

---

### Phase 4: Real-time Migration (Weeks 15-17)

**Goal:** Replace Supabase Realtime with WebSocket server.

| Task | Effort | Risk |
|---|---|---|
| Set up Socket.io in backend | 2 days | Low |
| Implement presence tracking | 3 days | Medium |
| Replace `supabase.channel()` subscriptions | 5 days | Medium |
| Add Redis pub/sub for WebSocket | 2 days | Low |
| Test real-time features | 3 days | Medium |

**Total:** ~3 weeks (1 developer)

**Deliverable:** Real-time features working via WebSocket.

---

### Phase 5: Edge Function Migration (Weeks 18-20)

**Goal:** Move Edge Functions to backend routes.

| Task | Effort | Risk |
|---|---|---|
| Migrate nTZS payment functions | 3 days | High |
| Migrate Cloudflare Stream functions | 3 days | Medium |
| Migrate email delivery functions | 2 days | Low |
| Migrate push notification functions | 2 days | Low |
| Migrate account deletion functions | 2 days | Low |
| Test all migrated functions | 3 days | Medium |

**Total:** ~3 weeks (1 developer)

**Deliverable:** All Edge Functions replaced by backend routes.

---

### Phase 6: Storage & Cleanup (Weeks 21-22)

**Goal:** Optimize storage access and clean up Supabase dependencies.

| Task | Effort | Risk |
|---|---|---|
| Create storage proxy routes | 2 days | Low |
| Implement signed URLs | 2 days | Low |
| Remove Supabase client SDK from frontend | 2 days | Low |
| Final testing and cleanup | 3 days | Low |
| Update documentation | 1 day | Low |

**Total:** ~2 weeks (1 developer)

**Deliverable:** Clean architecture, no Supabase client dependency.

---

## Migration Principles

### 1. Strangler Fig Pattern
New functionality is built in the custom backend. Old functionality is gradually extracted from Supabase. The BaaS dependency shrinks over time.

### 2. Dual-Auth Transition
During migration, both Supabase Auth and custom JWT are supported. This allows gradual migration without downtime.

### 3. Backward Compatibility
APIs are versioned. Old versions are supported until all consumers migrate.

### 4. Feature Flags
New behavior is behind feature flags. Enables safe rollout and quick rollback.

### 5. Zero Downtime
Migrations happen without downtime. Blue/green deployments for critical services.

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Data loss during migration | High | Low | Backup before every migration, test restore |
| Auth migration breaks login | High | Medium | Dual-auth transition, gradual migration |
| API migration breaks features | High | Medium | Feature flags, gradual rollout |
| WebSocket scalability | Medium | Low | Redis pub/sub, horizontal scaling |
| Storage migration issues | Medium | Low | Keep Supabase storage, proxy through backend |

---

## Success Criteria

| Phase | Success Metric |
|---|---|
| Phase 0 | Codebase organized by domain, all tests pass |
| Phase 1 | Backend deployed, auth working, core API routes live |
| Phase 2 | Auth fully handled by custom backend, all OAuth flows working |
| Phase 3 | All API calls routed through backend, RLS removed |
| Phase 4 | Real-time features working via WebSocket |
| Phase 5 | All Edge Functions replaced by backend routes |
| Phase 6 | Clean architecture, no Supabase client dependency |

---

## Cost Estimate

| Service | Monthly Cost (10K users) |
|---|---|
| Supabase (DB + Storage only) | $0-25 |
| Railway (backend + Redis) | $5-20 |
| Vercel (frontend) | $0-20 |
| **Total** | **$5-65** |

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| August 2026 | Hybrid approach (Supabase DB + Custom Backend) | Full control over auth and logic, managed database |
| August 2026 | Railway for backend | Full Node.js, persistent connections, Redis |
| August 2026 | Keep Supabase for DB + Storage | Managed services, connection pooling, CDN |
| July 2026 | Phased approach over rewrite | Reduces risk, delivers value incrementally |
| July 2026 | Domain-driven code organization | Clear boundaries, maintainability |
