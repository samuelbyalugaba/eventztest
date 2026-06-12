create table if not exists public.email_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  product_updates boolean not null default true,
  event_reminders boolean not null default true,
  social_notifications boolean not null default false,
  marketing boolean not null default true,
  transactional boolean not null default true,
  security boolean not null default true,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.email_preferences (user_id, marketing)
select
  p.id,
  case
    when p.notification_settings ? 'marketingEmails'
      then coalesce((p.notification_settings->>'marketingEmails')::boolean, true)
    else true
  end
from public.profiles p
on conflict (user_id) do nothing;

alter table public.email_preferences enable row level security;

drop policy if exists "Users can read their own email preferences" on public.email_preferences;
create policy "Users can read their own email preferences"
  on public.email_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own email preferences" on public.email_preferences;
create policy "Users can create their own email preferences"
  on public.email_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own email preferences" on public.email_preferences;
create policy "Users can update their own email preferences"
  on public.email_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists update_email_preferences_updated_at on public.email_preferences;
create trigger update_email_preferences_updated_at
  before update on public.email_preferences
  for each row
  execute function public.update_updated_at_column();

grant select, insert, update on public.email_preferences to authenticated;

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  category text not null default 'transactional'
    check (category in ('transactional', 'security', 'update', 'event_reminder', 'social', 'marketing', 'support')),
  template text,
  subject text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider text not null default 'resend',
  provider_message_id text,
  provider_response jsonb not null default '{}'::jsonb,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists email_deliveries_user_created_idx
  on public.email_deliveries (user_id, created_at desc);

create index if not exists email_deliveries_status_created_idx
  on public.email_deliveries (status, created_at desc);

alter table public.email_deliveries enable row level security;

drop policy if exists "Users can read their own email deliveries" on public.email_deliveries;
create policy "Users can read their own email deliveries"
  on public.email_deliveries
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.email_deliveries to authenticated;
