-- Pick a Peach: security + privacy hardening (2026-11-04 audit).
-- - IP hashes are salted with a secret that never leaves the database (the old salt was in the public repo)
-- - Per-connection rate limits on leads, sign-ups, logins and uploads; admin lockout no longer global
-- - Leads: consent timestamp, do-not-contact, erasure; phone can't be overwritten by someone else
-- - Privacy + takedown requests (opt out, delete, access, correct, NCII / TAKE IT DOWN, copyright, impersonation)
-- - Creators can delete their own account; rebuilds go through pg_net so the deploy hook never leaves the DB
-- - Tag whitelist + social handle cleanup on self-serve profiles; fixed search_path on helpers

create extension if not exists pg_net;

-- ---------------------------------------------------------------- client IP, hashed with a secret salt
insert into private.settings (key, value) values ('ip_salt', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- The Worker passes the visitor's IP in the x-pp-ip header; PostgREST exposes request headers here.
create or replace function private.client_ip() returns text
language sql stable set search_path = '' as $$
  select nullif(left(coalesce(current_setting('request.headers', true), '{}')::json->>'x-pp-ip', 64), '');
$$;

-- One-way, rotates daily, salt is secret. The raw IP is never stored.
create or replace function private.ip_hash() returns text
language sql stable security definer set search_path = '' as $$
  select case when private.client_ip() is null then null else
    left(encode(extensions.digest(private.client_ip() || '|' || coalesce((select value from private.settings where key = 'ip_salt'), '') || '|' || current_date::text, 'sha256'), 'hex'), 32)
  end;
$$;

create or replace function private.norm_phone(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p is null then null
    when left(trim(p), 1) = '+' and length(regexp_replace(p, '\D', '', 'g')) between 8 and 15 then '+' || regexp_replace(p, '\D', '', 'g')
    when length(regexp_replace(p, '\D', '', 'g')) = 10 then '+1' || regexp_replace(p, '\D', '', 'g')
    when length(regexp_replace(p, '\D', '', 'g')) = 11 and left(regexp_replace(p, '\D', '', 'g'), 1) = '1' then '+' || regexp_replace(p, '\D', '', 'g')
  end;
$$;

-- ---------------------------------------------------------------- rebuilds via pg_net (hook stays in the DB)
create table if not exists private.rebuilds (at timestamptz not null default now());

create or replace function private.request_rebuild() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  hook text;
begin
  select value into hook from private.settings where key = 'pages_deploy_hook';
  if hook is null or hook !~ '^https://api\.cloudflare\.com/' then return false; end if;
  -- Safety valve for the monthly build quota.
  if (select count(*) from private.rebuilds where at > now() - interval '1 hour') >= 30 then return false; end if;
  insert into private.rebuilds default values;
  perform net.http_post(url := hook, body := '{}'::jsonb);
  return true;
end;
$$;

-- ---------------------------------------------------------------- leads
alter table public.leads
  add column if not exists consent_at timestamptz,
  add column if not exists do_not_contact boolean not null default false,
  add column if not exists opted_out_at timestamptz,
  add column if not exists erased_at timestamptz;

update public.leads set consent_at = created_at where consent and consent_at is null;

create or replace function public.submit_lead(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  k text := case when p->>'kind' = 'creator' then 'creator' else 'vip' end;
  em text := lower(trim(p->>'email'));
  ph text := private.norm_phone(p->>'phone');
  ih text := private.ip_hash();
  agreed boolean := coalesce((p->>'consent')::boolean, false);
  cur record;
  tok uuid;
begin
  if em is null or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Enter a valid email.'; end if;
  if k = 'vip' then
    if ph is null then raise exception 'Enter a valid phone number.'; end if;
    if not agreed or coalesce(p->>'consent_text', '') = '' then raise exception 'Tick the box to unlock.'; end if;
  end if;
  if ih is not null and (select count(*) from leads where ip_hash = ih and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many sign-ups from your connection. Try again in an hour.';
  end if;

  if k = 'vip' then
    select unlock_token, phone into cur from leads where kind = 'vip' and lower(email) = em;
    if cur.unlock_token is not null then
      -- Same email again: never swap in a different phone number, and only refresh consent
      -- (or lift an opt-out) when the number matches the one on file.
      update leads set
        phone = coalesce(phone, ph),
        consent = case when phone is null or phone = ph then true else consent end,
        consent_text = case when phone is null or phone = ph then p->>'consent_text' else consent_text end,
        consent_at = case when phone is null or phone = ph then now() else consent_at end,
        do_not_contact = case when phone = ph then false else do_not_contact end,
        opted_out_at = case when phone = ph then null else opted_out_at end,
        updated_at = now()
      where unlock_token = cur.unlock_token;
      return jsonb_build_object('token', cur.unlock_token, 'existing', true);
    end if;
  end if;

  insert into leads (kind, email, phone, name, consent, consent_text, consent_at, source, medium, campaign, query, first_touch,
                     session_id, visitor_id, origin, creator, page, country, region, city, device, ip_hash, user_agent, extra)
  values (
    k, em, coalesce(ph, left(p->>'phone', 32)), left(p->>'name', 120), agreed, left(p->>'consent_text', 1000), case when agreed then now() end,
    left(p->>'source', 120), left(p->>'medium', 120), left(p->>'campaign', 200),
    case when jsonb_typeof(p->'query') = 'object' then p->'query' end,
    case when jsonb_typeof(p->'first_touch') = 'object' then p->'first_touch' end,
    left(p->>'session_id', 64), left(p->>'visitor_id', 64), left(p->>'origin', 60), left(p->>'creator', 80), left(p->>'page', 300),
    left(p->>'country', 8), left(p->>'region', 80), left(p->>'city', 80), left(p->>'device', 20), ih,
    left(p->>'user_agent', 400),
    case when jsonb_typeof(p->'extra') = 'object' then p->'extra' end
  )
  returning unlock_token into tok;

  update leads l set source = s.source, medium = s.medium, campaign = s.campaign, query = coalesce(l.query, s.query)
  from sessions s
  where l.unlock_token = tok and l.source is null and s.id = l.session_id;

  return jsonb_build_object('token', tok, 'existing', false);
end;
$$;

create or replace function public.admin_leads(p_token uuid, p_limit integer default 500) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.admin_ok(p_token) then return null; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t)) from (
      select created_at, kind, email, phone, name, consent, consent_at, do_not_contact, opted_out_at, erased_at,
             source, medium, campaign, origin, creator, page, country, region, city, device, query, extra
      from leads order by created_at desc limit greatest(1, least(p_limit, 10000))
    ) t), '[]'::jsonb);
