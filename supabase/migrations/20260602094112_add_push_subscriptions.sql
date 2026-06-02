create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  enabled boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists push_subscriptions_user_enabled_idx
  on public.push_subscriptions (user_id, enabled);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can read their own push subscriptions" on public.push_subscriptions;
create policy "Users can read their own push subscriptions"
  on public.push_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own push subscriptions" on public.push_subscriptions;
create policy "Users can create their own push subscriptions"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can refresh browser push endpoints" on public.push_subscriptions;
create policy "Users can refresh browser push endpoints"
  on public.push_subscriptions
  for update
  to authenticated
  using (true)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;
create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop trigger if exists update_push_subscriptions_updated_at on public.push_subscriptions;
create trigger update_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.update_updated_at_column();

grant select, insert, update, delete on public.push_subscriptions to authenticated;
