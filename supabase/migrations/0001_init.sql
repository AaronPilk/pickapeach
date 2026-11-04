-- Pick a Peach: tracking, leads, VIP content, admin.
-- Every table has RLS on and no policies, so nothing is readable or writable with
-- the public key directly. The Worker talks to the database only through the
-- SECURITY DEFINER functions below.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------- Sessions: one row per visit, holds the traffic source ----------
create table if not exists public.sessions (
  id text primary key,
  visitor_id text not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  source text not null default 'direct',
  medium text,
  campaign text,
  content text,
  term text,
  click_id text,
  landing_path text,
  referrer text,
  referrer_host text,
  query jsonb,
  first_touch jsonb,
  first_source text,
  country text,
  region text,
  city text,
  postal text,
  timezone text,
  asn_org text,
  colo text,
  device text,
  os text,
  browser text,
  is_bot boolean not null default false,
  screen text,
  lang text,
  net text,
  ip_hash text,
  pageviews int not null default 0,
  events int not null default 0
);
create index if not exists sessions_started_idx on public.sessions (started_at desc);
create index if not exists sessions_visitor_idx on public.sessions (visitor_id);
create index if not exists sessions_source_idx on public.sessions (source, started_at desc);

-- ---------- Events: every tracked movement ----------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  session_id text not null,
  visitor_id text not null,
  type text not null,
  path text,
  creator text,
  meta jsonb
);
create index if not exists events_ts_idx on public.events (ts desc);
create index if not exists events_type_ts_idx on public.events (type, ts desc);
create index if not exists events_creator_idx on public.events (creator, type, ts desc) where creator is not null;
create index if not exists events_session_idx on public.events (session_id);

-- ---------- Leads: VIP unlocks + creator applications ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null default 'vip' check (kind in ('vip', 'creator')),
  email text,
  phone text,
  name text,
  consent boolean not null default false,
  consent_text text,
  source text,
  medium text,
  campaign text,
  query jsonb,
  first_touch jsonb,
  session_id text,
  visitor_id text,
  origin text,
  creator text,
  page text,
  country text,
  region text,
  city text,
  device text,
  ip_hash text,
  user_agent text,
  unlock_token uuid not null default gen_random_uuid(),
  extra jsonb
);
create unique index if not exists leads_vip_email_uidx on public.leads (lower(email)) where kind = 'vip';
create index if not exists leads_created_idx on public.leads (created_at desc);
create unique index if not exists leads_token_uidx on public.leads (unlock_token);

-- ---------- VIP content (lives here, not in the public repo) ----------
create table if not exists public.vip_items (
  id bigint generated always as identity primary key,
  creator_slug text not null,
  kind text not null check (kind in ('photo', 'clip')),
  src text not null,
  poster text,
  w int not null default 1080,
  h int not null default 1350,
  duration numeric,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists vip_items_creator_idx on public.vip_items (creator_slug, sort);

-- Outside creators who agreed to be listed behind the gate.
create table if not exists public.vip_creators (
  slug text primary key,
  name text not null,
  tagline text not null default '',
  fans_url text not null check (fans_url ~ '^https?://'),
  photo text,
  location text,
  age int check (age is null or age >= 18),
  sort int not null default 0,
  active boolean not null default true,
  consent_note text,
  created_at timestamptz not null default now()
);

-- ---------- Admin ----------
create table if not exists private.settings (key text primary key, value text not null);
create table if not exists private.admin_sessions (
  token uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);
create table if not exists private.admin_attempts (at timestamptz not null default now(), ok boolean not null);

alter table public.sessions enable row level security;
alter table public.events enable row level security;
alter table public.leads enable row level security;
alter table public.vip_items enable row level security;
alter table public.vip_creators enable row level security;

-- =====================================================================
-- Functions
-- =====================================================================

-- Batch of tracking events from the Worker.
create or replace function public.ingest(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
    left(x->>'ip_hash', 64), n_pv, n_events
  )
  on conflict (id) do update set
    last_seen_at = now(),
    pageviews = s.pageviews + excluded.pageviews,
    events = s.events + excluded.events,
    -- fill in attribution if the first batch for this session arrived without it
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

-- VIP unlock / creator application. Returns the visitor's unlock token.
create or replace function public.submit_lead(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k text := coalesce(p->>'kind', 'vip');
  em text := lower(trim(p->>'email'));
  tok uuid;
  existed boolean := false;
begin
  if em is null or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  if k = 'vip' then
    select unlock_token into tok from leads where kind = 'vip' and lower(email) = em;
    if tok is not null then
      existed := true;
      update leads set
        phone = coalesce(nullif(p->>'phone', ''), phone),
        consent = consent or coalesce((p->>'consent')::boolean, false),
        consent_text = coalesce(p->>'consent_text', consent_text),
        updated_at = now()
      where unlock_token = tok;
      return jsonb_build_object('token', tok, 'existing', true);
    end if;
  end if;

  insert into leads (kind, email, phone, name, consent, consent_text, source, medium, campaign, query, first_touch,
                     session_id, visitor_id, origin, creator, page, country, region, city, device, ip_hash, user_agent, extra)
  values (
    k, em, left(p->>'phone', 32), left(p->>'name', 120), coalesce((p->>'consent')::boolean, false), left(p->>'consent_text', 1000),
    left(p->>'source', 120), left(p->>'medium', 120), left(p->>'campaign', 200),
    case when jsonb_typeof(p->'query') = 'object' then p->'query' end,
    case when jsonb_typeof(p->'first_touch') = 'object' then p->'first_touch' end,
    left(p->>'session_id', 64), left(p->>'visitor_id', 64), left(p->>'origin', 60), left(p->>'creator', 80), left(p->>'page', 300),
    left(p->>'country', 8), left(p->>'region', 80), left(p->>'city', 80), left(p->>'device', 20), left(p->>'ip_hash', 64),
    left(p->>'user_agent', 400),
    case when jsonb_typeof(p->'extra') = 'object' then p->'extra' end
  )
  returning unlock_token into tok;

  -- Fill session source onto the lead when the Worker didn't send one.
  update leads l set source = s.source, medium = s.medium, campaign = s.campaign, query = coalesce(l.query, s.query)
  from sessions s
  where l.unlock_token = tok and l.source is null and s.id = l.session_id;

  return jsonb_build_object('token', tok, 'existing', existed);
end;
$$;

create or replace function public.vip_check(p_token uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from leads where unlock_token = p_token);
$$;

create or replace function public.vip_content(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from leads where unlock_token = p_token) then
    return null;
  end if;
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_object_agg(creator_slug, items) from (
        select creator_slug, jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'kind', kind, 'src', src, 'poster', poster, 'w', w, 'h', h, 'duration', duration)) order by sort, id) items
        from vip_items where active group by creator_slug
      ) t), '{}'::jsonb),
    'creators', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'slug', slug, 'name', name, 'tagline', tagline, 'fansUrl', fans_url, 'photo', photo, 'location', location, 'age', age)) order by sort, name)
      from vip_creators where active), '[]'::jsonb)
  );
