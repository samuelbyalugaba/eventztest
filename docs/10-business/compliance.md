# Compliance

## GDPR Considerations

### Data Controller

Eventz acts as the data controller for user data processed through the application. Supabase acts as a data processor under a Data Processing Agreement.

### Legal Basis for Processing

| Processing Activity | Legal Basis | Documentation |
|--------------------|-------------|---------------|
| Account creation | Contract performance | Terms of Service |
| Event management | Contract performance | Terms of Service |
| Payment processing | Contract performance | Terms of Service |
| Push notifications | Consent | User opt-in |
| Analytics | Legitimate interest | Privacy Policy |
| Security monitoring | Legitimate interest | Privacy Policy |
| Marketing emails | Consent | User opt-in |

### Data Processing Agreements

Required DPAs with:

| Processor | Purpose | DPA Status |
|-----------|---------|------------|
| Supabase | Database, auth, storage | Standard DPA available |
| Vercel | Hosting, CDN | Standard DPA available |
| Cloudflare | Streaming, CDN | Standard DPA available |
| Sentry | Error monitoring | Standard DPA available |
| Resend | Email delivery | Standard DPA available |

## Right to Deletion

### Implementation

The app provides a self-service account deletion endpoint:

```
DELETE /api/delete-account
```

### Deletion Process

1. User initiates deletion through app settings
2. Verification of identity (re-authentication required)
3. CASCADE deletion of all related data
4. Supabase auth user deletion
5. Confirmation email sent

### Data Removed

| Table | Delete Method |
|-------|---------------|
| `profiles` | Hard delete |
| `events` | CASCADE from organizer |
| `posts` | CASCADE from user |
| `tickets` | CASCADE from user |
| `messages` | CASCADE from sender |
| `conversations` | CASCADE from participant |
| `follows` | CASCADE from both parties |
| `post_likes` | CASCADE from user |
| `post_comments` | CASCADE from user |
| `saved_events` | CASCADE from user |
| `saved_posts` | CASCADE from user |
| `push_subscriptions` | CASCADE from user |

### Retained Data

| Data | Retention | Reason |
|------|-----------|--------|
| Transaction records | 7 years | Tax/legal requirements |
| Audit logs | 3 years | Security compliance |
| Email delivery logs | 1 year | Service verification |

## Data Portability

### Export Format

Users can request data export in JSON format containing:
- Profile information
- Events created
- Posts and comments
- Message history (sent)
- Ticket purchase history

### Export Process

1. User submits export request via privacy@eventz.live
2. Data compiled within 30 days
3. Secure download link provided
4. Link expires after 7 days

## Consent Management

### Opt-In Consent

| Feature | Consent Type | Withdrawal |
|---------|-------------|------------|
| Push notifications | Explicit opt-in | App settings |
| Email marketing | Explicit opt-in | Unsubscribe link |
| Analytics tracking | Legitimate interest | N/A (essential) |

### Consent Records

Stored in `profiles` table:
- `push_notifications_enabled`: Boolean
- `marketing_emails_enabled`: Boolean
- `consent_updated_at`: Timestamp

## Data Retention Policies

| Data Category | Retention Period | Deletion Method |
|---------------|-----------------|-----------------|
| Active accounts | Until user deletion | User-initiated |
| Deleted accounts | 30 days (soft) | Automated purge |
| Transaction records | 7 years | Automated purge |
| Error logs | 90 days | Automated purge |
| Analytics data | 12 months | Automated purge |
| Chat messages | Until conversation deletion | CASCADE |
| Media files | Until user deletion | User-initiated |

### Automated Cleanup

```sql
-- Example: Clean old error logs
DELETE FROM audit_logs
WHERE created_at < now() - interval '90 days';

-- Example: Clean soft-deleted accounts
DELETE FROM profiles
WHERE deleted_at IS NOT NULL
AND deleted_at < now() - interval '30 days';
```

## Security Measures

### Technical Measures

| Measure | Implementation | Status |
|---------|---------------|--------|
| Encryption at rest | Supabase (PostgreSQL) | ✅ Active |
| Encryption in transit | HTTPS/TLS | ✅ Active |
| Row Level Security | Supabase RLS | ✅ Active |
| CSP headers | Vercel configuration | ✅ Active |
| Input validation | Ad-hoc (needs improvement) | ⚠️ Gap |
| Rate limiting | Not implemented | ❌ Gap |
| MFA | Not implemented | ❌ Gap |

### Organizational Measures

| Measure | Status |
|---------|--------|
| Privacy policy published | ✅ |
| Terms of service published | ✅ |
| Incident response plan | ✅ Documented |
| Employee training | N/A (small team) |
| Regular security audits | Recommended |

## Children's Privacy

### Age Requirements

- Minimum age: 13 years
- No knowingly collected data from children under 13
- Parental consent required for users under 16 (EU)

### Implementation

- Age verification at registration (self-declared)
- No special features for minors
- Immediate deletion upon discovery of underage users

## Cross-Border Data Transfers

### Transfer Mechanisms

| Processor | Location | Transfer Mechanism |
|-----------|----------|-------------------|
| Supabase | USA | Standard Contractual Clauses |
| Vercel | USA | Standard Contractual Clauses |
| Cloudflare | Global | Standard Contractual Clauses |
| Sentry | USA | Standard Contractual Clauses |

### Safeguards

- All processors sign DPAs with SCCs
- Data minimization applied
- Encryption in transit and at rest
- Regular security assessments

## Compliance Checklist

### GDPR Compliance

- [x] Privacy policy published
- [x] Terms of service published
- [x] Consent mechanisms implemented
- [x] Data deletion endpoint exists
- [ ] Data export functionality (manual process)
- [ ] DPA with all processors (verify)
- [ ] Data Protection Impact Assessment
- [ ] Record of processing activities

### Security Compliance

- [x] HTTPS enforced
- [x] CSP headers configured
- [x] RLS enabled on all tables
- [ ] Rate limiting implemented
- [ ] Input validation layer
- [ ] MFA support
- [ ] Regular penetration testing

## Regular Reviews

| Review | Frequency | Owner |
|--------|-----------|-------|
| Privacy policy update | Annual | Legal |
| Terms of service update | Annual | Legal |
| Security audit | Quarterly | Engineering |
| DPA review | Annual | Legal |
| Data retention review | Quarterly | Engineering |
| Incident response test | Semi-annual | Engineering |
