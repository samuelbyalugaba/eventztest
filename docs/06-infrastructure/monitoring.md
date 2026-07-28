# Monitoring

## Overview

Eventz uses **Sentry** for error tracking and performance monitoring. Monitoring is **production-only** — no errors or telemetry are collected in development.

## Sentry Integration

### SDK Setup

**Package**: `@sentry/react` v10.64

```typescript
// src/main.tsx
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: import.meta.env.PROD,  // Production only
  dataCollection: {},
});
```

### Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| `dsn` | `VITE_SENTRY_DSN` | From environment variable |
| `enabled` | `import.meta.env.PROD` | Disabled in development |
| `dataCollection` | `{}` | Default data collection |

### Error Boundary

Sentry's `ErrorBoundary` wraps the app root to catch React rendering errors:

```typescript
// Integrated via Sentry.ErrorBoundary component
// Catches uncaught render errors and reports to Sentry
```

## Error Tracking

### What Gets Captured

| Error Type | Captured | Notes |
|------------|----------|-------|
| Uncaught exceptions | Yes | Global error handler |
| Unhandled promise rejections | Yes | Async error tracking |
| React render errors | Yes | Via ErrorBoundary |
| Chunk load errors | Yes | Custom recovery in `main.tsx` |
| Network errors | Partial | Fetch/XHR errors |
| Console errors | No | Not configured |

### Chunk Load Error Recovery

```typescript
// src/main.tsx
const recoverFromBundleError = async () => {
  // Rate-limits recovery attempts to once per 60 seconds
  // Clears all eventz caches
  // Unregisters service workers
  // Forces page reload
};
```

### Source Maps

Source maps are generated during `vite build` and uploaded to Sentry for readable stack traces. The Vite config should include:

```typescript
build: {
  sourcemap: true  // Required for Sentry source map upload
}
```

**Note**: Source map configuration should be verified — the audit noted no explicit `build.sourcemap` setting in `vite.config.ts`.

## Performance Monitoring

### Core Web Vitals

Sentry automatically collects:

| Metric | Target | Description |
|--------|--------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Time to largest visible element |
| **FID** (First Input Delay) | < 100ms | Time to first user interaction |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability score |
| **TTFB** (Time to First Byte) | < 800ms | Server response time |

### Custom Performance Marks

```typescript
// Available via SentryPerformance API
Sentry.startSpan({ name: 'Event Load' }, () => {
  // Track specific operations
});
```

## Logging Patterns

### Current State

The codebase uses `console.log`/`console.error` extensively. ESLint warns on `no-console` but does not error.

### Recommended Pattern

```typescript
// Development only
if (import.meta.env.DEV) {
  console.log('[Eventz]', message);
}

// Errors always go to Sentry in production
// Never log PII, tokens, or sensitive data
```

### What NOT to Log

- User credentials or tokens
- Personal identifiable information (PII)
- Payment card details
- Internal API keys
- Supabase service role keys

## Alerting

### Sentry Alerts (Recommended)

| Alert | Trigger | Action |
|-------|---------|--------|
| New error type | First occurrence | Email notification |
| Error spike | > 10 errors in 5 min | Email + Slack |
| Performance regression | LCP > 4s for 10+ users | Email notification |
| Crash rate increase | > 1% of sessions | Critical alert |

### Uptime Monitoring

Configure uptime checks for:
- `https://app.eventz.live` — Main app
- `https://xikoggtidxqtjetiqsnj.supabase.co` — Supabase API

## Health Checks

### Client-Side Health

```typescript
// Check Supabase connectivity
const healthCheck = async () => {
  const { error } = await supabase.from('profiles').select('id').limit(1);
  return !error;
};
```

### Edge Function Health

Monitor Edge Function invocations via Supabase dashboard:
- Function invocation count
- Error rate
- Response time
- Cold start frequency

## Dashboard Setup

### Sentry Dashboard

1. Create project at `sentry.io` → "Eventz"
2. Copy DSN to `VITE_SENTRY_DSN` env variable
3. Configure source map upload in build pipeline
4. Set up alert rules for error spikes

### Supabase Dashboard

Monitor via Supabase dashboard:
- Database metrics (queries, connections, storage)
- Auth metrics (sign-ins, sign-ups, errors)
- Edge Function logs
- Realtime connection count

## Logging Do's and Don'ts

| Do | Don't |
|----|-------|
| Log user actions for debugging | Log passwords or tokens |
| Use structured logging | Use `console.log` in production |
| Include request IDs | Log full request/response bodies |
| Redact PII fields | Log credit card numbers |
| Set appropriate log levels | Use `console.log` for errors |