end;
$$;

create or replace function public.vip_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'perCreator', coalesce((
      select jsonb_object_agg(creator_slug, jsonb_build_object('photos', photos, 'clips', clips)) from (
        select creator_slug, count(*) filter (where kind = 'photo') photos, count(*) filter (where kind = 'clip') clips
        from vip_items where active group by creator_slug) t), '{}'::jsonb),
    'lockedCreators', (select count(*) from vip_creators where active)
  );
$$;

create or replace function public.vip_fans_url(p_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select fans_url from vip_creators where slug = p_slug and active;
$$;

-- ---------- Admin ----------
create or replace function private.set_admin_password(p_password text)
returns void
language sql
security definer
set search_path = private, extensions
as $$
  insert into private.settings (key, value) values ('admin_password', extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
  on conflict (key) do update set value = excluded.value;
  update private.admin_sessions set expires_at = now() where expires_at > now();
$$;

create or replace function public.admin_login(p_password text)
returns uuid
language plpgsql
security definer
set search_path = private, extensions
as $$
declare
  h text;
  tok uuid;
begin
  if (select count(*) from private.admin_attempts where not ok and at > now() - interval '15 minutes') >= 8 then
    return null;
  end if;
  select value into h from private.settings where key = 'admin_password';
  if h is null or extensions.crypt(p_password, h) <> h then
    insert into private.admin_attempts (ok) values (false);
    return null;
  end if;
  insert into private.admin_attempts (ok) values (true);
  insert into private.admin_sessions default values returning token into tok;
  return tok;
end;
$$;

create or replace function private.admin_ok(p_token uuid)
returns boolean
language sql
stable
security definer
set search_path = private
as $$
  select exists (select 1 from private.admin_sessions where token = p_token and expires_at > now());
$$;

create or replace function public.admin_stats(p_token uuid, p_days int default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(1, least(p_days, 365)) - 1);
  res jsonb;
begin
  if not private.admin_ok(p_token) then
    return null;
  end if;

  with s as (select * from sessions where started_at >= since and not is_bot),
  e as (select ev.*, s.source from events ev join s on s.id = ev.session_id where ev.ts >= since),
  l as (select * from leads where created_at >= since and kind = 'vip'),
  cps as (select session_id, count(*) n from e where type = 'go' group by session_id),
  per_source as (
    select s.source,
           count(distinct s.visitor_id) visitors,
           count(*) sessions,
           coalesce(sum(s.pageviews), 0) pageviews,
           coalesce(sum(cps.n), 0) clicks,
           (select count(*) from l where coalesce(l.source, 'direct') = s.source) leads
    from s left join cps on cps.session_id = s.id
    group by s.source
  )
  select jsonb_build_object(
    'since', since,
    'totals', jsonb_build_object(
      'visitors', (select count(distinct visitor_id) from s),
      'sessions', (select count(*) from s),
      'pageviews', (select coalesce(sum(pageviews), 0) from s),
      'profile_views', (select count(*) from e where type = 'profile_view'),
      'clicks', (select count(*) from e where type = 'go'),
      'clicking_sessions', (select count(distinct session_id) from e where type = 'go'),
      'clip_views', (select count(*) from e where type in ('clip_view', 'video_play')),
      'leads', (select count(*) from l),
      'avg_engaged_s', (select round(avg((meta->>'ms')::numeric) / 1000, 1) from e where type = 'page_leave' and meta ? 'ms'),
      'bots_filtered', (select count(*) from sessions where started_at >= since and is_bot)
    ),
    'daily', coalesce((
      select jsonb_agg(d order by d->>'day') from (
        select jsonb_build_object(
          'day', to_char(g.day, 'YYYY-MM-DD'),
          'visitors', (select count(distinct visitor_id) from s where date_trunc('day', started_at) = g.day),
          'sessions', (select count(*) from s where date_trunc('day', started_at) = g.day),
          'clicks', (select count(*) from e where type = 'go' and date_trunc('day', ts) = g.day),
          'leads', (select count(*) from l where date_trunc('day', created_at) = g.day)
        ) d
        from generate_series(since, date_trunc('day', now()), interval '1 day') g(day)
      ) t), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(to_jsonb(ps) order by ps.visitors desc) from (select * from per_source limit 50) ps), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(c order by (c->>'sessions')::int desc) from (
        select jsonb_build_object('source', s.source, 'campaign', s.campaign, 'sessions', count(*),
               'clicks', coalesce(sum(cps.n), 0)) c
        from s left join cps on cps.session_id = s.id
        where s.campaign is not null group by s.source, s.campaign limit 50
      ) t), '[]'::jsonb),
    'creators', coalesce((
      select jsonb_agg(c order by (c->>'clicks')::int desc, (c->>'profile_views')::int desc) from (
        select jsonb_build_object('creator', creator,
               'impressions', count(*) filter (where type = 'impression'),
               'profile_views', count(*) filter (where type = 'profile_view'),
               'clip_views', count(*) filter (where type in ('clip_view', 'video_play')),
               'social_clicks', count(*) filter (where type = 'social_click'),
               'clicks', count(*) filter (where type = 'go')) c
        from e where creator is not null group by creator
      ) t), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(c) from (select jsonb_build_object('country', coalesce(country, '??'), 'sessions', count(*)) c from s group by country order by count(*) desc limit 15) t), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(c) from (select jsonb_build_object('device', coalesce(device, 'unknown'), 'sessions', count(*)) c from s group by device order by count(*) desc) t), '[]'::jsonb),
    'landing', coalesce((select jsonb_agg(c) from (select jsonb_build_object('path', coalesce(landing_path, '/'), 'sessions', count(*)) c from s group by landing_path order by count(*) desc limit 15) t), '[]'::jsonb),
    'event_types', coalesce((select jsonb_agg(c) from (select jsonb_build_object('type', type, 'count', count(*)) c from e group by type order by count(*) desc) t), '[]'::jsonb)
  ) into res;
  return res;
