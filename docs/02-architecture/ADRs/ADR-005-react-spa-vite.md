# ADR-005: React SPA + Vite

**Status:** Accepted  
**Date:** July 2026  
**Decision Maker:** Principal Engineer

---

## Context

Eventz needs a frontend framework that supports rapid development, TypeScript, modern tooling, and mobile-first responsive design.

## Decision

Use **React 18** with **Vite** as the build tool, **TypeScript** for type safety, and **Tailwind CSS** for styling.

## Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Next.js** | SSR, RSC, great DX | Heavier setup, SSR complexity for SPA |
| **Remix** | Full-stack, great loading | Server-side focus, learning curve |
| **SvelteKit** | Excellent performance, small bundle | Smaller ecosystem, team unfamiliar |
| **Vue/Nuxt** | Gentle learning curve | Smaller ecosystem than React |
| **React + Vite** | Fast HMR, simple setup, large ecosystem | No SSR, SPA limitations |

## Consequences

### Positive
- **Fast development** — Vite's instant HMR, React's component model
- **TypeScript** — Full type safety across the codebase
- **Tailwind CSS** — Rapid UI development with utility classes
- **Large ecosystem** — Thousands of libraries and components
- **Simple deployment** — Static files on Vercel
- **Mobile-first** — Easy to build responsive layouts

### Negative
- **No SSR** — SEO limitations, slower initial load
- **Bundle size** — React + dependencies can be large
- **Client-side routing** — Full page reloads on hard navigation
- **No server-side logic** — All API calls from client

### Mitigation
- PWA with service worker for offline support
- Code splitting with dynamic imports
- Lazy loading for non-critical components
- Next.js marketing site for SEO/public pages (see `MIGRATION_PLAN.md` Phase 0B)
