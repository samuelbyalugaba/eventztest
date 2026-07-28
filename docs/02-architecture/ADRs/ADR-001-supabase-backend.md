# ADR-001: Supabase as Backend

**Status:** Accepted  
**Date:** July 2026  
**Decision Maker:** Principal Engineer

---

## Context

Eventz needs a backend that provides authentication, database, storage, real-time subscriptions, and serverless functions. The team is small and needs to move fast without building custom infrastructure.

## Decision

Use **Supabase** as the Backend-as-a-Service (BaaS) platform.

## Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Custom Node.js/Express** | Full control, familiar stack | High setup cost, must build auth/storage/realtime |
| **Firebase** | Mature, Google-backed | Vendor lock-in, NoSQL limitations, pricing at scale |
| **AWS Amplify** | AWS ecosystem integration | Complex setup, steep learning curve |
| **PocketBase** | Self-hosted, lightweight | Small community, limited scaling |
| **Supabase** | PostgreSQL-based, open source, fast to build | BaaS limitations, vendor dependency |

## Consequences

### Positive
- **Rapid development** — Auth, DB, Storage, Realtime work out of the box
- **PostgreSQL** — Full relational database with SQL, not NoSQL
- **RLS** — Row-level security built into the database
- **Edge Functions** — Server-side logic without managing servers
- **Open source** — Can self-host if needed
- **Cost effective** — Generous free tier

### Negative
- **Vendor dependency** — Tied to Supabase platform
- **Edge Function limitations** — Deno runtime, cold starts, no persistent connections
- **Realtime scalability** — Global subscriptions may not scale to 100K+ concurrent
- **No caching layer** — Every query hits PostgreSQL directly
- **Pricing at scale** — May become expensive at high usage

### Mitigation
- Keep business logic in SQL functions (portable)
- Abstract Supabase client behind API modules
- Plan migration path for scale (see `TheArchitecture.md`)