end;
$$;

-- CSV export: only people who agreed to messages, haven't opted out and weren't erased.
create or replace function public.admin_leads_export(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.admin_ok(p_token) then return null; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t)) from (
      select created_at, kind, email, phone, name, consent, consent_at, consent_text, source, medium, campaign, origin, creator, country, region, city, device, page
      from leads where kind = 'vip' and consent and not do_not_contact and erased_at is null
      order by created_at desc limit 50000
    ) t), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------- privacy + takedown requests
create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('optout', 'delete', 'access', 'correct', 'ncii', 'copyright', 'impersonation', 'underage', 'other')),
  email text,
  phone text,
  name text,
  url text,
  details text,
  signature text,
  good_faith boolean not null default false,
  status text not null default 'open' check (status in ('open', 'done', 'erased', 'rejected')),
  admin_note text,
  ip_hash text,
  country text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.requests enable row level security;
create index if not exists requests_status_idx on public.requests (status, created_at desc);

create or replace function public.submit_request(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  k text := p->>'kind';
  em text := nullif(lower(trim(p->>'email')), '');
  ph text := private.norm_phone(nullif(trim(p->>'phone'), ''));
  ih text := private.ip_hash();
  rid uuid;
begin
  if k is null or k not in ('optout', 'delete', 'access', 'correct', 'ncii', 'copyright', 'impersonation', 'underage', 'other') then
    raise exception 'Pick what your request is about.';
  end if;
  if em is null or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Enter a valid email so we can reply.'; end if;
  if k in ('ncii', 'copyright', 'impersonation', 'underage') and coalesce(trim(p->>'url'), '') = '' then
    raise exception 'Add the link to the profile, photo or clip.';
  end if;
  if k in ('ncii', 'copyright') then
    if coalesce(trim(p->>'signature'), '') = '' then raise exception 'Type your full name as your signature.'; end if;
    if not coalesce((p->>'good_faith')::boolean, false) then raise exception 'Tick the good-faith statement.'; end if;
  end if;
  if ih is not null and (select count(*) from requests where ip_hash = ih and created_at > now() - interval '1 hour') >= 8 then
    raise exception 'Too many requests from your connection. Try again in an hour, or email us.';
  end if;

  insert into requests (kind, email, phone, name, url, details, signature, good_faith, ip_hash, country)
  values (k, left(em, 200), ph, left(trim(p->>'name'), 120), left(trim(p->>'url'), 500), left(trim(p->>'details'), 4000),
          left(trim(p->>'signature'), 120), coalesce((p->>'good_faith')::boolean, false), ih, left(p->>'country', 8))
  returning id into rid;

  -- Opting out (or asking to be deleted) stops marketing immediately, before anyone reviews it.
  if k in ('optout', 'delete') then
    update leads set do_not_contact = true, opted_out_at = coalesce(opted_out_at, now()), updated_at = now()
    where not do_not_contact and (lower(email) = em or (ph is not null and phone = ph));
  end if;
  return jsonb_build_object('ok', true, 'id', rid);
end;
$$;

create or replace function public.admin_requests(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  if not private.admin_ok(p_token) then return null; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by (t.status = 'open') desc, t.created_at desc) from (
      select r.id, r.kind, r.email, r.phone, r.name, r.url, r.details, r.signature, r.good_faith, r.status, r.admin_note, r.country,
             r.created_at, r.resolved_at,
             (select count(*) from leads l where l.erased_at is null and (lower(l.email) = r.email or (r.phone is not null and l.phone = r.phone))) as matching_leads,
             (select count(*) from creator_accounts a where lower(a.email) = r.email) as matching_creators
      from requests r order by r.created_at desc limit 500
    ) t), '[]'::jsonb);
