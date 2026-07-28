# Migration Plan — Eventz: Current to Target Architecture

**Version:** 1.0  
**Status:** Active  
**Last Updated:** July 2026

---

## Executive Summary

This document defines the phased migration from Eventz's current architecture (React SPA + Supabase BaaS) to the target enterprise architecture (domain-driven microservices with Kubernetes, Kafka, and full observability).

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
│                   │ API Gateway │                           │
│                   └──────┬──────┘                           │
│                          │                                   │
│  ┌───────────┬───────────┼───────────┬───────────┐         │
│  │           │           │           │           │         │
│  ▼           ▼           ▼           ▼           ▼         │
│ Identity   Events    Tickets    Payments   Messaging      │
│ Service    Service   Service    Service    Service         │
│  │           │           │           │           │         │
│  └───────────┴───────────┴───────────┴───────────┘         │
│                          │                                   │
│                   ┌──────┴──────┐                           │
│                   │ Kafka Bus   │                           │
│                   └──────┬──────┘                           │
│                          │                                   │
│  ┌───────────┬───────────┼───────────┬───────────┐         │
│  │           │           │           │           │         │
│  ▼           ▼           ▼           ▼           ▼         │
│ PostgreSQL  Redis   OpenSearch  ClickHouse  Object Store   │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Phases

### Phase 0: Foundation (Weeks 1-4)

**Goal:** Restructure codebase with DDD boundaries while keeping Supabase.

**No infrastructure changes. No new services. Just code organization.**

| Task | Effort | Risk |
|---|---|---|
| Create `src/domains/` structure | 2 days | Low |
| Extract domain types from `types.ts` | 1 day | Low |
| Move API modules into domain folders | 3 days | Low |
| Move components into domain folders | 5 days | Medium |
| Move hooks into domain folders | 3 days | Low |
| Create domain-level barrel exports | 2 days | Low |
| Update imports across codebase | 5 days | Medium |
| Add domain-level tests | 5 days | Low |
| Update documentation | 2 days | Low |

**Total:** ~4 weeks (1 developer)

**Deliverable:** Codebase organized by domain, ready for service extraction.

---

### Phase 0B: Marketing Site (Parallel with Phase 1-2)

**Goal:** Build a Next.js marketing and discovery site for SEO and public pages.

**Rationale:** Eventz is primarily an application (React SPA), but public pages need SEO. A separate Next.js site handles marketing, public event listings, and organizer profiles while the SPA handles the authenticated experience.

| Task | Effort | Risk |
|---|---|---|
| Initialize Next.js project | 1 day | Low |
| Build homepage and landing pages | 1 week | Low |
| Public event listing pages (SSR) | 1 week | Medium |
| Organizer profile pages (SSR) | 3 days | Medium |
| Public venue pages | 3 days | Low |
| Blog/help center | 3 days | Low |
| SEO optimization (meta, structured data) | 3 days | Low |
| Shared API client with SPA | 2 days | Low |
| Deploy to Vercel | 1 day | Low |

**Total:** ~4 weeks (1 developer, parallel track)

**Deliverable:** Next.js marketing site deployed, consuming same backend APIs as SPA.

**Architecture:**
```
Internet
    ↓
Cloudflare
    ↓
┌─────────────────┐     ┌─────────────────┐
│  Next.js Site   │     │   React SPA     │
│  (Marketing)    │     │   (Application) │
│  - Homepage     │     │  - Dashboard    │
│  - Public Events│     │  - Messaging    │
│  - Organizers   │     │  - Tickets      │
│  - SEO Pages    │     │  - Wallet       │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ↓
              API Gateway
                     ↓
              Microservices
```

---

### Phase 1: Identity Extraction (Months 2-3)

**Goal:** Extract authentication and user management into a dedicated service.

| Task | Effort | Risk |
|---|---|---|
| Deploy PostgreSQL (managed or self-hosted) | 3 days | Low |
| Deploy Redis | 2 days | Low |
| Build Identity Service (Node.js/NestJS) | 3 weeks | Medium |
| Migrate users from Supabase | 1 week | High |
| Update frontend auth flow | 3 days | Medium |
| Deploy API Gateway (Kong/Traefik) | 3 days | Medium |
| Add OpenTelemetry instrumentation | 3 days | Low |
| Security review | 2 days | Low |

**Total:** ~6 weeks (1-2 developers)

**Deliverable:** Authentication extracted from Supabase, API Gateway in place.

---

### Phase 2: Events & Tickets Extraction (Months 4-6)

**Goal:** Extract event management and ticketing into dedicated services.

