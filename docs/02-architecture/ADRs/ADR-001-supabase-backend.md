# ADR-001: Hybrid Architecture — Supabase DB + Custom Backend

**Status:** Accepted  
**Date:** August 2026 (Updated from July 2026)  
**Decision Maker:** Principal Engineer

---

## Context

Eventz needs a backend that provides authentication, database, storage, real-time subscriptions, and serverless functions. The team is small and needs to move fast without building custom infrastructure.

## Decision

Use a **hybrid architecture** where Supabase provides managed database and storage services, while a custom Node.js/Express backend handles authentication, API logic, and real-time communication.

## Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Pure Supabase BaaS** | Fast to build, minimal code | Limited auth control, Edge Function constraints |
| **Pure Custom Backend** | Full control | High setup cost, must build auth/storage/realtime |
| **Hybrid (Selected)** | Full control over auth/logic, managed DB | Slightly more complexity |
| **Firebase** | Mature, Google-backed | Vendor lock-in, NoSQL limitations |
| **AWS Amplify** | AWS ecosystem | Complex setup, steep learning curve |

## Consequences

### Positive
- **Full control over auth** — Custom JWT, OAuth, session management
- **Full control over business logic** — No Edge Function constraints
- **Managed database** — Supabase handles PostgreSQL operations
- **Managed storage** — CDN, image optimization
- **No vendor lock-in for backend** — Can migrate away from Supabase entirely
- **Better security** — No direct client → DB access

### Negative
- **More code to write** — Backend API routes, auth middleware
- **More infrastructure to manage** — Railway deployment, Redis
- **Real-time is harder** — WebSocket server instead of Supabase Realtime
- **File uploads go through backend** — Proxy uploads or signed URLs

### Mitigation
- Keep Supabase for DB + Storage (managed services)
- Use Railway for backend (full Node.js, persistent connections)
- Gradual migration with dual-auth transition period
