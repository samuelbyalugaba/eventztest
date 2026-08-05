# ADR-006: Hybrid Backend Architecture

**Status:** Accepted  
**Date:** August 2026  
**Decision Maker:** Principal Engineer

---

## Context

Eventz initially used Supabase as a complete Backend-as-a-Service (BaaS) solution. As the platform grew, limitations emerged:

1. **Auth limitations** — Supabase Auth lacks flexibility for custom OAuth flows
2. **Edge Function constraints** — Deno runtime, cold starts, no persistent connections
3. **Real-time scalability** — Global subscriptions may not scale to 100K+ concurrent
4. **No caching layer** — Every query hits PostgreSQL directly
5. **Vendor lock-in** — Tied to Supabase platform for all backend logic

## Decision

Adopt a **hybrid architecture** where Supabase provides only database and storage services, while a custom Node.js/Express backend handles authentication, API logic, and real-time communication.

## Architecture

```
Frontend → Custom Backend → Supabase (PostgreSQL + Storage)
```

| Layer | Platform | Responsibility |
|---|---|---|
| Frontend | Vercel | React SPA + Next.js marketing |
| Backend | Railway | Auth, API, Logic, WebSocket |
| Database | Supabase | PostgreSQL (managed) |
| Storage | Supabase | Images, videos (managed) |
| Cache | Railway | Redis (sessions, caching) |

## Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Pure Supabase BaaS** | Fast to build, minimal code | Limited auth control, Edge Function constraints |
| **Pure Custom Backend** | Full control | High setup cost, must build auth/storage |
| **Hybrid (Selected)** | Full control over auth/logic, managed DB | Slightly more complexity |
| **AWS/GCP/Azure** | Enterprise features | Complex setup, steep learning curve |

## Consequences

### Positive
- **Full control over auth** — Custom JWT, OAuth, session management
- **Full control over business logic** — No Edge Function constraints
- **Managed database** — Supabase handles PostgreSQL operations
- **Managed storage** — CDN, image optimization
- **No vendor lock-in for backend** — Can migrate away from Supabase entirely
- **Better security** — No direct client → DB access
- **Scalability** — Railway handles backend scaling

### Negative
- **More code to write** — Backend API routes, auth middleware
- **More infrastructure to manage** — Railway deployment, Redis
- **Real-time is harder** — WebSocket server instead of Supabase Realtime
- **File uploads go through backend** — Proxy uploads or signed URLs

### Mitigation
- Keep Supabase for DB + Storage (managed services)
- Use Railway for backend (full Node.js, persistent connections)
- Gradual migration with dual-auth transition period

---

## Migration Plan

See [MIGRATION_PLAN.md](../../MIGRATION_PLAN.md) for the phased migration approach:

1. **Phase 0**: Codebase restructuring (complete)
2. **Phase 1**: Backend foundation (current)
3. **Phase 2**: Auth migration
4. **Phase 3**: API migration
5. **Phase 4**: Real-time migration
6. **Phase 5**: Edge Function migration
7. **Phase 6**: Storage & cleanup
