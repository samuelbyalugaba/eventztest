# Enterprise Architecture Blueprint — Eventz

**Version:** 1.0  
**Status:** Draft Foundation  
**Audience:** Architects, Staff Engineers, Senior Engineers, DevOps Engineers, Security Engineers, Product Engineers  
**Last Updated:** July 2026

---

## Purpose

This document defines the target enterprise architecture for Eventz. It establishes the architectural vision, engineering principles, technology standards, deployment strategy, operational model, and governance that every engineering team must follow.

This document intentionally focuses on architecture rather than implementation details. Detailed design documents, API specifications, database specifications, service designs, and infrastructure documents are produced separately.

---

## Vision

Eventz is designed as a cloud-native, event-driven, enterprise platform capable of supporting millions of users, thousands of organizers, multiple engineering teams, global deployments, and continuous delivery without requiring architectural redesign.

The platform is built around the following principles:

- Domain Driven Design (DDD)
- Event Driven Architecture (EDA)
- API First
- Cloud Native
- Security by Design
- Infrastructure as Code
- Independent Deployability
- Observability by Default
- Scalability First
- Automation First

---

## Quality Attributes

### Scalability
Scale horizontally with stateless services, distributed caching, asynchronous processing, and independently deployable domains.

### Reliability
Graceful degradation, retries, circuit breakers, dead-letter queues, backups, and disaster recovery.

### Performance
Edge delivery, CDN caching, optimized database indexing, asynchronous processing, and efficient search.

### Security
Least privilege, zero trust, encryption, auditing, and defense in depth.

### Maintainability
Clear ownership boundaries, modular domains, documentation, ADRs, and coding standards.

### Extensibility
New domains and services should be introduced without breaking existing capabilities.

---

## Architectural Style

Eventz combines multiple architectural styles:

- Domain Driven Design
- Event Driven Architecture
- Microservice-oriented Domains
- CQRS where appropriate
- API First
- Hexagonal Architecture inside services
- Clean Architecture principles
- Infrastructure as Code

---

## Platform Overview

```
Clients
├── Web Application
├── Progressive Web App
├── Mobile Applications
├── Organizer Portal
└── Administration Portal

        ↓

Cloudflare Edge

        ↓

API Gateway

        ↓

Identity Layer

        ↓

Business Domains

        ↓

Kafka Event Bus

        ↓

Persistence Layer

        ↓

Observability Platform
```

---

## Frontend Architecture

### Architecture Decision: Hybrid Approach

Eventz is primarily an **interactive application**, not a content website. Users spend 90% of their time chatting, buying tickets, managing events, and watching streams — interactions that behave like software, not websites.

**Decision:** Split the frontend into two applications:

1. **Marketing & Discovery Site (Next.js)** — SEO, public pages, landing pages
2. **Web Application (React SPA + Vite)** — Authenticated experience, dashboards, real-time features

Both applications consume the same backend APIs through the API Gateway.

### Why This Split?

| Concern | Next.js (Marketing) | React SPA (Application) |
|---|---|---|
| SEO | Critical — public event pages, organizer profiles | None — dashboard, messaging, tickets |
| SSR | Essential for search indexing | Unnecessary overhead for authenticated pages |
| Real-time | Not needed | Core feature — chat, presence, notifications |
| Complexity | Acceptable for public pages | Simpler mental model for application logic |
| Performance | Better initial load for cold visitors | Faster after initial load, no hydration |
| Offline | Not critical | PWA service worker for low-connectivity |

### Applications

| Application | Technology | Purpose |
|---|---|---|
| Marketing Site | Next.js | Homepage, public events, organizer profiles, SEO |
| Web Application | React SPA + Vite | Dashboard, messaging, tickets, wallet, admin |
| Progressive Web App | React SPA + PWA | Offline-capable mobile web |
| Native Mobile | Capacitor | Android/iOS apps |

### Technology Stack

#### Marketing Site (Next.js)

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js | SSR, routing, API routes |
| UI Library | React | Component model |
| Styling | Tailwind CSS | Utility-first CSS |
| Components | shadcn/ui | Accessible primitives |

#### Web Application (React SPA + Vite)

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 + Vite | SPA, fast HMR |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| UI | Radix UI | Accessible primitives |
| State (Server) | TanStack Query | Server state management |
| State (Client) | Zustand | Client state management |
| Forms | React Hook Form | Form handling |
| Validation | Zod | Schema validation |
| Animation | Framer Motion | Animations |

