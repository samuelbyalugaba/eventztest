# Runbook

## Deploy to Production

### Via GitHub (Recommended)

1. Push changes to `main` branch
2. Vercel auto-deploys within 2-3 minutes
3. Verify deployment at Vercel Dashboard → Deployments

### Via Vercel CLI

```bash
npx vercel --prod
```

### Via GitHub Actions

All pushes to `main` trigger automatic deployment. Manual trigger:

1. Go to GitHub → Actions → CI
2. Click "Run workflow"
3. Select `main` branch
4. Click "Run workflow"

## Rollback a Deployment

### Vercel Rollback

1. Go to Vercel Dashboard → Project → Deployments
2. Find the deployment before the issue
3. Click the "..." menu → "Promote to Production"
4. Verify: `curl -I https://app.eventz.live` returns expected headers

### Quick Rollback (CLI)

```bash
npx vercel rollback
```

## Check Sentry Errors

1. Open Sentry Dashboard (sentry.io)
2. Select "Eventz" project
3. Review "Latest Events" for new errors
4. Click error to see stack trace and affected users
5. Check "Performance" tab for slow transactions

### Filter by Environment

- `is:unresolved` — New/unresolved errors
- `is:regression` — Errors that recently increased
- `environment:production` — Production-only errors

## Database Backup/Restore

### Manual Backup (Supabase)

1. Go to Supabase Dashboard → Database → Backups
2. Click "Create backup"
3. Wait for completion
4. Download backup file

### Restore from Backup

1. Go to Supabase Dashboard → Database → Backups
2. Select backup to restore
3. Click "Restore"
4. **Warning**: This overwrites current database

### Automated Backups

Supabase Pro plan includes:
- Daily automatic backups
- 7-day retention
- Point-in-time recovery

## Edge Function Deployment

### Deploy Single Function

```bash
npx supabase functions deploy <function-name>
```

### Deploy All Functions

```bash
npx supabase functions deploy
```

### Set Function Secrets

```bash
npx supabase secrets set SERVICE_ROLE_KEY=your_key
npx supabase secrets set RESEND_API_KEY=your_key
```

### View Function Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click function name
3. View "Logs" tab

## Clear Service Worker Cache

### User-Side (Browser)

1. Open DevTools → Application → Service Workers
2. Click "Unregister"
3. Hard reload: Ctrl+Shift+R

### Programmatic (in App)

```typescript
// Clear all eventz caches
const names = await caches.keys();
await Promise.all(
  names.filter(n => n.startsWith('eventz-')).map(n => caches.delete(n))
);

// Unregister service workers
const registrations = await navigator.serviceWorker.getRegistrations();
await Promise.all(registrations.map(r => r.unregister()));

// Reload
window.location.reload();
```

### Force Update via Code

The app has built-in chunk reload recovery in `src/main.tsx`:
- Detects chunk load errors
- Clears all caches
- Unregisters SW
- Forces reload (rate-limited to once per 60 seconds)

## Debug Auth Issues

### Check Session

```typescript
const { data: { session }, error } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Error:', error);
```

### Check User

```typescript
const { data: { user }, error } = await supabase.auth.getUser();
console.log('User:', user);
console.log('Error:', error);
```

### Common Auth Issues

| Issue | Check | Fix |
|-------|-------|-----|
| Token expired | `session.expires_at` | Auto-refresh should handle |
| Profile not loading | RLS policies | Check `profiles` table RLS |
| OAuth redirect fails | Supabase auth settings | Update redirect URLs |
| Magic link not received | `email_deliveries` table | Check Resend API key |

### Reset User Password

1. Go to Supabase Dashboard → Authentication → Users
2. Find user
3. Click "..." → "Reset password"
4. User receives reset email

## Debug Payment Issues

### Check Transaction Status

```sql
SELECT * FROM transactions
WHERE user_id = 'user-id'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Ticket Status

```sql
SELECT * FROM tickets
WHERE user_id = 'user-id'
ORDER BY created_at DESC
LIMIT 10;
```

### Common Payment Issues

| Issue | Check | Fix |
|-------|-------|-----|
| Ticket not created | `transactions` table | Verify `completed` status |
| Wallet not debited | `profiles.wallet_balance` | Check Edge Function logs |
| Double purchase | `tickets` table | Check for duplicates |

## Check Supabase Health

### API Health

```bash
curl -s https://xikoggtidxqtjetiqsnj.supabase.co/rest/v1/ | head -5
```

### Database Health

1. Go to Supabase Dashboard → Database → Health
2. Check connection count
3. Check query performance
4. Check storage usage

### Edge Function Health

1. Go to Supabase Dashboard → Edge Functions
2. Check invocation count
3. Check error rate
4. Check cold start frequency

## Environment Variables Reference

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Client (.env) | Supabase project URL |
| `VITE_SUPABASE_KEY` | Client (.env) | Supabase anon key |
| `VITE_SENTRY_DSN` | Client (.env) | Sentry DSN |
| `SERVICE_ROLE_KEY` | Edge Functions | Bypasses RLS |
| `RESEND_API_KEY` | Edge Functions | Email delivery |
| `CLOUDFLARE_API_TOKEN` | Edge Functions | Stream management |

## Useful SQL Queries

### Active Users (Last 24h)

```sql
SELECT COUNT(DISTINCT user_id) as active_users
FROM auth.sessions
WHERE created_at > now() - interval '24 hours';
```

### Recent Errors

```sql
SELECT * FROM audit_logs
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

### Table Sizes

```sql
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```