end;
$$;

create or replace function public.admin_leads(p_token uuid, p_limit int default 500)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.admin_ok(p_token) then
    return null;
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t)) from (
      select created_at, kind, email, phone, name, consent, source, medium, campaign, origin, creator, page, country, region, city, device, query, extra
      from leads order by created_at desc limit greatest(1, least(p_limit, 10000))
    ) t), '[]'::jsonb);
end;
$$;

create or replace function public.admin_recent(p_token uuid, p_limit int default 60)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.admin_ok(p_token) then
    return null;
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t)) from (
      select ev.ts, ev.type, ev.path, ev.creator, ev.meta, s.source, s.campaign, s.country, s.city, s.device
      from events ev left join sessions s on s.id = ev.session_id
      order by ev.ts desc limit greatest(1, least(p_limit, 500))
    ) t), '[]'::jsonb);
end;
$$;

-- Lock everything down, then open only what the Worker needs.
revoke execute on function public.ingest(jsonb), public.submit_lead(jsonb), public.vip_check(uuid), public.vip_content(uuid),
  public.vip_summary(), public.vip_fans_url(text), public.admin_login(text), public.admin_stats(uuid, int),
  public.admin_leads(uuid, int), public.admin_recent(uuid, int) from public, authenticated;
revoke execute on function private.set_admin_password(text), private.admin_ok(uuid) from public, anon, authenticated;
grant execute on function public.ingest(jsonb), public.submit_lead(jsonb), public.vip_check(uuid), public.vip_content(uuid),
  public.vip_summary(), public.vip_fans_url(text), public.admin_login(text), public.admin_stats(uuid, int),
  public.admin_leads(uuid, int), public.admin_recent(uuid, int) to anon;

-- Set the dashboard password (run once in the SQL editor, never commit the real one):
--   select private.set_admin_password('your-password');
