# Eventz Email System

Eventz uses two email paths:

1. Supabase Auth emails for signup verification, password recovery, magic links, and email changes.
2. The `send-email` Edge Function for Eventz product updates, event reminders, ticket confirmations, support messages, and optional social emails.

## Required Supabase Secrets

Set these on the Supabase project before deploying the functions:

```bash
supabase secrets set RESEND_API_KEY="re_..."
supabase secrets set EMAIL_FROM="Eventz <updates@your-domain.com>"
supabase secrets set AUTH_EMAIL_FROM="Eventz <auth@your-domain.com>"
supabase secrets set APP_URL="https://your-production-domain.com"
supabase secrets set SUPPORT_EMAIL="support@your-domain.com"
supabase secrets set EVENTZ_INTERNAL_FUNCTION_SECRET="a-long-random-string"
supabase secrets set SEND_EMAIL_HOOK_SECRET="the-secret-from-the-supabase-auth-hook-screen"
```

`RESEND_API_KEY`, `EMAIL_FROM`, and `AUTH_EMAIL_FROM` require a verified sending domain in Resend.

## Deploy

```bash
supabase db push
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy send-auth-email --no-verify-jwt
```

## Supabase Auth Hook

In Supabase Dashboard, configure Auth > Hooks > Send Email:

- Hook URL: `https://<project-ref>.supabase.co/functions/v1/send-auth-email`
- Secret: same value as `SEND_EMAIL_HOOK_SECRET`

The hook sends branded Eventz emails through Resend and logs results to `email_deliveries`.

## App Emails

The `send-email` function supports:

- `kind: "welcome"`
- `kind: "ticket_confirmation"`
- `kind: "event_reminder"`
- `kind: "product_update"`
- `kind: "support"`
- `kind: "generic"`
- authenticated social emails: `like`, `comment`, `follow`

Internal/admin sends must include the `x-eventz-internal-secret` header. Social emails are authenticated with the user's Supabase JWT and honor `email_preferences.social_notifications`.