| Task | Effort | Risk |
|---|---|---|
| Build Event Service | 2 weeks | Medium |
| Build Ticket Service | 2 weeks | Medium |
| Deploy Kafka | 3 days | Medium |
| Implement event-driven communication | 1 week | Medium |
| Migrate event data | 1 week | High |
| Migrate ticket data | 1 week | High |
| Update frontend API calls | 1 week | Medium |
| Contract testing | 3 days | Low |

**Total:** ~8 weeks (2 developers)

**Deliverable:** Events and tickets running as independent services.

---

### Phase 3: Payments & Messaging (Months 7-9)

**Goal:** Extract payments and messaging into dedicated services.

| Task | Effort | Risk |
|---|---|---|
| Build Payment Service | 2 weeks | High |
| Build Messaging Service | 2 weeks | Medium |
| Implement Saga pattern for payments | 1 week | High |
| Implement outbox pattern | 3 days | Medium |
| Migrate payment data | 1 week | High |
| Migrate message data | 1 week | Medium |
| Add idempotency to all payment operations | 3 days | Medium |
| Load testing | 3 days | Low |

**Total:** ~8 weeks (2 developers)

**Deliverable:** Payments and messaging running as independent services.

---

### Phase 4: Search & Analytics (Months 10-12)

**Goal:** Add search and analytics capabilities.

| Task | Effort | Risk |
|---|---|---|
| Deploy OpenSearch | 2 days | Low |
| Deploy ClickHouse | 2 days | Low |
| Build Search Service | 2 weeks | Medium |
| Build Analytics Service | 2 weeks | Medium |
| Implement data pipelines | 1 week | Medium |
| Add analytics events | 3 days | Low |
| Build analytics dashboards | 1 week | Low |

**Total:** ~6 weeks (1-2 developers)

**Deliverable:** Full-text search and analytics capabilities.

---

### Phase 5: Infrastructure & Observability (Months 13-15)

**Goal:** Production-ready infrastructure with full observability.

| Task | Effort | Risk |
|---|---|---|
| Deploy Kubernetes cluster | 1 week | High |
| Set up Terraform | 1 week | Medium |
| Configure Argo CD (GitOps) | 3 days | Medium |
| Deploy Prometheus + Grafana | 2 days | Low |
| Deploy Loki | 2 days | Low |
| Deploy Tempo | 2 days | Low |
| Set up distributed tracing | 3 days | Medium |
| Configure alerts | 2 days | Low |
| Disaster recovery testing | 3 days | Medium |

**Total:** ~6 weeks (1-2 DevOps engineers)

**Deliverable:** Enterprise-grade infrastructure with full observability.

---

### Phase 6: Advanced Capabilities (Months 16+)

**Goal:** Multi-region, AI personalization, enterprise features.

| Task | Effort | Risk |
|---|---|---|
| Multi-region deployment | 4 weeks | High |
| AI-powered recommendations | 4 weeks | Medium |
| Enterprise integrations | Ongoing | Low |
| Global CDN optimization | 2 weeks | Low |
| Advanced security (mTLS, zero trust) | 3 weeks | Medium |

**Total:** Ongoing

---

## Migration Principles

### 1. Strangler Fig Pattern
New functionality is built in new services. Old functionality is gradually extracted. The monolith shrinks over time.

### 2. Database per Service
Each service owns its data. No shared databases. Data is synchronized via events.

### 3. Event-First Communication
Services communicate via Kafka events. REST/gRPC only for synchronous queries.

### 4. Backward Compatibility
APIs are versioned. Old versions are supported until all consumers migrate.

### 5. Feature Flags
New behavior is behind feature flags. Enables safe rollout and quick rollback.

### 6. Zero Downtime
Migrations happen without downtime. Blue/green deployments for critical services.

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Data loss during migration | High | Low | Backup before every migration, test restore |
| Service downtime | High | Low | Strangler fig, feature flags, rollback |
| Scope creep | Medium | High | Strict phase boundaries, MVP per phase |
| Team capacity | Medium | Medium | Phased approach, clear priorities |
| Infrastructure costs | Medium | Medium | Start with managed services, optimize later |

---

## Success Criteria

| Phase | Success Metric |
|---|---|
| Phase 0 | Codebase organized by domain, all tests pass |
| Phase 1 | Auth extracted, Supabase auth disabled |
| Phase 2 | Events/tickets independent, Kafka operational |
| Phase 3 | Payments/messaging independent, Saga pattern working |
| Phase 4 | Search and analytics operational |
| Phase 5 | Kubernetes deployed, observability complete |
| Phase 6 | Multi-region operational |

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| July 2026 | Phased approach over rewrite | Reduces risk, delivers value incrementally |
| July 2026 | Keep Supabase in Phase 0 | Minimizes change while restructuring code |
| July 2026 | Kafka over RabbitMQ | Better for event streaming and replay |
| July 2026 | Kubernetes over ECS | Multi-cloud portability, ecosystem |
