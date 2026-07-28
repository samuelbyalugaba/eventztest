# Incident Response

## Severity Levels

| Level | Name | Description | Response Time | Example |
|-------|------|-------------|---------------|---------|
| **P0** | Critical | Complete service outage or data breach | Immediate | Supabase down, payment system compromised |
| **P1** | High | Major feature broken, data loss risk | < 1 hour | Auth broken, ticket purchase failing |
| **P2** | Medium | Feature degraded, workaround exists | < 4 hours | Slow page loads, intermittent errors |
| **P3** | Low | Minor issue, cosmetic bug | Next business day | Typo, alignment issue |

## Escalation Path

```
Incident Detected
    │
    ▼
┌──────────────────┐
│  On-Call Engineer │ ← First responder
│  (You)           │
└────────┬─────────┘
         │ P0 or P1
         ▼
┌──────────────────┐
│  Tech Lead       │ ← Decision maker
│  (Escalation)    │
└────────┬─────────┘
         │ Data breach or security
         ▼
┌──────────────────┐
│  Security Lead   │ ← Security incidents
│  (Escalation)    │
└──────────────────┘
```

## Communication Channels

| Channel | Purpose | When |
|---------|---------|------|
| **GitHub Issues** | Track incidents, post-mortems | All incidents |
| **Sentry** | Error monitoring, alerts | P0, P1 |
| **Supabase Dashboard** | Database/service health | Backend issues |
| **Vercel Dashboard** | Deployment/build status | Frontend issues |
| **Email** | External communication | P0 incidents |
| **Social Media** | Public status updates | Extended outages |

## Rollback Procedures

### Vercel Rollback

1. Go to Vercel Dashboard → Project → Deployments
2. Find the last known good deployment
3. Click "..." → "Promote to Production"
4. Verify the rollback worked

**Alternative** (CLI):
```bash
npx vercel rollback
```

### Supabase Rollback

#### Edge Functions

1. Identify the broken function
2. Revert the function code
3. Deploy the previous version:
   ```bash
   npx supabase functions deploy <function-name>
   ```

#### Database Migrations

**Warning**: Database rollbacks are destructive. Prefer forward fixes when possible.

1. Check migration history:
   ```bash
   npx supabase migration list
   ```
2. Create a reverse migration:
   ```bash
   npx supabase migration new rollback_<name>
   ```
3. Write the rollback SQL
4. Apply:
   ```bash
   npx supabase db push
   ```

### Capacitor (Native) Rollback

1. Revert to previous code version
2. Rebuild native app:
   ```bash
   npm run cap:sync
   ```
3. Re-submit to App Store / Play Store (wait for review)

## Post-Incident Review Template

```markdown
# Incident Report: [Title]

**Date**: YYYY-MM-DD
**Duration**: X hours Y minutes
**Severity**: P0/P1/P2/P3
**Author**: [Name]

## Summary
Brief description of what happened.

## Timeline
- HH:MM — Incident detected
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Service restored

## Root Cause
Technical explanation of what caused the incident.

## Impact
- Users affected: X
- Revenue impact: $X
- Data loss: Yes/No

## Resolution
What was done to fix the issue.

## Prevention
What changes will prevent this from happening again.

## Action Items
- [ ] Action 1 — Owner — Due date
- [ ] Action 2 — Owner — Due date
```

## Common Incidents and Resolution

### 1. Authentication Failure

**Symptoms**: Users cannot log in, "Invalid credentials" errors
**Check**: Supabase Auth logs, Edge Function logs
**Resolution**: Verify Supabase project status, check auth settings

### 2. Payment Processing Failure

**Symptoms**: Ticket purchases failing, wallet not updating
**Check**: Edge Function logs, Supabase transaction table
**Resolution**: Verify transaction status, check Edge Function secrets

### 3. Live Stream Down

**Symptoms**: Stream not loading, Agora connection errors
**Check**: Cloudflare Stream dashboard, Agora console
**Resolution**: Restart stream, verify API tokens

### 4. Build Deployment Failure

**Symptoms**: Vercel build failing, GitHub Actions failing
**Check**: Vercel build logs, GitHub Actions logs
**Resolution**: Fix build errors, clear cache, retry

### 5. Database Performance Degradation

**Symptoms**: Slow queries, timeouts
**Check**: Supabase database metrics, query performance
**Resolution**: Add indexes, optimize queries, scale database

### 6. Service Worker Issues

**Symptoms**: Stale content, offline errors
**Check**: Browser DevTools → Application → Service Workers
**Resolution**: Update SW version, clear caches

## Incident Checklist

- [ ] Identify severity level
- [ ] Check service dashboards (Vercel, Supabase, Sentry)
- [ ] Assess user impact
- [ ] Implement fix or rollback
- [ ] Verify resolution
- [ ] Communicate to stakeholders
- [ ] Create post-incident review
- [ ] Implement prevention measures
