-- Plain-English traffic sources + bot filtering (2026-11-04).
-- sessions.channel     ai | search | paid | social | adult | creator | email | referral | direct
-- sessions.source_label  "ChatGPT", "Google Search", "Traffic Junky (paid ad)", "Instagram app", "somesite.com", ...
-- sessions.engaged     the visitor actually touched, scrolled or typed (a strong "real person" signal)
-- sessions.bot_reason  why a visit was treated as a bot (crawler, headless, datacenter, trap, ...)

alter table public.sessions
  add column if not exists channel text,
  add column if not exists source_label text,
  add column if not exists ad_network text,
  add column if not exists engaged boolean not null default false,
  add column if not exists bot_reason text;
alter table public.leads
  add column if not exists channel text,
  add column if not exists source_label text;
create index if not exists sessions_started_bot_idx on public.sessions (started_at desc, is_bot);
create index if not exists events_type_ts_idx on public.events (type, ts desc);

-- Connections that fell into the honeypot link today. Anything from them is treated as a bot.
create table if not exists private.bot_ips (
  ip_hash text not null,
  day date not null default current_date,
  reason text,
  at timestamptz not null default now(),
  primary key (ip_hash, day)
);

create or replace function private.is_trapped() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.ip_hash() is not null and exists (select 1 from private.bot_ips where ip_hash = private.ip_hash() and day = current_date);
$$;

-- Called by the Worker when something follows the hidden honeypot link.
create or replace function public.flag_bot(p_reason text default 'trap') returns void
language plpgsql security definer set search_path = '' as $$
declare
  ih text := private.ip_hash();
begin
  if ih is null then return; end if;
  insert into private.bot_ips (ip_hash, reason) values (ih, left(coalesce(p_reason, 'trap'), 40)) on conflict (ip_hash, day) do nothing;
  update public.sessions set is_bot = true, bot_reason = coalesce(bot_reason, 'honeypot')
  where ip_hash = ih and started_at >= current_date and not is_bot;
end;
$$;

-- One-time backfill for visits recorded before labels existed (rough, from the stored source/medium/referrer).
update public.sessions set
  channel = case
    when source in ('chatgpt', 'chatgpt.com', 'openai', 'perplexity', 'claude', 'gemini', 'copilot') or medium = 'ai' then 'ai'
    when medium = 'organic' then 'search'
    when medium in ('cpc', 'cpm', 'ppc', 'paid', 'display', 'banner', 'native', 'pop', 'push') then 'paid'
    when medium = 'social' then 'social'
    when medium = 'referral' then 'referral'
    when source = 'direct' or source is null then 'direct'
    else 'referral' end,
  source_label = case
    when source = 'direct' or source is null then 'Direct / unknown'
    when source in ('chatgpt', 'chatgpt.com', 'openai') then 'ChatGPT'
    when source = 'google' and medium = 'organic' then 'Google Search'
    else source end
where channel is null;

