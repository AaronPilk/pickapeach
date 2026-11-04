-- Pick a Peach: hidden-tier creators, live stats and Creator Studio (self-serve profiles + owner approval).
-- Already applied to the live project; kept here so the database can be rebuilt from the repo.
-- Same rules as 0001: every table is RLS-locked with no policies, and the Worker only calls the
-- SECURITY DEFINER functions below with the publishable key.

-- ---------------------------------------------------------------- hidden-tier creators (sheet "locked" rows)
alter table public.vip_creators
  add column if not exists handle text,
  add column if not exists bio text,
  add column if not exists region text,
  add column if not exists height text,
  add column if not exists hair text,
  add column if not exists eyes text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists free boolean not null default true,
  add column if not exists badge text,
  add column if not exists photos jsonb not null default '[]',
  add column if not exists clips jsonb not null default '[]',
  add column if not exists socials jsonb not null default '{}',
  add column if not exists added_at date not null default current_date,
  add column if not exists placeholder boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------- creator accounts + profiles
create table if not exists public.creator_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index if not exists creator_accounts_email_uidx on public.creator_accounts (lower(email));

create table if not exists public.creator_profiles (
  account_id uuid primary key references public.creator_accounts (id) on delete cascade,
  slug text unique,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'changes', 'rejected', 'unpublished')),
  tier text not null default 'public' check (tier in ('public', 'hidden')),
  data jsonb not null default '{}',   -- the creator's working copy
  live jsonb,                         -- the last approved snapshot (what the site shows)
  attest jsonb,
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists creator_profiles_status_idx on public.creator_profiles (status, updated_at desc);

create table if not exists private.creator_sessions (
  token uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.creator_accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table if not exists private.creator_attempts (
  email text not null,
  at timestamptz not null default now(),
  ok boolean not null
);

alter table public.creator_accounts enable row level security;
alter table public.creator_profiles enable row level security;

-- ---------------------------------------------------------------- helpers
create or replace function private.age_from(p_dob text) returns integer language sql immutable as $$
  select case when p_dob ~ '^\d{4}-\d{2}-\d{2}$' then extract(year from age(current_date, p_dob::date))::int end;
$$;

create or replace function private.slugify(p text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'));
$$;

create or replace function private.creator_from_token(p_token uuid) returns uuid
language sql stable security definer set search_path = private as $$
  select account_id from private.creator_sessions where token = p_token and expires_at > now();
$$;

-- Whitelists fields and only keeps media this account uploaded (/m/c/<account>/...).
create or replace function private.clean_profile(p jsonb, p_account uuid) returns jsonb language plpgsql stable as $$
declare
  prefix text := '/m/c/' || p_account::text || '/';
  photos jsonb;
  clips jsonb;
  socials jsonb := '{}'::jsonb;
  k text;
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
    if coalesce(trim(p->'socials'->>k), '') <> '' then
      socials := socials || jsonb_build_object(k, left(regexp_replace(trim(p->'socials'->>k), '^@', ''), 120));
    end if;
  end loop;
  return jsonb_strip_nulls(jsonb_build_object(
    'name', nullif(left(trim(p->>'name'), 40), ''),
    'handle', nullif(left(regexp_replace(trim(coalesce(p->>'handle', '')), '^@', ''), 40), ''),
    'tagline', nullif(left(trim(p->>'tagline'), 90), ''),
    'bio', nullif(left(trim(p->>'bio'), 1000), ''),
    'dob', case when coalesce(p->>'dob', '') ~ '^\d{4}-\d{2}-\d{2}$' then p->>'dob' end,
    'location', nullif(left(trim(p->>'location'), 60), ''),
    'region', nullif(left(private.slugify(p->>'region'), 40), ''),
    'height', nullif(left(trim(p->>'height'), 10), ''),
    'hair', nullif(left(trim(p->>'hair'), 20), ''),
    'eyes', nullif(left(trim(p->>'eyes'), 20), ''),
    'tags', (select coalesce(jsonb_agg(distinct lower(left(trim(t), 24))), '[]'::jsonb) from (select jsonb_array_elements_text(coalesce(p->'tags', '[]'::jsonb)) t limit 6) z where trim(t) <> ''),
    'fansUrl', case when coalesce(p->>'fansUrl', '') ~ '^https?://' then left(p->>'fansUrl', 300) end,
    'free', coalesce((p->>'free')::boolean, true),
    'socials', socials,
    'photos', photos,
    'clips', clips
  ));
end;
$$;

-- Public shape of an approved profile. Never includes the date of birth or email.
create or replace function private.creator_public(p jsonb, p_slug text, p_locked boolean, p_added timestamptz)
returns jsonb language sql stable as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'slug', p_slug, 'name', p->>'name', 'handle', p->>'handle', 'tagline', coalesce(p->>'tagline', ''), 'bio', coalesce(p->>'bio', p->>'tagline', ''),
    'age', private.age_from(p->>'dob'), 'location', p->>'location', 'region', p->>'region', 'height', p->>'height', 'hair', p->>'hair', 'eyes', p->>'eyes',
    'tags', coalesce(p->'tags', '[]'::jsonb), 'fansUrl', p->>'fansUrl', 'free', coalesce((p->>'free')::boolean, true), 'featured', 500,
    'addedAt', to_char(coalesce((p->>'approvedAt')::timestamptz, p_added, now()), 'YYYY-MM-DD'),
    'updatedAt', to_char(coalesce(p_added, now()), 'YYYY-MM-DD'),
    'socials', coalesce(p->'socials', '{}'::jsonb), 'photos', coalesce(p->'photos', '[]'::jsonb), 'clips', coalesce(p->'clips', '[]'::jsonb),
    'locked', case when p_locked then true end, 'selfServe', true
  ));
