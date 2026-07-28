# CI/CD Pipeline

## Overview

Eventz uses **GitHub Actions** for continuous integration and **Vercel** for continuous deployment. The pipeline runs on every pull request and push to `main`/`master`.

## Pipeline Diagram

```
  Push / PR
      │
      ▼
┌─────────────────────────┐
│   GitHub Actions (CI)   │
│                         │
│  1. Checkout            │
│  2. Setup Node 20       │
│  3. npm ci              │
│  4. Typecheck           │
│  5. Lint                │
│  6. Test                │
│  7. Build               │
└────────────┬────────────┘
             │ Pass
             ▼
┌─────────────────────────┐
│   Vercel (CD)           │
│                         │
│  • Auto-deploy from     │
│    main branch          │
│  • Preview deploy on PR │
│  • Edge network globally│
└─────────────────────────┘
```

## GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

### Triggers

```yaml
on:
  pull_request:          # All PRs
  push:
    branches:
      - main             # Production deploys
      - master            # Production deploys (alt)
```

### Steps

| Step | Command | Purpose |
|------|---------|---------|
| **Checkout** | `actions/checkout@v4` | Clone repository |
| **Setup Node** | `actions/setup-node@v4` (Node 20, npm cache) | Runtime setup |
| **Install** | `npm ci` | Clean install dependencies |
| **Typecheck** | `npm run typecheck` (`tsc --noEmit`) | Catch type errors |
| **Lint** | `npm run lint` (`eslint .`) | Catch code quality issues |
| **Test** | `npm test` (`vitest run`) | Run unit/integration tests |
| **Build** | `npm run build` (`vite build`) | Verify production build |

All steps run sequentially. **Any failure stops the pipeline.**

### Runner

- **OS**: `ubuntu-latest`
- **Node**: 20 (LTS)
- **Cache**: npm (via `actions/setup-node` cache parameter)

## Vercel Deployment

### Auto-Deploy from Main

- Every push to `main` triggers a Vercel production deployment
- Vercel runs its own build step (`vite build`)
- Preview deployments are created for PRs

### Environment Variables

Configured in Vercel dashboard under Project Settings → Environment Variables:

| Variable | Environment | Notes |
|----------|-------------|-------|
| `VITE_SUPABASE_URL` | Production, Preview | Supabase project URL |
| `VITE_SUPABASE_KEY` | Production, Preview | Supabase anon key |
| `VITE_SENTRY_DSN` | Production only | Sentry DSN |
| All `VITE_*` | Production, Preview | Client-side public keys |

**Important**: Only `VITE_*` prefixed variables are exposed to the client. Server-side secrets (like `SERVICE_ROLE_KEY`) are used only in Supabase Edge Functions and must never be in Vercel env vars.

## Branching Strategy

```
main ────────────────────────────────────── Production
  │
  ├── feature/auth-improvements ──────────── Feature branch
  │     └── PR → Review → Merge to main
  │
  ├── fix/ticket-purchase-bug ────────────── Bug fix branch
  │     └── PR → Review → Merge to main
  │
  └── hotfix/payment-critical ────────────── Hotfix branch
        └── PR → Review → Merge to main (fast-track)
```

### Branch Naming

| Pattern | Purpose |
|---------|---------|
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `hotfix/*` | Critical production fixes |
| `docs/*` | Documentation changes |
| `refactor/*` | Code refactoring |

### PR Requirements

- All CI checks must pass (typecheck, lint, test, build)
- Code review from at least one maintainer (recommended)
- No merge conflicts with `main`

## Build Scripts Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Local dev server |
| `npm run typecheck` | `tsc --noEmit` | Type checking only |
| `npm run lint` | `eslint .` | Linting only |
| `npm run test` | `vitest run` | Run tests once |
| `npm run build` | `vite build` | Production build |
| `npm run build:dev` | `vite build --mode development` | Dev build |
| `npm run preview` | `vite preview` | Preview production build |
| `npm run lint:fix` | `eslint . --fix` | Auto-fix lint issues |
| `npm run check-env` | `node scripts/check-env.cjs` | Validate env variables |

## Adding CI Steps

To add a new CI step (e.g., bundle size check), edit `.github/workflows/ci.yml`:

```yaml
- name: Bundle Size Check
  run: npm run build && npx bundlesize
```

## Secrets Management

- CI secrets are stored in GitHub repository settings
- Never commit secrets to the repository
- Vercel environment variables are separate from GitHub secrets
- Supabase Edge Function secrets are managed in the Supabase dashboard
