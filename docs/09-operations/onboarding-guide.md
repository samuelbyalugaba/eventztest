# Onboarding Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | >= 20 (LTS) | JavaScript runtime |
| **npm** | >= 9 | Package manager |
| **Git** | Latest | Version control |
| **VS Code** | Latest (recommended) | IDE |

### Recommended VS Code Extensions

- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)

## Setup

### 1. Fork & Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/eventz-app-bd36658b.git
cd eventz-app-bd36658b
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase dashboard → Settings → API |
| `VITE_SUPABASE_KEY` | Supabase anon/public key | Supabase dashboard → Settings → API |
| `VITE_SENTRY_DSN` | Sentry DSN (optional) | Sentry dashboard → Project Settings |
| `DATABASE_URL` | PostgreSQL connection string | Supabase dashboard → Settings → Database |
| `DATABASE_PASSWORD` | Database password | Set during Supabase project creation |

**Important**: Never commit `.env` to version control.

### 4. Supabase Project Setup

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Note the project URL and anon key
4. Run migrations (if you have access to Supabase CLI):
   ```bash
   npx supabase db push
   ```

### 5. Start Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start Vite dev server with HMR |
| `typecheck` | `npm run typecheck` | Run TypeScript type checking |
| `lint` | `npm run lint` | Run ESLint |
| `lint:fix` | `npm run lint:fix` | Auto-fix lint issues |
| `test` | `npm run test` | Run Vitest tests |
| `build` | `npm run build` | Production build |
| `build:dev` | `npm run build:dev` | Development build |
| `preview` | `npm run preview` | Preview production build locally |
| `check-env` | `npm run check-env` | Validate environment variables |

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (React)                    │
│                                                     │
│  ┌─────────┐  ┌──────────┐  ┌─────────────────┐   │
│  │  Pages   │  │Components│  │   Contexts      │   │
│  │ (routes) │  │  (UI)    │  │(Auth, Messaging)│   │
│  └────┬─────┘  └────┬─────┘  └────────┬────────┘   │
│       │              │                 │            │
│       └──────────────┼─────────────────┘            │
│                      │                              │
│              ┌───────▼────────┐                     │
│              │   Hooks/API    │                     │
│              │   Layer        │                     │
│              └───────┬────────┘                     │
│                      │                              │
└──────────────────────┼──────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────┐
│                   SUPABASE                           │
│  PostgreSQL │ Auth │ Storage │ Edge Functions │ RT  │
└──────────────────────────────────────────────────────┘
```

## Key Directories

| Directory | Contents | Notes |
|-----------|----------|-------|
| `src/pages/` | Route-level components | Lazy-loaded |
| `src/components/` | Reusable UI components | ~60+ files |
| `src/contexts/` | React context providers | Auth, Messaging |
| `src/hooks/` | Custom React hooks | feed, live, profile |
| `src/store/` | Zustand stores | profileStore, eventStore |
| `src/utils/` | Utility functions | Helpers, formatters |
| `src/utils/supabase/` | Supabase API layer | 18 domain modules |
| `src/integrations/` | Supabase client + types | Auto-generated types |
| `src/types/` | Global type definitions | TypeScript interfaces |
| `src/styles/` | Global CSS | Tailwind + custom |
| `supabase/functions/` | Edge Functions (Deno) | 15 functions |
| `supabase/migrations/` | Database migrations | 48 migrations |
| `public/` | Static assets | Icons, manifest, SW |
| `android/` | Capacitor Android | Native wrapper |
| `ios/` | Capacitor iOS | Native wrapper |

## Common Development Tasks

### Adding a New Page

1. Create `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in sidebar/bottom nav

### Adding a New Component

1. Create `src/components/NewComponent.tsx`
2. Use existing Radix UI primitives when possible
3. Follow existing naming conventions (PascalCase)

### Adding a Supabase Query

1. Create/update API module in `src/utils/supabase/api/`
2. Use React Query for caching: `useQuery` / `useMutation`
3. Define query keys in `queryKeys.ts`

### Adding an Edge Function

1. Create function in `supabase/functions/new-function/`
2. Add `index.ts` with Deno handler
3. Deploy: `npx supabase functions deploy new-function`

### Running Tests

```bash
# All tests
npm test

# Watch mode
npx vitest

# Specific file
npx vitest run src/components/EventCard.test.tsx
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm install` fails | Delete `node_modules` and `package-lock.json`, retry |
| Dev server won't start | Check `.env` has correct Supabase URL and key |
| Type errors | Run `npm run typecheck` for details |
| Build fails | Check for missing imports or type errors |
| Auth not working | Verify Supabase project settings and redirect URLs |
