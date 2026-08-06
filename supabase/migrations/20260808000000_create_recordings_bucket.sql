-- Public bucket for Agora Cloud Recording output (S3-compatible uploads land here).
-- Note: Supabase default bucket file size limit is 50MB; recordings need far more,
-- so we set an explicit per-object limit of 10 GB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recordings',
  'recordings',
  true,
  10737418240,
  null
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;