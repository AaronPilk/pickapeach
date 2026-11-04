-- Data retention, run nightly by pg_cron (matches what the Privacy Policy promises):
--   analytics (events, sessions): 25 months
--   login attempts, upload logs: 30 days; expired sessions: 30 days after expiry
create extension if not exists pg_cron;

create or replace function private.purge_old_data() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.events where ts < now() - interval '25 months';
  delete from public.sessions where started_at < now() - interval '25 months';
  delete from private.admin_attempts where at < now() - interval '30 days';
  delete from private.creator_attempts where at < now() - interval '30 days';
  delete from private.creator_uploads where at < now() - interval '30 days';
  delete from private.rebuilds where at < now() - interval '7 days';
  delete from private.admin_sessions where expires_at < now() - interval '30 days';
  delete from private.creator_sessions where expires_at < now() - interval '30 days';
end;
$$;
revoke all on function private.purge_old_data() from public, anon, authenticated;

select cron.schedule('pp-purge-old-data', '23 8 * * *', 'select private.purge_old_data()');
