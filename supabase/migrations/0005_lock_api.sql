-- Applied 2026-11-04, after the Supabase secret key was saved in Cloudflare Pages as SUPABASE_KEY (Production + Preview).
-- If you ever rebuild the database from scratch, set that secret first or the site breaks.
--
-- After this, only our own Worker (holding the secret key) can call these functions. Nobody can skip the site's
-- checks by calling the database API directly, and the visitor IP the Worker passes can be trusted for rate limits.
-- Still public on purpose: data the site shows anyway, plus the two functions the sheet-sync script needs (both
-- need the admin password).

do $$
declare f text;
begin
  foreach f in array array[
    'public.ingest(jsonb)', 'public.submit_lead(jsonb)', 'public.submit_request(jsonb)', 'public.locked_creators(uuid)',
    'public.creator_signup(text,text)', 'public.creator_login(text,text)', 'public.creator_logout(uuid)', 'public.creator_me(uuid)',
    'public.creator_save(uuid,jsonb,jsonb,boolean)', 'public.creator_upload_begin(uuid,bigint,text)', 'public.creator_delete_account(uuid,text)',
    'public.admin_creators(uuid)', 'public.admin_creator_review(uuid,uuid,text,text,text)', 'public.admin_requests(uuid)',
    'public.admin_request_resolve(uuid,uuid,text,text)', 'public.admin_leads(uuid,integer)', 'public.admin_leads_export(uuid)',
    'public.admin_stats(uuid,integer)', 'public.admin_recent(uuid,integer)', 'public.vip_fans_url(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- Left callable with the public key: public_profiles, locked_summary, live_stats (public data),
-- admin_login + admin_upsert_locked (password-protected, used by npm run sync:sheet).
-- vip_fans_url is locked too, so hidden creators' page links can't be looked up without unlocking.