$$;

-- ---------------------------------------------------------------- creator RPCs
create or replace function public.creator_signup(p_email text, p_password text) returns uuid
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  em text := lower(trim(p_email));
  acc uuid;
  tok uuid;
begin
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Enter a valid email.'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Use at least 8 characters for your password.'; end if;
  if (select count(*) from private.creator_attempts where at > now() - interval '1 hour' and not ok and email = 'signup') > 200 then
    raise exception 'Too many sign-ups right now. Try again in a bit.';
  end if;
  if exists (select 1 from creator_accounts where lower(email) = em) then raise exception 'That email already has an account. Log in instead.'; end if;
  insert into creator_accounts (email, password_hash) values (em, extensions.crypt(p_password, extensions.gen_salt('bf', 10))) returning id into acc;
  insert into creator_profiles (account_id) values (acc);
  insert into private.creator_sessions (account_id) values (acc) returning token into tok;
  insert into private.creator_attempts (email, ok) values ('signup', false);
  return tok;
end;
$$;

create or replace function public.creator_login(p_email text, p_password text) returns uuid
language plpgsql security definer set search_path = public, private, extensions as $$
declare
  em text := lower(trim(p_email));
  acc record;
  tok uuid;
begin
  if (select count(*) from private.creator_attempts where email = em and not ok and at > now() - interval '15 minutes') >= 8 then
    return null;
  end if;
  select id, password_hash into acc from creator_accounts where lower(email) = em;
  if acc.id is null or extensions.crypt(p_password, acc.password_hash) <> acc.password_hash then
    insert into private.creator_attempts (email, ok) values (em, false);
    return null;
  end if;
  insert into private.creator_attempts (email, ok) values (em, true);
  update creator_accounts set last_login_at = now() where id = acc.id;
  insert into private.creator_sessions (account_id) values (acc.id) returning token into tok;
  return tok;
end;
$$;

create or replace function public.creator_logout(p_token uuid) returns void
language sql security definer set search_path = private as $$
  update private.creator_sessions set expires_at = now() where token = p_token and expires_at > now();
$$;

create or replace function public.creator_me(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare
  acc uuid := private.creator_from_token(p_token);
begin
  if acc is null then return null; end if;
  return (
    select jsonb_build_object(
      'account', jsonb_build_object('id', a.id, 'email', a.email),
      'profile', jsonb_build_object('slug', p.slug, 'status', p.status, 'tier', p.tier, 'data', p.data, 'attest', p.attest,
        'note', p.review_note, 'submittedAt', p.submitted_at, 'reviewedAt', p.reviewed_at, 'isLive', p.live is not null,
        'hasChanges', p.live is not null and (p.live - 'slug' - 'approvedAt') is distinct from p.data))
    from creator_accounts a join creator_profiles p on p.account_id = a.id where a.id = acc);
end;
$$;

create or replace function public.creator_save(p_token uuid, p_data jsonb, p_attest jsonb, p_submit boolean default false) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  acc uuid := private.creator_from_token(p_token);
  clean jsonb;
  cur record;
  base text;
  s text;
  i int := 1;
  reserved text[] := array['clips', 'browse', 'from', 'new', 'trending', 'faq', 'about', 'privacy', 'terms', 'admin', 'vip', 'apply', 'api', 'go', 'media', 'llms', 'sitemap', 'robots', 'more', 'members', 'blog', 'creator', 'm'];
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
            and coalesce((p_attest->>'everyone_adult')::boolean, false) and coalesce((p_attest->>'non_explicit')::boolean, false)) then
      raise exception 'Tick all four boxes to submit.';
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
    attest = case when p_attest is not null then p_attest || jsonb_build_object('at', now()) else attest end,
    status = case when p_submit then 'pending' when status in ('rejected', 'unpublished') then 'draft' else status end,
    submitted_at = case when p_submit then now() else submitted_at end,
    updated_at = now()
  where account_id = acc;
  return public.creator_me(p_token);