create or replace function public.ingest(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  sid text := left(p->>'s', 64);
  vid text := left(p->>'v', 64);
  a jsonb := coalesce(p->'att', '{}'::jsonb);
  x jsonb := coalesce(p->'enr', '{}'::jsonb);
  evs jsonb := coalesce(p->'e', '[]'::jsonb);
  trapped boolean := private.is_trapped();
  bot boolean;
  why text;
  n_events int;
  n_pv int;
  engaged_now boolean;
begin
  if sid is null or vid is null or jsonb_typeof(evs) <> 'array' then
    return;
  end if;
  if jsonb_array_length(evs) > 60 then
    evs := (select jsonb_agg(v) from (select v from jsonb_array_elements(evs) v limit 60) t);
  end if;
  bot := coalesce((x->>'is_bot')::boolean, false) or trapped;
  why := case when trapped then 'honeypot' else nullif(left(x->>'bot_reason', 40), '') end;

  select count(*), count(*) filter (where v->>'t' = 'page_view'), bool_or(v->>'t' = 'engage')
    into n_events, n_pv, engaged_now
    from jsonb_array_elements(evs) v;

  insert into sessions as s (
    id, visitor_id, source, medium, campaign, content, term, click_id, landing_path, referrer, referrer_host,
    query, first_touch, first_source, country, region, city, postal, timezone, asn_org, colo, device, os, browser,
    is_bot, bot_reason, screen, lang, net, ip_hash, pageviews, events, channel, source_label, ad_network, engaged
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
    bot, case when bot then why end, left(x->>'screen', 30), left(x->>'lang', 20), left(x->>'net', 10),
    private.ip_hash(), n_pv, n_events,
    nullif(left(a->>'channel', 20), ''), nullif(left(a->>'label', 80), ''), nullif(left(a->>'ad_network', 60), ''), coalesce(engaged_now, false)
  )
  on conflict (id) do update set
    last_seen_at = now(),
    pageviews = s.pageviews + excluded.pageviews,
    events = s.events + excluded.events,
    source = case when s.source = 'direct' and excluded.source <> 'direct' then excluded.source else s.source end,
    channel = case when coalesce(s.channel, 'direct') = 'direct' and excluded.channel is not null then excluded.channel else s.channel end,
    source_label = case when coalesce(s.channel, 'direct') = 'direct' and excluded.source_label is not null then excluded.source_label else s.source_label end,
    ad_network = coalesce(s.ad_network, excluded.ad_network),
    medium = coalesce(s.medium, excluded.medium),
    campaign = coalesce(s.campaign, excluded.campaign),
    content = coalesce(s.content, excluded.content),
    term = coalesce(s.term, excluded.term),
    query = coalesce(s.query, excluded.query),
    first_touch = coalesce(s.first_touch, excluded.first_touch),
    first_source = coalesce(s.first_source, excluded.first_source),
    landing_path = coalesce(s.landing_path, excluded.landing_path),
    screen = coalesce(s.screen, excluded.screen),
    engaged = s.engaged or excluded.engaged,
    is_bot = s.is_bot or excluded.is_bot,
    bot_reason = coalesce(s.bot_reason, excluded.bot_reason);

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

-- Leads: same checks as before, plus honeypot connections are refused, and the visit's source label is copied over.
create or replace function public.submit_lead(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare
  k text := case when p->>'kind' = 'creator' then 'creator' else 'vip' end;
  em text := lower(trim(p->>'email'));
  ph text := private.norm_phone(p->>'phone');
  ih text := private.ip_hash();
  agreed boolean := coalesce((p->>'consent')::boolean, false);
  cur record;
  ses record;
  tok uuid;
begin
  if private.is_trapped() then raise exception 'blocked'; end if;
  if em is null or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then raise exception 'Enter a valid email.'; end if;
  if k = 'vip' then
    if ph is null then raise exception 'Enter a valid phone number.'; end if;
    if not agreed or coalesce(p->>'consent_text', '') = '' then raise exception 'Tick the box to unlock.'; end if;
  end if;
  if ih is not null and (select count(*) from leads where ip_hash = ih and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many sign-ups from your connection. Try again in an hour.';
  end if;

  select channel, source_label, source, medium, campaign, query into ses from sessions where id = left(p->>'session_id', 64);

  if k = 'vip' then
    select unlock_token, phone into cur from leads where kind = 'vip' and lower(email) = em;
    if cur.unlock_token is not null then
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
                     session_id, visitor_id, origin, creator, page, country, region, city, device, ip_hash, user_agent, extra,
                     channel, source_label)
  values (
    k, em, coalesce(ph, left(p->>'phone', 32)), left(p->>'name', 120), agreed, left(p->>'consent_text', 1000), case when agreed then now() end,
    coalesce(ses.source, left(p->>'source', 120)), coalesce(ses.medium, left(p->>'medium', 120)), coalesce(ses.campaign, left(p->>'campaign', 200)),
    coalesce(ses.query, case when jsonb_typeof(p->'query') = 'object' then p->'query' end),
    case when jsonb_typeof(p->'first_touch') = 'object' then p->'first_touch' end,
    left(p->>'session_id', 64), left(p->>'visitor_id', 64), left(p->>'origin', 60), left(p->>'creator', 80), left(p->>'page', 300),
    left(p->>'country', 8), left(p->>'region', 80), left(p->>'city', 80), left(p->>'device', 20), ih,
    left(p->>'user_agent', 400),
    case when jsonb_typeof(p->'extra') = 'object' then p->'extra' end,
    coalesce(ses.channel, nullif(left(p->>'channel', 20), ''), 'direct'),
    coalesce(ses.source_label, nullif(left(p->>'label', 80), ''), 'Direct / unknown')
  )
  returning unlock_token into tok;

  return jsonb_build_object('token', tok, 'existing', false);
end;
$$;

create or replace function public.creator_signup_check() returns boolean
language sql stable security definer set search_path = '' as $$
  select not private.is_trapped();
$$;

-- Everything the Traffic page needs, for the chosen period and the one before it (for the % change).
create or replace function public.admin_traffic(p_token uuid, p_days integer default 7) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d int := greatest(1, least(coalesce(p_days, 7), 365));
  since timestamptz := date_trunc('day', now()) - make_interval(days => d - 1);
  prev timestamptz := since - make_interval(days => d);
  res jsonb;
begin
  if not private.admin_ok(p_token) then return null; end if;

  with s_all as (
    select id, visitor_id, started_at, is_bot, bot_reason, engaged, pageviews, campaign, content, term, medium, landing_path, country, device,
           coalesce(channel, 'direct') channel, coalesce(source_label, 'Direct / unknown') label, ad_network,
           case when visitor_id = 'anon' then id else visitor_id end who
    from sessions where started_at >= prev
  ),
  s as (select * from s_all where started_at >= since and not is_bot),
  sp as (select * from s_all where started_at < since and not is_bot),
  go as (select session_id, count(*) n, max(ts) last from events where type = 'go' and ts >= prev group by session_id),
  l_all as (select created_at, coalesce(channel, 'direct') channel, coalesce(source_label, 'Direct / unknown') label, session_id
            from leads where kind = 'vip' and created_at >= prev and erased_at is null),
  l as (select * from l_all where created_at >= since),
  lp as (select * from l_all where created_at < since),
  per_source as (
    select s.channel, s.label,
           count(distinct s.who) visitors,
           count(*) sessions,
           count(*) filter (where s.engaged) engaged,
           coalesce(sum(s.pageviews), 0) pageviews,
           coalesce(sum(go.n), 0) clicks,
           count(*) filter (where go.n > 0) clicking_sessions
    from s left join go on go.session_id = s.id
    group by s.channel, s.label
  ),
  per_source_leads as (select channel, label, count(*) leads from l group by channel, label)
  select jsonb_build_object(
    'since', since, 'days', d,
    'totals', jsonb_build_object(
      'visitors', (select count(distinct who) from s),
      'sessions', (select count(*) from s),
      'engaged', (select count(*) from s where engaged),
      'pageviews', (select coalesce(sum(pageviews), 0) from s),
      'clicks', (select coalesce(sum(go.n), 0) from s join go on go.session_id = s.id),
      'clicking_sessions', (select count(*) from s join go on go.session_id = s.id),
      'leads', (select count(*) from l),
      'bots', (select count(*) from s_all where started_at >= since and is_bot)
    ),
    'previous', jsonb_build_object(
      'visitors', (select count(distinct who) from sp),
      'sessions', (select count(*) from sp),
      'engaged', (select count(*) from sp where engaged),
      'clicks', (select coalesce(sum(go.n), 0) from sp join go on go.session_id = sp.id),
      'leads', (select count(*) from lp),
      'bots', (select count(*) from s_all where started_at < since and is_bot)
    ),
    'daily', coalesce((
      select jsonb_agg(x order by x->>'day') from (
        select jsonb_build_object(
          'day', to_char(g.day, 'YYYY-MM-DD'),
          'visitors', (select count(distinct who) from s where date_trunc('day', started_at) = g.day),
          'clicks', (select coalesce(sum(go.n), 0) from s join go on go.session_id = s.id where date_trunc('day', s.started_at) = g.day),
          'leads', (select count(*) from l where date_trunc('day', created_at) = g.day),
          'bots', (select count(*) from s_all where is_bot and date_trunc('day', started_at) = g.day)
        ) x
        from generate_series(since, date_trunc('day', now()), interval '1 day') g(day)
      ) t), '[]'::jsonb),
    'channels', coalesce((
      select jsonb_agg(x order by (x->>'visitors')::int desc) from (
        select jsonb_build_object('channel', ps.channel, 'visitors', sum(ps.visitors), 'sessions', sum(ps.sessions), 'engaged', sum(ps.engaged),
               'clicks', sum(ps.clicks), 'leads', coalesce((select count(*) from l where l.channel = ps.channel), 0)) x
        from per_source ps group by ps.channel
      ) t), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(x order by (x->>'visitors')::int desc) from (
        select jsonb_build_object('channel', ps.channel, 'label', ps.label, 'visitors', ps.visitors, 'sessions', ps.sessions, 'engaged', ps.engaged,
               'pageviews', ps.pageviews, 'clicks', ps.clicks, 'clicking_sessions', ps.clicking_sessions, 'leads', coalesce(psl.leads, 0)) x
        from per_source ps left join per_source_leads psl on psl.channel = ps.channel and psl.label = ps.label
        limit 200
      ) t), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(x order by (x->>'sessions')::int desc) from (
        select jsonb_build_object('label', s.label, 'campaign', s.campaign, 'content', s.content, 'term', s.term,
               'visitors', count(distinct s.who), 'sessions', count(*), 'engaged', count(*) filter (where s.engaged),
               'clicks', coalesce(sum(go.n), 0),
               'leads', (select count(*) from l where l.session_id in (select s2.id from s s2 where s2.label = s.label and s2.campaign is not distinct from s.campaign))) x
        from s left join go on go.session_id = s.id
        where s.campaign is not null or s.channel = 'paid'
        group by s.label, s.campaign, s.content, s.term
        limit 100
      ) t), '[]'::jsonb),
    'landing', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('path', coalesce(landing_path, '/'), 'sessions', count(*), 'clicks', coalesce(sum(go.n), 0)) x
        from s left join go on go.session_id = s.id group by landing_path order by count(*) desc limit 15
      ) t), '[]'::jsonb),
    'bots', coalesce((
      select jsonb_agg(x order by (x->>'sessions')::int desc) from (
        select jsonb_build_object('reason', coalesce(bot_reason, 'crawler'), 'sessions', count(*)) x
        from s_all where started_at >= since and is_bot group by coalesce(bot_reason, 'crawler')
      ) t), '[]'::jsonb)
  ) into res;
  return res;
end;
$$;

revoke all on function private.is_trapped() from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['public.flag_bot(text)', 'public.admin_traffic(uuid,integer)', 'public.creator_signup_check()'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- Live feed: plain-English source label, bot flag, and no noisy impression/page_leave rows.
create or replace function public.admin_recent(p_token uuid, p_limit integer default 60) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.admin_ok(p_token) then
    return null;
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t)) from (
      select ev.ts, ev.type, ev.path, ev.creator, ev.meta, s.source, s.campaign, s.country, s.city, s.device,
             coalesce(s.source_label, 'Direct / unknown') as source_label, coalesce(s.channel, 'direct') as channel,
             coalesce(s.is_bot, false) as is_bot, s.bot_reason, s.engaged
      from events ev left join sessions s on s.id = ev.session_id
      where ev.type not in ('page_leave', 'impression')
      order by ev.ts desc limit greatest(1, least(p_limit, 500))
    ) t), '[]'::jsonb);
end;
$$;
