drop policy if exists "Users can refresh browser push endpoints" on public.push_subscriptions;

create policy "Users can refresh browser push endpoints"
  on public.push_subscriptions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
