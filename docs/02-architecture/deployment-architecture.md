# Deployment Architecture — Eventz

**Last Updated:** July 2026

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
│                      SUPABASE                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │PostgreSQL│  │   Auth   │  │ Storage  │             │
│  │ 14.5     │  │ (JWT)    │  │ (Images) │             │
│  │ 30 tables│  │ OAuth    │  │ 3 buckets│             │
│  │ 50 mig.  │  │ Email    │  │ Public   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 15 Edge Functions (Deno runtime)                 │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Realtime (WebSocket channels)                    │  │
│  └──────────────────────────────────────────────────┘  │
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
| `VITE_SUPABASE_URL` | Supabase Dashboard | Supabase project URL |
| `VITE_SUPABASE_KEY` | Supabase Dashboard | Supabase anon/publishable key |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard | Supabase publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase Dashboard | Project reference ID |

### Backend (Supabase Secrets)

| Secret | Purpose |
|---|---|
| `SERVICE_ROLE_KEY` | Elevated database access |
| `RESEND_API_KEY` | Email delivery |
| `EMAIL_FROM` | Sender address |
| `AUTH_EMAIL_FROM` | Auth email sender |
| `NTZS_API_KEY` | nTZS payment API |
| `NTZS_SECRET` | nTZS authentication |
| `NTZS_WEBHOOK_SECRET` | nTZS webhook verification |
| `AGORA_APP_ID` | Agora application ID |
| `AGORA_APP_CERTIFICATE` | Agora authentication |
| `CLOUDFLARE_STREAM_TOKEN` | Cloudflare Stream API |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `CLOUDFLARE_WEBHOOK_SECRET` | Cloudflare webhook verification |
| `VAPID_PRIVATE_KEY` | Web Push authentication |
| `VAPID_PUBLIC_KEY` | Web Push subscription |

---

## Deployment Flow

1. **Push to `main`** triggers Vercel build
2. **Vite build** produces static assets
3. **Vercel Edge** adds security headers
4. **CDN** serves static assets globally
5. **Supabase** handles all API requests
6. **Edge Functions** deploy via `supabase functions deploy`

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
| Vercel | 100GB bandwidth | $20-50 |
| Supabase | 500MB DB, 1GB storage | $25-75 |
| Cloudflare Stream | 1000 min stored | $10-30 |
| Agora | 10,000 min free | $5-20 |
| Resend | 3,000 emails/mo | $5-15 |
| Sentry | 5K errors/mo | $0-26 |
| nTZS | Per transaction | Variable |
