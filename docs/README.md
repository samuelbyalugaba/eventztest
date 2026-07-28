# Eventz Documentation

**Last Updated:** July 2026

This is the central index for all Eventz technical and product documentation.

---

## Table of Contents

### Architecture & Engineering

| Document | Description |
|---|---|
| [Target Architecture](TARGET_ARCHITECTURE.md) | Enterprise architecture blueprint (target state) |
| [Migration Plan](MIGRATION_PLAN.md) | Phased approach from current → target |
| [Phase 1 Restructure](PHASE_1_RESTRUCTURE.md) | Immediate code organization guide |
| [AI Instructions](AI_INSTRUCTIONS.md) | Rules for AI coding assistants |
| [Architecture Blueprint](TheArchitecture.md) | Future-scale architecture (aspirational) |

### 1. Product Documentation
Answers: *What are we building?*

| Document | Description |
|---|---|
| [Vision](01-product/vision.md) | Product vision, mission, and long-term goals |
| [Product Requirements](01-product/PRD.md) | Feature matrix and requirements |
| [User Personas](01-product/user-personas.md) | Target user profiles and behaviors |
| [User Journey Maps](01-product/user-journey-maps.md) | Key user flows through the platform |

### 2. Architecture Documentation
Answers: *How is the platform structured?*

| Document | Description |
|---|---|
| [System Architecture](02-architecture/system-architecture.md) | High-level architecture and current state |
| [Domain Model](02-architecture/domain-model.md) | Bounded contexts and domain entities |
| [Context Map](02-architecture/context-map.md) | How domains communicate |
| [Service Catalog](02-architecture/service-catalog.md) | All services, owners, and dependencies |
| [Deployment Architecture](02-architecture/deployment-architecture.md) | Cloud layout and infrastructure topology |
| **ADRs** | |
| [ADR-001: Supabase Backend](02-architecture/ADRs/ADR-001-supabase-backend.md) | Why Supabase as the backend |
| [ADR-002: nTZS Payments](02-architecture/ADRs/ADR-002-ntzs-payments.md) | Why nTZS for payments |
| [ADR-003: Capacitor PWA](02-architecture/ADRs/ADR-003-capacitor-pwa.md) | Why Capacitor for mobile |
| [ADR-004: Agora Streaming](02-architecture/ADRs/ADR-004-agora-streaming.md) | Why Agora for live streaming |
| [ADR-005: React SPA + Vite](02-architecture/ADRs/ADR-005-react-spa-vite.md) | Why React SPA with Vite |

### 3. Software Design Documentation
Answers: *How does each domain work internally?*

| Document | Description |
|---|---|
| [Feed Service](03-design/feed-service.md) | Social feed and content discovery |
| [Event Service](03-design/event-service.md) | Event CRUD, categories, discovery |
| [Ticket Service](03-design/ticket-service.md) | Ticket purchasing, scanning, verification |
| [Messaging Service](03-design/messaging-service.md) | Real-time conversations and presence |
| [Payment Service](03-design/payment-service.md) | nTZS wallet, transactions, gifts |
| [Streaming Service](03-design/streaming-service.md) | Agora RTC and Cloudflare Stream |
| [Notification Service](03-design/notification-service.md) | Push, in-app, and real-time notifications |
| [Sequence Diagrams](03-design/sequence-diagrams.md) | Key interaction flows |

### 4. Database Documentation
Answers: *How is data structured and stored?*

| Document | Description |
|---|---|
| [Data Model](04-database/data-model.md) | ER diagram and entity relationships |
| [Schema Reference](04-database/schema-reference.md) | Complete table-by-table reference |
| [Index Strategy](04-database/index-strategy.md) | Indexes, performance, and recommendations |
| [Migration Guide](04-database/migration-guide.md) | How to create and manage migrations |

### 5. API Documentation
Answers: *How do services communicate?*

| Document | Description |
|---|---|
| [REST API](05-api/rest-api.md) | Client-side API module reference |
| [Edge Functions](05-api/edge-functions.md) | Supabase Edge Function reference |
| [RPC Functions](05-api/rpc-functions.md) | PostgreSQL RPC function reference |
| [Event Catalog](05-api/event-catalog.md) | Realtime events and subscriptions |

### 6. Infrastructure Documentation
Answers: *What infrastructure supports the platform?*

| Document | Description |
|---|---|
| [Cloud Architecture](06-infrastructure/cloud-architecture.md) | Vercel, Supabase, Cloudflare layout |
| [CI/CD Pipeline](06-infrastructure/ci-cd.md) | GitHub Actions workflow |
| [PWA Setup](06-infrastructure/pwa-setup.md) | Service worker, manifest, offline |
| [Monitoring](06-infrastructure/monitoring.md) | Sentry and error tracking |

### 7. Security Documentation
Answers: *How is the platform secured?*

| Document | Description |
|---|---|
| [Security Overview](07-security/security-overview.md) | Threat model, RLS, CORS, rate limiting |
| [Authentication](07-security/authentication.md) | Auth flow, OAuth, session management |

### 8. Quality Documentation
Answers: *How do we ensure quality?*

| Document | Description |
|---|---|
| [Testing Strategy](08-quality/testing-strategy.md) | Test coverage and strategy |
| [Performance Budget](08-quality/performance-budget.md) | Performance targets and metrics |

### 9. Operations Documentation
Answers: *How do we operate the platform?*

| Document | Description |
|---|---|
| [Onboarding Guide](09-operations/onboarding-guide.md) | New engineer setup guide |
| [Coding Standards](09-operations/coding-standards.md) | Code style and conventions |
| [Incident Response](09-operations/incident-response.md) | Escalation and rollback procedures |
| [Runbook](09-operations/runbook.md) | Common operational tasks |

### 10. Business & Compliance Documentation
Answers: *What are the business and legal requirements?*

| Document | Description |
|---|---|
| [Privacy Policy](10-business/privacy-policy.md) | Data collection and user rights |
| [Terms of Service](10-business/terms-of-service.md) | Platform terms and acceptable use |
| [Compliance](10-business/compliance.md) | GDPR and data handling |

### Audits
Historical engineering audit reports.

| Document | Description |
|---|---|
| [Backend Analysis](audits/backend-analysis.md) | Supabase backend audit (4.2/10) |
| [Frontend Analysis](audits/frontend-analysis.md) | Frontend architecture audit (5.7/10) |
| [Production Analysis](audits/production-analysis.md) | Production readiness review (2.8/10) |
| [Loading State](audits/loading-state.md) | Loading and performance audit |
| [Email System](audits/email-system.md) | Email delivery system docs |

---

## Quick Links

- **New Engineers:** [Onboarding Guide](09-operations/onboarding-guide.md) → [AI Instructions](AI_INSTRUCTIONS.md)
- **Architecture:** [Target Architecture](TARGET_ARCHITECTURE.md) → [Migration Plan](MIGRATION_PLAN.md) → [System Architecture](02-architecture/system-architecture.md)
- **API Reference:** [REST API](05-api/rest-api.md) | [Edge Functions](05-api/edge-functions.md)
- **Database:** [Schema Reference](04-database/schema-reference.md)
- **Security:** [Security Overview](07-security/security-overview.md)
- **AI Assistants:** [AI Instructions](AI_INSTRUCTIONS.md) (MUST READ before writing code)
