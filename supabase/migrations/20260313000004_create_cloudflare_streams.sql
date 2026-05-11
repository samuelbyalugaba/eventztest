create table if not exists public.cloudflare_streams (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id bigint references public.events(id) on delete set null,
  uid text not null,
  live_input_uid text,
  title text not null default 'Streamed video',
  thumbnail_url text,
  preview_url text,
  playback_url text,
  duration numeric,
  status text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (uid)
);

create index if not exists cloudflare_streams_user_id_created_at_idx
  on public.cloudflare_streams (user_id, created_at desc);

create index if not exists cloudflare_streams_event_id_idx
  on public.cloudflare_streams (event_id);

alter table public.cloudflare_streams enable row level security;

drop policy if exists "Cloudflare streams are viewable by everyone" on public.cloudflare_streams;
create policy "Cloudflare streams are viewable by everyone"
  on public.cloudflare_streams
  for select
  using (true);

drop policy if exists "Users can manage their own Cloudflare streams" on public.cloudflare_streams;
create policy "Users can manage their own Cloudflare streams"
  on public.cloudflare_streams
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