### Frontend Layers (Application)

```
Presentation Layer
    ↓
Business Feature Layer (Domains)
    ↓
Shared Components
    ↓
Shared Utilities
    ↓
API Client
    ↓
Authentication
    ↓
Offline Storage
    ↓
Caching
    ↓
Internationalization
    ↓
Accessibility
    ↓
Analytics
```

### Frontend Standards

- Responsive by default
- Offline capable where practical (application)
- Lazy loading
- Code splitting
- Error boundaries
- Optimistic updates
- Progressive enhancement
- Backend independence (same APIs for web, mobile, desktop)

---

## Backend Architecture

Backend capabilities are separated by business domains instead of technical layers.

Each domain owns:

- APIs
- Business rules
- Data model
- Events
- Tests
- Documentation
- Deployment lifecycle

Internal communication:

- REST
- gRPC
- Kafka events

**No domain accesses another domain's database directly.**

---

## Core Domains

| Domain | Purpose |
|---|---|
| Identity | Users, authentication, authorization |
| Organizations | Organizer profiles, teams |
| Events | Event CRUD, categories, discovery |
| Venues | Location management |
| Ticketing | Ticket types, inventory |
| Orders | Order management, cart |
| Payments | Transactions, wallet, refunds |
| Messaging | Conversations, messages |
| Notifications | Push, in-app, email |
| Discovery | Search, recommendations |
| Media | Images, videos, attachments |
| Search | Full-text search, filtering |
| Moderation | Reports, blocks, content review |
| Analytics | Business intelligence |
| Administration | Platform operations |

Each bounded context owns its own lifecycle and data.

---

## Data Architecture

### PostgreSQL
Primary transactional database. Stores users, events, organizers, orders, tickets, payments and relationships.

### Redis
- Caching
- Distributed locking
- Session storage
- Queues
- Rate limiting

### Kafka
- Event streaming
- Integration
- Asynchronous workflows

### OpenSearch
- Full-text search
- Filtering
- Suggestions
- Ranking

### ClickHouse
- Analytics
- Business intelligence
- Operational reporting

### Object Storage
- Images
- Videos
- Attachments
- Backups
- Generated documents

---

## Messaging Strategy

### Synchronous Communication
- REST (external APIs)
- gRPC (internal service-to-service)

### Asynchronous Communication
- Kafka (event streaming)

### Event Types

Events represent business facts:

| Event | Domain | Description |
|---|---|---|
| EventCreated | Events | New event created |
| EventPublished | Events | Event made public |
| TicketPurchased | Tickets | Ticket bought |
| PaymentCompleted | Payments | Payment processed |
| TicketIssued | Tickets | Ticket generated |
| TicketTransferred | Tickets | Ticket ownership changed |
| TicketCheckedIn | Tickets | Ticket scanned at venue |
| RefundCompleted | Payments | Refund processed |
| NotificationSent | Notifications | Notification delivered |

---

## API Strategy

| Type | Protocol | Documentation |
|---|---|---|
| External APIs | REST | OpenAPI/Swagger |
| Internal APIs | gRPC | Protobuf |
| Event APIs | Kafka | AsyncAPI |

**Versioning:** Semantic Versioning  
**Compatibility:** Backward compatible changes by default.

---

## Authentication and Authorization

### Authentication
- Email/password
- Google OAuth
- Apple Sign-In
- Phone (future)
- Enterprise identity integration (future)

### Authorization
- RBAC (Role-Based Access Control)
- Permission-based access
- JWT tokens
- Refresh tokens
- ABAC (Attribute-Based) support (future)

---

## Security Architecture

| Control | Implementation |
|---|---|
| Transport | TLS everywhere |
| Service-to-service | mTLS |
| Secrets | Vault/KMS with rotation |
| Audit | Comprehensive audit logging |
| Rate Limiting | Per-user, per-IP, per-API |
| Bot Protection | Cloudflare Bot Management |
| WAF | Cloudflare WAF |
| Dependencies | Automated scanning |
| Containers | Image scanning, signing |
| Headers | Security headers on all responses |
| Encryption at Rest | AES-256 |
| Encryption in Transit | TLS 1.3 |

---

## Infrastructure

