# Cloud Architecture

## Overview

Eventz uses a **serverless BaaS architecture** with no custom backend server. All business logic runs in the browser (React) or in Supabase Edge Functions (Deno). The infrastructure is composed of five primary cloud services.

## Service Map

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                   │
│  React 18 SPA  │  Service Worker  │  Capacitor (Native)│
└───────┬─────────────────┬─────────────────┬─────────────┘
        │ HTTPS           │ WSS             │ HTTPS
        ▼                 ▼                 ▼
┌───────────────┐ ┌──────────────┐ ┌──────────────────┐
│    VERCEL     │ │   SUPABASE   │ │   CLOUDFLARE     │
│               │ │              │ │                  │
│ • SPA hosting │ │ • PostgreSQL │ │ • Stream (live)  │
│ • Edge network│ │ • Auth       │ │ • CDN            │
│ • Security Hdr│ │ • Storage    │ │ • Video delivery │
│ • Auto-deploy │ │ • Edge Funcs │ │                  │
│               │ │ • Realtime   │ │                  │
│               │ │ • RPC        │ │                  │
└───────┬───────┘ └──────┬───────┘ └──────────────────┘
        │                │
        │                │         ┌──────────────────┐
        │                │         │     SENTRY       │
        │                └────────▶│ • Error tracking │
        │                          │ • Performance    │
        │                          │ • Prod only      │
        │                          └──────────────────┘
        │
        ▼
┌───────────────┐
│   ANALYTICS   │
│  (Future)     │
└───────────────┘
```

## Vercel (Frontend Hosting)

- **Role**: SPA hosting, edge CDN, security headers, auto-deployment
- **Domain**: `app.eventz.live`
- **Deployment**: Automatic from `main` branch via GitHub integration
- **Edge Network**: All static assets served from Vercel's global edge

### Security Headers (vercel.json)

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Restrictive policy | Prevents XSS, data injection |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leakage |
| `Permissions-Policy` | camera/microphone=self, payment=() | Restricts browser APIs |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | Isolates browsing context |
| `Access-Control-Allow-Origin` | `https://app.eventz.live` | CORS for API requests |

### SPA Routing

All routes rewrite to `/index.html` via `vercel.json` rewrites. Client-side routing handled by `react-router-dom`.

## Supabase (Backend-as-a-Service)

- **Project ID**: `xikoggtidxqtjetiqsnj`
- **URL**: `https://xikoggtidxqtjetiqsnj.supabase.co`

### Components

| Service | Purpose | Notes |
|---------|---------|-------|
| **PostgreSQL** | Primary database | 28 tables, 48 migrations, 12 RPC functions |
| **Auth** | Authentication | PKCE flow, OAuth (Google, Apple), magic links |
| **Storage** | File uploads | Event images, profile photos, media |
| **Edge Functions** | Server-side logic | 15 Deno functions (payments, streaming, notifications) |
| **Realtime** | Live updates | Chat messages, notifications, presence |
| **RPC** | Database functions | `purchase_ticket`, `become_organizer`, `scan_ticket` |

### Edge Functions (15 total)

- `send-gift` — Virtual gifting between users
- `wallet-ticket-payment` — Wallet-based ticket purchases
- `purchase_ticket` — Ticket purchase with transaction verification
- `become_organizer` — Organizer registration
- `scan_ticket` — QR code ticket validation
- `send-auth-email` — Auth email delivery via Resend
- `cloudflare-stream-live` — Live stream provisioning
- `cloudflare-stream-status` — Stream status polling
- `cloudflare-stream-webhook` — VOD backfill handler
- `delete-event-complete` — Cascade event deletion
- Additional utility functions

## Cloudflare (Streaming & CDN)

- **Cloudflare Stream**: Live streaming and VOD delivery
- **Video Player**: Embedded via `iframe.videodelivery.net` and `*.cloudflarestream.com`
- **Integration**: 4 Edge Functions handle stream lifecycle (provision, status, webhook, VOD)

## Sentry (Monitoring)

- **SDK**: `@sentry/react` v10.64
- **Environment**: Production only (`enabled: import.meta.env.PROD`)
- **DSN**: Configured via `VITE_SENTRY_DSN` env variable
- **Scope**: Error tracking, performance monitoring, Core Web Vitals

## Capacitor (Native)

- **Android**: `@capacitor/android` v8.x — wraps SPA in native WebView
- **iOS**: `@capacitor/ios` v8.x — wraps SPA in native WebView
- **Plugins**: `@capacitor/app`, `@capacitor/browser`, `@capacitor/status-bar`
- **Assets**: Generated via `@capacitor/assets` and custom scripts

## Cost Considerations

| Service | Free Tier | Estimated Cost |
|---------|-----------|----------------|
| **Vercel** | 100GB bandwidth, 1000 build minutes | Free (hobby) → $20/mo (pro) |
| **Supabase** | 500MB database, 1GB storage, 50K MAU | Free → $25/mo (pro) |
| **Cloudflare Stream** | 10K minutes free | ~$5/mo per 1K minutes |
| **Sentry** | 5K errors/mo, 10K performance units | Free → $26/mo (team) |
| **Capacitor** | Free (open source) | $0 |

**Current estimated monthly cost**: $0–50 (within free tiers for low traffic).

**Scaling thresholds**:
- Supabase: Upgrade at 500MB database or 50K MAU
- Vercel: Upgrade at 100GB bandwidth
- Cloudflare Stream: Pay per minute after 10K free
- Sentry: Upgrade at 5K errors/mo

## Environment Variables

All secrets are managed through Vercel environment variables and Supabase dashboard. No `.env` files should be committed (flagged as critical vulnerability in audits — a `.env` with plaintext credentials was found in the working tree).

| Variable | Purpose | Scope |
|----------|---------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL | Client |
| `VITE_SUPABASE_KEY` | Supabase anon key | Client |
| `VITE_SENTRY_DSN` | Sentry DSN | Client |
| `SERVICE_ROLE_KEY` | Supabase service role (Edge Functions only) | Server |