end;
$$;

-- ---------------------------------------------------------------- owner RPCs
create or replace function public.admin_creators(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  if not private.admin_ok(p_token) then return null; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'email', a.email, 'slug', p.slug, 'status', p.status, 'tier', p.tier, 'data', p.data, 'isLive', p.live is not null,
      'age', private.age_from(p.data->>'dob'), 'attest', p.attest, 'note', p.review_note,
      'submittedAt', p.submitted_at, 'reviewedAt', p.reviewed_at, 'createdAt', p.created_at, 'updatedAt', p.updated_at)
      order by (p.status = 'pending') desc, p.updated_at desc)
    from creator_profiles p join creator_accounts a on a.id = p.account_id
    where p.status <> 'draft' or p.data <> '{}'::jsonb), '[]'::jsonb);
end;
$$;

create or replace function public.admin_creator_review(p_token uuid, p_account uuid, p_action text, p_tier text default null, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  cur record;
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
  elsif p_action = 'changes' then
    update creator_profiles set status = 'changes', review_note = left(p_note, 1000), reviewed_at = now(), updated_at = now() where account_id = p_account;
  elsif p_action = 'reject' then
    update creator_profiles set status = 'rejected', live = null, review_note = left(p_note, 1000), reviewed_at = now(), updated_at = now() where account_id = p_account;
  elsif p_action = 'unpublish' then
    update creator_profiles set status = 'unpublished', live = null, reviewed_at = now(), updated_at = now() where account_id = p_account;
  elsif p_action = 'tier' then
    update creator_profiles set tier = p_tier, updated_at = now() where account_id = p_account and p_tier in ('public', 'hidden');
  else
    raise exception 'unknown action';
  end if;
  return (select jsonb_build_object('status', status, 'tier', tier, 'isLive', live is not null) from creator_profiles where account_id = p_account);
end;
$$;

-- The Cloudflare Pages deploy hook lives in private.settings (key 'pages_deploy_hook').
create or replace function public.admin_deploy_hook(p_token uuid) returns text
language sql stable security definer set search_path = private as $$
  select value from private.settings where key = 'pages_deploy_hook' and private.admin_ok(p_token);
$$;

create or replace function public.admin_upsert_locked(p_token uuid, p_rows jsonb, p_replace boolean default true) returns integer
language plpgsql security definer set search_path = public as $$
declare
  n int := 0;
  r jsonb;
  slugs text[] := '{}';
begin
  if not private.admin_ok(p_token) then
    raise exception 'not authorized';
  end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    if coalesce(r->>'slug', '') = '' or coalesce(r->>'name', '') = '' or coalesce(r->>'fansUrl', '') !~ '^https?://' then
      continue;
    end if;
    if (r->>'age') is not null and (r->>'age')::int < 18 then
      continue;
    end if;
    insert into vip_creators as v (slug, name, handle, tagline, bio, age, location, region, height, hair, eyes, tags, fans_url, free, badge,
                                   photos, clips, socials, sort, added_at, active, placeholder, updated_at)
    values (
      r->>'slug', r->>'name', r->>'handle', coalesce(r->>'tagline', ''), r->>'bio', (r->>'age')::int, r->>'location', r->>'region',
      r->>'height', r->>'hair', r->>'eyes',
      coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(r->'tags', '[]'::jsonb)) x), '{}'),
      r->>'fansUrl', coalesce((r->>'free')::boolean, true), r->>'badge',
      coalesce(r->'photos', '[]'::jsonb), coalesce(r->'clips', '[]'::jsonb), coalesce(r->'socials', '{}'::jsonb),
      coalesce((r->>'featured')::int, n), coalesce((r->>'addedAt')::date, current_date), true, false, now()
    )
    on conflict (slug) do update set
      name = excluded.name, handle = excluded.handle, tagline = excluded.tagline, bio = excluded.bio, age = excluded.age,
      location = excluded.location, region = excluded.region, height = excluded.height, hair = excluded.hair, eyes = excluded.eyes,
      tags = excluded.tags, fans_url = excluded.fans_url, free = excluded.free, badge = excluded.badge, photos = excluded.photos,
      clips = excluded.clips, socials = excluded.socials, sort = excluded.sort, active = true, placeholder = false, updated_at = now();
    slugs := slugs || (r->>'slug');
    n := n + 1;
  end loop;
  if p_replace and n > 0 then
    update vip_creators set active = false, updated_at = now() where active and not (slug = any(slugs));
  end if;
  return n;