| Component | Technology |
|---|---|
| Container Platform | Docker |
| Orchestration | Kubernetes |
| GitOps | Argo CD |
| Infrastructure as Code | Terraform |
| Package Management | Helm |
| Ingress | Cloudflare |
| Load Balancers | Managed Kubernetes |
| DNS | Cloudflare |

---

## CI/CD Pipeline

Every change passes through:

```
Source Control
    ↓
Static Analysis
    ↓
Formatting
    ↓
Linting
    ↓
Unit Tests
    ↓
Integration Tests
    ↓
Contract Tests
    ↓
Security Scan
    ↓
Container Build
    ↓
Performance Validation
    ↓
Staging Deployment
    ↓
Canary Release
    ↓
Production Deployment
    ↓
Automatic Rollback (if needed)
```

---

## Observability

| Signal | Technology |
|---|---|
| Metrics | Prometheus |
| Logging | Loki |
| Tracing | OpenTelemetry + Tempo |
| Dashboards | Grafana |
| Error Monitoring | Sentry |

Every request receives a trace identifier.

---

## Deployment Environments

| Environment | Purpose |
|---|---|
| Local | Developer workstation |
| Development | Shared development |
| QA | Quality assurance |
| Integration | Integration testing |
| Staging | Pre-production |
| Production | Live traffic |

**Production releases use feature flags, canary deployments and blue/green deployments where appropriate.**

---

## Reliability Patterns

| Pattern | Purpose |
|---|---|
| Retry | Handle transient failures |
| Timeout | Prevent hanging requests |
| Circuit Breaker | Prevent cascade failures |
| Bulkhead | Isolate failures |
| Idempotency | Prevent duplicate operations |
| Saga | Distributed transactions |
| Outbox Pattern | Reliable event publishing |
| Dead Letter Queue | Handle failed messages |
| Health Checks | Monitor service health |
| Readiness Probes | Kubernetes readiness |
| Liveness Probes | Kubernetes liveness |

---

## Scalability Strategy

- Horizontal scaling
- Independent service scaling
- Distributed caching
- Read replicas
- CDN
- Background workers
- Partitioned data
- Autoscaling

---

## Platform Operations

| Document | Purpose |
|---|---|
| Architecture Decision Records | Record architectural decisions |
| Engineering Standards | Coding and design standards |
| Runbooks | Operational procedures |
| Incident Management | Handle production incidents |
| Postmortems | Learn from failures |
| Capacity Planning | Plan for growth |
| Change Management | Control changes |
| Release Management | Coordinate releases |
| Knowledge Base | Centralize knowledge |
| Operational Dashboards | Monitor health |

---

## Governance

Every architectural change requires:

1. Architecture review
2. Security review
3. Performance review
4. Updated documentation
5. Updated ADR
6. Updated diagrams

**No undocumented architectural change is considered complete.**

---

## Repository Structure

```
platform/
├── domains/
│   ├── identity-service/
│   ├── event-service/
│   ├── ticket-service/
│   ├── payment-service/
│   ├── messaging-service/
│   ├── notification-service/
│   ├── search-service/
│   └── analytics-service/
├── shared-contracts/
├── shared-libraries/
├── infrastructure/
├── developer-tools/
└── documentation/
```

Each repository follows identical engineering standards, testing standards, security requirements and release processes.

---

## Future Architecture Evolution

The platform is intentionally designed to support:

- Multi-region deployments
- Multi-cloud capability
- AI-powered personalization
- Real-time collaboration
- Large-scale analytics
- Enterprise integrations
- Marketplace capabilities
- Global content delivery
- High availability
- Continuous platform evolution

---

## Relationship to Current Architecture

| Document | Purpose |
|---|---|
| [System Architecture](02-architecture/system-architecture.md) | Current state (Supabase BaaS) |
| [Migration Plan](MIGRATION_PLAN.md) | Phased approach from current → target |
| [Phase 1 Restructure](PHASE_1_RESTRUCTURE.md) | Immediate code organization |
| [AI Instructions](AI_INSTRUCTIONS.md) | Rules for AI coding assistants |

---

## Conclusion

This document establishes the architectural direction for Eventz. It defines the principles, technologies, operational model, governance, deployment strategy, communication model, and quality expectations that all future engineering work must follow.

Subsequent documents should expand every section of this blueprint into dedicated specifications, including Domain Specifications, Database Design, API Specifications, Event Catalog, Infrastructure Design, Security Architecture, Service Designs, Operational Runbooks, and Disaster Recovery Plans.
