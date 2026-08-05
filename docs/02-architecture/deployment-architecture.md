# Deployment Architecture — Eventz

**Last Updated:** August 2026

---

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────┐
│                      VERCEL                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  SPA Build (Vite)                               │   │
│  │  - Static HTML/CSS/JS                           │   │
│  │  - Security Headers (CSP, X-Frame, etc.)        │   │
│  │  - SPA Rewrite Rules                            │   │
│  └─────────────────────────────────────────────────┘   │
│  Project ID: qxtqpbgtkymkshxzryzw                      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                      RAILWAY                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Custom Backend (Node.js/Express)                 │  │
│  │  - Authentication (JWT, OAuth)                    │  │
│  │  - API Routes (/api/v1/*)                         │  │
│  │  - Business Logic                                 │  │
│  │  - WebSocket (Real-time)                          │  │
│  │  - Background Jobs                                │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Redis (Caching, Sessions, Pub/Sub)               │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                      SUPABASE                           │
│  ┌──────────┐  ┌──────────┐                            │
│  │PostgreSQL│  │ Storage  │                            │
│  │ 14.5     │  │ (Images) │                            │
│  │ 28 tables│  │ 3 buckets│                            │
│  │ 48 mig.  │  │ Public   │                            │
│  └──────────┘  └──────────┘                            │
│  Project ID: qxtqpbgtkymkshxzryzw                      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                  EXTERNAL SERVICES                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Cloudflare│  │   nTZS   │  │  Resend  │             │
│  │ Stream   │  │ (Payments)│  │ (Email)  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐                            │
│  │  Agora   │  │  Sentry  │                            │
│  │ (Live)   │  │ (Errors) │                            │
│  └──────────┘  └──────────┘                            │
└─────────────────────────────────────────────────────────┘
```

---

## Environments

| Environment | URL | Purpose |
|---|---|---|
| Development | `localhost:3000` | Local development |
| Preview | `*.vercel.app` | PR preview deployments |
| Production | `eventz.live` (or similar) | Live application |

---

## Environment Variables

### Frontend (Vite)

| Variable | Source | Purpose |
|---|---|---|
| `VITE_API_URL` | Railway | Backend API URL |
| `VITE_WS_URL` | Railway | WebSocket URL |

### Backend (Railway)

| Variable | Source | Purpose |
|---|---|---|
| `DATABASE_URL` | Supabase | PostgreSQL connection string |
| `REDIS_URL` | Railway | Redis connection string |
| `JWT_SECRET` | Railway | JWT signing secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Database access (bypass RLS) |
| `SUPABASE_STORAGE_URL` | Supabase | Storage access |
| `RESEND_API_KEY` | Resend | Email delivery |
| `EMAIL_FROM` | Resend | Sender address |
| `NTZS_API_KEY` | nTZS | Payment API |
| `NTZS_SECRET` | nTZS | Authentication |
| `NTZS_WEBHOOK_SECRET` | nTZS | Webhook verification |
| `AGORA_APP_ID` | Agora | Application ID |
| `AGORA_APP_CERTIFICATE` | Agora | Authentication |
| `CLOUDFLARE_STREAM_TOKEN` | Cloudflare | Stream API |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare | Account |
| `CLOUDFLARE_WEBHOOK_SECRET` | Cloudflare | Webhook verification |
| `VAPID_PRIVATE_KEY` | Web Push | Authentication |
| `VAPID_PUBLIC_KEY` | Web Push | Subscription |

---

## Deployment Flow

1. **Push to `main`** triggers Railway build (backend)
2. **Push to `main`** triggers Vercel build (frontend)
3. **Vite build** produces static assets
4. **Vercel Edge** adds security headers
5. **CDN** serves static assets globally
6. **Railway** runs backend server
7. **Backend** connects to Supabase PostgreSQL directly

---

## Security Headers (Vercel)

```json
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'self'; ..."
}
```

---

## Mobile Deployment

| Platform | Build Tool | Distribution |
|---|---|---|
| Android | Capacitor + Gradle | Google Play Store |
| iOS | Capacitor + Xcode | Apple App Store |
| PWA | Service Worker | Direct install |

---

## Cost Estimates

| Service | Free Tier | Estimated Monthly (10K users) |
|---|---|---|
| Vercel | 100GB bandwidth | $0-20 |
| Railway | 500 hours | $5-20 |
| Supabase | 500MB DB, 1GB storage | $0-25 |
| Cloudflare Stream | 1000 min stored | $10-30 |
| Agora | 10,000 min free | $5-20 |
| Resend | 3,000 emails/mo | $5-15 |
| Sentry | 5K errors/mo | $0-26 |
| nTZS | Per transaction | Variable |