end;
$$;

-- ---------------------------------------------------------------- site RPCs
-- Approved public-tier profiles, pulled at build time into data/self-serve.json.
create or replace function public.public_profiles() returns jsonb
language sql stable security definer set search_path = public, private as $$
  select coalesce(jsonb_agg(private.creator_public(live, slug, false, reviewed_at) order by reviewed_at), '[]'::jsonb)
  from creator_profiles where live is not null and tier = 'public' and status <> 'unpublished';
$$;

-- Hidden-tier creators (sheet rows + approved hidden self-serve), only for an unlocked visitor.
create or replace function public.locked_creators(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  if p_token is null or not exists (select 1 from leads where unlock_token = p_token) then
    return null;
  end if;
  return coalesce((
    select jsonb_agg(c) from (
      select jsonb_strip_nulls(jsonb_build_object(
        'slug', slug, 'name', name, 'handle', handle, 'tagline', tagline, 'bio', coalesce(bio, tagline),
        'age', age, 'location', location, 'region', region, 'height', height, 'hair', hair, 'eyes', eyes,
        'tags', to_jsonb(tags), 'fansUrl', fans_url, 'free', free, 'badge', badge, 'featured', sort,
        'addedAt', added_at, 'updatedAt', to_char(updated_at, 'YYYY-MM-DD'),
        'socials', socials, 'photos', photos, 'clips', clips, 'placeholder', placeholder, 'locked', true)) c
      from vip_creators where active
      union all
      select private.creator_public(live, slug, true, reviewed_at)
      from creator_profiles where live is not null and tier = 'hidden' and status <> 'unpublished'
    ) t), '[]'::jsonb);
end;
$$;

create or replace function public.locked_summary() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'count', (select count(*) from vip_creators where active) + (select count(*) from creator_profiles where live is not null and tier = 'hidden' and status <> 'unpublished'),
    'free', (select count(*) from vip_creators where active and free)
  );
$$;

create or replace function public.vip_fans_url(p_slug text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select fans_url from vip_creators where slug = p_slug and active),
    (select live->>'fansUrl' from creator_profiles where slug = p_slug and live is not null and status <> 'unpublished'));
$$;

-- Real numbers only: people on the site in the last 5 minutes, visitors today, hidden creators.
create or replace function public.live_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'now', (select count(distinct visitor_id) from sessions where last_seen_at > now() - interval '5 minutes' and not is_bot),
    'today', (select count(distinct visitor_id) from sessions where started_at >= date_trunc('day', now()) and not is_bot),
    'members', (select count(*) from vip_creators where active) + (select count(*) from creator_profiles where live is not null and tier = 'hidden' and status <> 'unpublished')
  );
$$;

-- ---------------------------------------------------------------- who can call what
do $$
declare f text;
begin
  foreach f in array array[
    'public.creator_signup(text,text)', 'public.creator_login(text,text)', 'public.creator_logout(uuid)', 'public.creator_me(uuid)',
    'public.creator_save(uuid,jsonb,jsonb,boolean)', 'public.admin_creators(uuid)', 'public.admin_creator_review(uuid,uuid,text,text,text)',
    'public.admin_deploy_hook(uuid)', 'public.admin_upsert_locked(uuid,jsonb,boolean)', 'public.public_profiles()',
    'public.locked_creators(uuid)', 'public.locked_summary()', 'public.vip_fans_url(text)', 'public.live_stats()'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