end;
$$;

-- Wipes a creator account without deleting the row: no email, no password, no profile, no sessions.
create or replace function private.erase_creator(acc uuid) returns boolean
language plpgsql security definer set search_path = public, private as $$
declare
  was_public boolean;
begin
  select (live is not null and tier = 'public' and status <> 'unpublished') into was_public from creator_profiles where account_id = acc;
  update creator_accounts set email = 'deleted-' || id::text || '@deleted.invalid', password_hash = '!', last_login_at = null where id = acc;
  update creator_profiles set data = '{}'::jsonb, live = null, attest = null, slug = null, status = 'draft', review_note = null,
    submitted_at = null, updated_at = now() where account_id = acc;
  update private.creator_sessions set expires_at = now() where account_id = acc and expires_at > now();
  return coalesce(was_public, false);
end;
$$;

-- action: done | reject | erase (erase removes matching leads' personal data and wipes matching creator accounts)
create or replace function public.admin_request_resolve(p_token uuid, p_id uuid, p_action text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  r record;
  n_leads int := 0;
  accs uuid[] := '{}';
  acc uuid;
  rebuild boolean := false;
begin
  if not private.admin_ok(p_token) then raise exception 'not authorized'; end if;
  select * into r from requests where id = p_id;
  if r.id is null then raise exception 'not found'; end if;

  if p_action = 'erase' then
    update leads set email = null, phone = null, name = null, query = null, first_touch = null, extra = null, user_agent = null,
      ip_hash = null, city = null, region = null, session_id = null, visitor_id = null, page = null,
      consent = false, do_not_contact = true, opted_out_at = coalesce(opted_out_at, now()), erased_at = now(), updated_at = now()
    where erased_at is null and (lower(email) = r.email or (r.phone is not null and phone = r.phone));
    get diagnostics n_leads = row_count;
    for acc in select id from creator_accounts where lower(email) = r.email loop
      accs := accs || acc;
      if private.erase_creator(acc) then rebuild := true; end if;
    end loop;
    if rebuild then perform private.request_rebuild(); end if;
    update requests set status = 'erased', admin_note = left(p_note, 1000), resolved_at = now() where id = p_id;
  elsif p_action in ('done', 'reject') then
    update requests set status = case when p_action = 'done' then 'done' else 'rejected' end, admin_note = left(p_note, 1000), resolved_at = now() where id = p_id;
  else
    raise exception 'unknown action';
  end if;
  return jsonb_build_object('ok', true, 'erased_leads', n_leads, 'creator_accounts', to_jsonb(accs), 'rebuilding', rebuild);
end;
$$;

-- ---------------------------------------------------------------- creators: delete own account, upload quota, IP limits
create or replace function public.creator_delete_account(p_token uuid, p_password text) returns jsonb
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  acc uuid := private.creator_from_token(p_token);
  h text;
  was_public boolean;
begin
  if acc is null then raise exception 'Your session expired. Log in again.'; end if;
  select password_hash into h from creator_accounts where id = acc;
  if h is null or extensions.crypt(coalesce(p_password, ''), h) <> h then raise exception 'That password isn''t right.'; end if;
  was_public := private.erase_creator(acc);
  if was_public then perform private.request_rebuild(); end if;
  return jsonb_build_object('ok', true, 'account', acc);
end;
$$;

create table if not exists private.creator_uploads (
  account_id uuid not null,
  at timestamptz not null default now(),
  bytes bigint not null,
  kind text
);
create index if not exists creator_uploads_acc_idx on private.creator_uploads (account_id, at desc);

create or replace function public.creator_upload_begin(p_token uuid, p_bytes bigint, p_kind text) returns uuid
language plpgsql security definer set search_path = public, private as $$
declare
  acc uuid := private.creator_from_token(p_token);
  n int;
  total bigint;
begin
  if acc is null then return null; end if;
  select count(*), coalesce(sum(bytes), 0) into n, total from private.creator_uploads where account_id = acc and at > now() - interval '24 hours';
  if n >= 60 or total + greatest(coalesce(p_bytes, 0), 0) > 1500::bigint * 1024 * 1024 then
    raise exception 'You''ve hit today''s upload limit. Try again tomorrow, or email us if you need more.';
  end if;
  insert into private.creator_uploads (account_id, bytes, kind) values (acc, greatest(coalesce(p_bytes, 0), 0), left(p_kind, 10));
  return acc;
end;
$$;

create or replace function public.creator_signup(p_email text, p_password text) returns uuid
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  em text := lower(trim(p_email));
  ih text := private.ip_hash();
  acc uuid;
  tok uuid;
begin
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Enter a valid email.'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Use at least 8 characters for your password.'; end if;
  if ih is not null and (select count(*) from private.creator_attempts where email = 'signup:' || ih and at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many sign-ups from your connection. Try again in an hour.';
  end if;
  if (select count(*) from private.creator_attempts where at > now() - interval '1 hour' and email like 'signup%') > 300 then
    raise exception 'Too many sign-ups right now. Try again in a bit.';
  end if;
  if exists (select 1 from creator_accounts where lower(email) = em) then raise exception 'That email already has an account. Log in instead.'; end if;
  insert into creator_accounts (email, password_hash) values (em, extensions.crypt(p_password, extensions.gen_salt('bf', 10))) returning id into acc;
  insert into creator_profiles (account_id) values (acc);
  insert into private.creator_sessions (account_id) values (acc) returning token into tok;
  insert into private.creator_attempts (email, ok) values ('signup:' || coalesce(ih, 'unknown'), false);
  return tok;
end;
$$;

create or replace function public.creator_login(p_email text, p_password text) returns uuid
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  em text := lower(trim(p_email));
  ih text := private.ip_hash();
  acc record;
  tok uuid;
begin
  if (select count(*) from private.creator_attempts where email = em and not ok and at > now() - interval '15 minutes') >= 8 then
    return null;
  end if;
  if ih is not null and (select count(*) from private.creator_attempts where email = 'ip:' || ih and not ok and at > now() - interval '15 minutes') >= 30 then
    return null;
  end if;
  select id, password_hash into acc from creator_accounts where lower(email) = em;
  if acc.id is null or extensions.crypt(coalesce(p_password, ''), acc.password_hash) <> acc.password_hash then
    insert into private.creator_attempts (email, ok) values (em, false);
    if ih is not null then insert into private.creator_attempts (email, ok) values ('ip:' || ih, false); end if;
    return null;
  end if;
  insert into private.creator_attempts (email, ok) values (em, true);
  update creator_accounts set last_login_at = now() where id = acc.id;
  insert into private.creator_sessions (account_id) values (acc.id) returning token into tok;
  return tok;
end;
$$;

-- Five confirmations now: the four content promises plus agreeing to the Creator Terms.
create or replace function public.creator_save(p_token uuid, p_data jsonb, p_attest jsonb, p_submit boolean default false) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  acc uuid := private.creator_from_token(p_token);
  clean jsonb;
  cur record;
  base text;
  s text;
  i int := 1;
  reserved text[] := array['clips', 'browse', 'from', 'new', 'trending', 'faq', 'about', 'privacy', 'terms', 'admin', 'vip', 'apply', 'api', 'go', 'media',
    'llms', 'sitemap', 'robots', 'more', 'members', 'blog', 'creator', 'm', 'cookies', 'creator-terms', 'content-removal', '18-plus', 'privacy-choices', 'report'];
  a int;
begin
  if acc is null then raise exception 'Your session expired. Log in again.'; end if;
  clean := private.clean_profile(coalesce(p_data, '{}'::jsonb), acc);
  a := private.age_from(clean->>'dob');
  if a is not null and a < 18 then raise exception 'You must be 18 or older to be listed.'; end if;

  if p_submit then
    if coalesce(clean->>'name', '') = '' then raise exception 'Add your name.'; end if;
    if a is null then raise exception 'Add your date of birth.'; end if;
    if coalesce(clean->>'fansUrl', '') = '' then raise exception 'Add the link to your page (starting with https://).'; end if;
    if jsonb_array_length(clean->'photos') < 2 then raise exception 'Add at least 2 photos.'; end if;
    if not (coalesce((p_attest->>'adult')::boolean, false) and coalesce((p_attest->>'owner')::boolean, false)
            and coalesce((p_attest->>'everyone_adult')::boolean, false) and coalesce((p_attest->>'non_explicit')::boolean, false)
            and coalesce((p_attest->>'terms')::boolean, false)) then
      raise exception 'Tick all five boxes to submit.';
    end if;
  end if;

  select * into cur from creator_profiles where account_id = acc;
  s := cur.slug;
  if s is null and coalesce(clean->>'name', '') <> '' then
    base := nullif(private.slugify(coalesce(clean->>'handle', clean->>'name')), '');
    if base is null or base = any(reserved) then base := coalesce(base, 'creator') || '-x'; end if;
    s := base;
    while exists (select 1 from creator_profiles where slug = s and account_id <> acc) or exists (select 1 from vip_creators where slug = s) loop
      i := i + 1;
      s := base || '-' || i;
    end loop;
  end if;

  update creator_profiles set
    data = clean,
    slug = s,
    attest = case when p_attest is not null then p_attest || jsonb_build_object('at', now(), 'terms_version', '2026-11-04') else attest end,
    status = case when p_submit then 'pending' when status in ('rejected', 'unpublished') then 'draft' else status end,
    submitted_at = case when p_submit then now() else submitted_at end,
    updated_at = now()
  where account_id = acc;
  return public.creator_me(p_token);
end;
$$;

-- Vibes must come from the Studio's list; social values are reduced to plain handles.
create or replace function private.clean_profile(p jsonb, p_account uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  prefix text := '/m/c/' || p_account::text || '/';
  vibes text[] := array['girl next door', 'fitness', 'yoga', 'petite', 'curvy', 'tall', 'alt', 'tattoos', 'cosplay', 'gamer', 'beach', 'country',
    'latina', 'fashion', 'outdoors', 'foodie', 'blonde', 'brunette', 'redhead'];
  photos jsonb;
  clips jsonb;
  socials jsonb := '{}'::jsonb;
  k text;
  v text;
begin
  select coalesce(jsonb_agg(jsonb_build_object('src', x->>'src', 'w', coalesce((x->>'w')::int, 1080), 'h', coalesce((x->>'h')::int, 1350))), '[]'::jsonb)
    into photos
    from (select x from jsonb_array_elements(coalesce(p->'photos', '[]'::jsonb)) x where left(x->>'src', length(prefix)) = prefix limit 8) t;
  select coalesce(jsonb_agg(jsonb_build_object('src', x->>'src', 'poster', x->>'poster', 'w', coalesce((x->>'w')::int, 720), 'h', coalesce((x->>'h')::int, 1280),
           'duration', least(coalesce((x->>'duration')::numeric, 0), 600))), '[]'::jsonb)
    into clips
    from (select x from jsonb_array_elements(coalesce(p->'clips', '[]'::jsonb)) x
          where left(x->>'src', length(prefix)) = prefix and left(coalesce(x->>'poster', prefix), length(prefix)) = prefix limit 6) t;
  foreach k in array array['instagram', 'tiktok', 'x', 'snapchat', 'reddit', 'threads', 'youtube', 'telegram'] loop
    v := trim(coalesce(p->'socials'->>k, ''));
    -- Pasted a profile URL? Keep only the handle part.
    v := regexp_replace(v, '^https?://[^/]+/', '');
    v := regexp_replace(v, '^(add/|user/|u/|@)', '');
    v := regexp_replace(v, '[/?#].*$', '');
    v := regexp_replace(v, '[^A-Za-z0-9._-]', '', 'g');
    if v <> '' then socials := socials || jsonb_build_object(k, left(v, 60)); end if;
  end loop;
  return jsonb_strip_nulls(jsonb_build_object(
    'name', nullif(left(trim(p->>'name'), 40), ''),
    'handle', nullif(left(regexp_replace(trim(coalesce(p->>'handle', '')), '[^A-Za-z0-9._-]', '', 'g'), 40), ''),
    'tagline', nullif(left(trim(p->>'tagline'), 90), ''),
    'bio', nullif(left(trim(p->>'bio'), 1000), ''),
    'dob', case when coalesce(p->>'dob', '') ~ '^\d{4}-\d{2}-\d{2}$' then p->>'dob' end,
    'location', nullif(left(trim(p->>'location'), 60), ''),
    'region', nullif(left(private.slugify(p->>'region'), 40), ''),
    'height', nullif(left(trim(p->>'height'), 10), ''),
    'hair', nullif(left(trim(p->>'hair'), 20), ''),
    'eyes', nullif(left(trim(p->>'eyes'), 20), ''),
    'tags', (select coalesce(jsonb_agg(distinct t), '[]'::jsonb) from (
               select lower(trim(t)) t from jsonb_array_elements_text(coalesce(p->'tags', '[]'::jsonb)) t limit 6) z
             where t = any(vibes)),
    'fansUrl', case when coalesce(p->>'fansUrl', '') ~ '^https://[^\s<>"]+$' then left(p->>'fansUrl', 300) end,
    'free', coalesce((p->>'free')::boolean, true),
    'socials', socials,
    'photos', photos,
    'clips', clips
  ));
end;
$$;

-- ---------------------------------------------------------------- admin: per-connection lockout, rebuild via pg_net
alter table private.admin_attempts add column if not exists ip_hash text;

create or replace function public.admin_login(p_password text) returns uuid
language plpgsql security definer set search_path = private, extensions as $$
declare
  h text;
  ih text := private.ip_hash();
  tok uuid;
begin
  -- Lock out the connection that keeps guessing, not everyone. A high global cap still stops spread-out guessing.
  if ih is not null and (select count(*) from private.admin_attempts where ip_hash = ih and not ok and at > now() - interval '15 minutes') >= 8 then
    return null;
  end if;
  if (select count(*) from private.admin_attempts where not ok and at > now() - interval '15 minutes') >= 200 then
    return null;
  end if;
  select value into h from private.settings where key = 'admin_password';
  if h is null or extensions.crypt(coalesce(p_password, ''), h) <> h then
    insert into private.admin_attempts (ok, ip_hash) values (false, ih);
    return null;
  end if;
  insert into private.admin_attempts (ok, ip_hash) values (true, ih);
  insert into private.admin_sessions default values returning token into tok;
  return tok;
end;
$$;

create or replace function private.set_admin_password(p_password text) returns void
language plpgsql security definer set search_path = private, extensions as $$
begin
  if length(coalesce(p_password, '')) < 12 then raise exception 'Use at least 12 characters.'; end if;
  insert into private.settings (key, value) values ('admin_password', extensions.crypt(p_password, extensions.gen_salt('bf', 12)))
  on conflict (key) do update set value = excluded.value;
  update private.admin_sessions set expires_at = now() where expires_at > now();
end;
$$;

create or replace function public.admin_creator_review(p_token uuid, p_account uuid, p_action text, p_tier text default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  cur record;
  rebuild boolean := false;
begin
  if not private.admin_ok(p_token) then raise exception 'not authorized'; end if;
  select * into cur from creator_profiles where account_id = p_account;
  if cur.account_id is null then raise exception 'not found'; end if;
  if p_action = 'approve' then
    if coalesce(private.age_from(cur.data->>'dob'), 0) < 18 then raise exception 'Cannot approve: no valid date of birth showing 18+.'; end if;
    if jsonb_array_length(coalesce(cur.data->'photos', '[]'::jsonb)) < 1 or coalesce(cur.data->>'fansUrl', '') = '' or cur.slug is null then
      raise exception 'Cannot approve: profile is missing photos, name or page link.';
    end if;
    update creator_profiles set status = 'approved', tier = coalesce(nullif(p_tier, ''), tier),
      live = cur.data || jsonb_build_object('approvedAt', coalesce(live->>'approvedAt', now()::text)),
      review_note = null, reviewed_at = now(), updated_at = now()
    where account_id = p_account;
    rebuild := true;
  elsif p_action = 'changes' then
    update creator_profiles set status = 'changes', review_note = left(p_note, 1000), reviewed_at = now(), updated_at = now() where account_id = p_account;
  elsif p_action = 'reject' then
    update creator_profiles set status = 'rejected', live = null, review_note = left(p_note, 1000), reviewed_at = now(), updated_at = now() where account_id = p_account;
    rebuild := cur.live is not null;
  elsif p_action = 'unpublish' then
    update creator_profiles set status = 'unpublished', live = null, reviewed_at = now(), updated_at = now() where account_id = p_account;
    rebuild := cur.live is not null;
  elsif p_action = 'tier' then
    update creator_profiles set tier = p_tier, updated_at = now() where account_id = p_account and p_tier in ('public', 'hidden');
    rebuild := cur.live is not null;
  else
    raise exception 'unknown action';
  end if;
  if rebuild then rebuild := private.request_rebuild(); end if;
  return (select jsonb_build_object('status', status, 'tier', tier, 'isLive', live is not null, 'rebuilding', rebuild) from creator_profiles where account_id = p_account);
end;
$$;

-- ---------------------------------------------------------------- tracking: secret-salted IP hash
create or replace function public.ingest(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  sid text := left(p->>'s', 64);
  vid text := left(p->>'v', 64);
  a jsonb := coalesce(p->'att', '{}'::jsonb);
  x jsonb := coalesce(p->'enr', '{}'::jsonb);
  evs jsonb := coalesce(p->'e', '[]'::jsonb);
  n_events int;
  n_pv int;
begin
  if sid is null or vid is null or jsonb_typeof(evs) <> 'array' then
    return;
  end if;
  if jsonb_array_length(evs) > 60 then
    evs := (select jsonb_agg(v) from (select v from jsonb_array_elements(evs) v limit 60) t);
  end if;

  select count(*), count(*) filter (where v->>'t' = 'page_view')
    into n_events, n_pv
    from jsonb_array_elements(evs) v;

  insert into sessions as s (
    id, visitor_id, source, medium, campaign, content, term, click_id, landing_path, referrer, referrer_host,
    query, first_touch, first_source, country, region, city, postal, timezone, asn_org, colo, device, os, browser,
    is_bot, screen, lang, net, ip_hash, pageviews, events
  ) values (
    sid, vid,
    coalesce(nullif(left(a->>'source', 120), ''), 'direct'),
    left(a->>'medium', 120), left(a->>'campaign', 200), left(a->>'content', 200), left(a->>'term', 200),
    left(a->>'click_id', 300), left(a->>'landing', 300), left(a->>'referrer', 500), left(a->>'referrer_host', 200),
    case when jsonb_typeof(a->'query') = 'object' then a->'query' end,
    case when jsonb_typeof(a->'first_touch') = 'object' then a->'first_touch' end,
    left(a->>'first_source', 120),
    left(x->>'country', 8), left(x->>'region', 80), left(x->>'city', 80), left(x->>'postal', 20), left(x->>'timezone', 60),
    left(x->>'asn_org', 120), left(x->>'colo', 8), left(x->>'device', 20), left(x->>'os', 30), left(x->>'browser', 30),
    coalesce((x->>'is_bot')::boolean, false), left(x->>'screen', 30), left(x->>'lang', 20), left(x->>'net', 10),
    private.ip_hash(), n_pv, n_events
  )
  on conflict (id) do update set
    last_seen_at = now(),
    pageviews = s.pageviews + excluded.pageviews,
    events = s.events + excluded.events,
    source = case when s.source = 'direct' and excluded.source <> 'direct' then excluded.source else s.source end,
    medium = coalesce(s.medium, excluded.medium),
    campaign = coalesce(s.campaign, excluded.campaign),
    query = coalesce(s.query, excluded.query),
    first_touch = coalesce(s.first_touch, excluded.first_touch),
    first_source = coalesce(s.first_source, excluded.first_source),
    landing_path = coalesce(s.landing_path, excluded.landing_path),
    screen = coalesce(s.screen, excluded.screen);

  insert into events (session_id, visitor_id, type, path, creator, meta, ts)
  select sid, vid,
         left(v->>'t', 40),
         left(v->>'p', 300),
         nullif(left(v->>'c', 80), ''),
         case when jsonb_typeof(v->'m') = 'object' then v->'m' end,
         coalesce(to_timestamp(nullif(v->>'ts', '')::double precision / 1000), now())
  from jsonb_array_elements(evs) v
  where v->>'t' is not null;
end;
$$;

-- ---------------------------------------------------------------- search_path + who can call what
alter function private.age_from(text) set search_path = '';
alter function private.slugify(text) set search_path = '';
alter function private.creator_public(jsonb, text, boolean, timestamptz) set search_path = '';

-- Nothing in the private schema is callable from the API.
revoke all on all functions in schema private from public, anon, authenticated;

-- Unused or internal: not callable from the API.
revoke execute on function public.vip_check(uuid) from public, anon, authenticated;
revoke execute on function public.vip_content(uuid) from public, anon, authenticated;
revoke execute on function public.vip_summary() from public, anon, authenticated;
revoke execute on function public.admin_deploy_hook(uuid) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.submit_request(jsonb)', 'public.admin_requests(uuid)', 'public.admin_request_resolve(uuid,uuid,text,text)',
    'public.creator_delete_account(uuid,text)', 'public.creator_upload_begin(uuid,bigint,text)', 'public.admin_leads_export(uuid)'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
