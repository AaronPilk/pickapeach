-- Honeypot trap: safer on shared mobile IPs.
-- Carriers put thousands of phones behind one IP (CGNAT). The trap now keys on the hashed IP plus the browser's
-- user agent, and a visit that taps, scrolls or types is never treated as a bot because of the trap.

create or replace function private.trap_key() returns text
language sql stable security definer set search_path = '' as $$
  select case when private.ip_hash() is null then null
    else private.ip_hash() || ':' || left(md5(coalesce(nullif(current_setting('request.headers', true), '')::json->>'x-pp-ua', '')), 12) end;
$$;

create or replace function private.is_trapped() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.trap_key() is not null and exists (select 1 from private.bot_ips where ip_hash = private.trap_key() and day = current_date);
$$;

create or replace function public.flag_bot(p_reason text default 'trap') returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text := private.trap_key();
begin
  if k is null then return; end if;
  insert into private.bot_ips (ip_hash, reason) values (k, left(coalesce(p_reason, 'trap'), 40)) on conflict (ip_hash, day) do nothing;
  -- Only today's visits from that IP that never interacted.
  update public.sessions set is_bot = true, bot_reason = coalesce(bot_reason, 'honeypot')
  where ip_hash = private.ip_hash() and started_at >= current_date and not is_bot and not engaged;
end;
$$;

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
  select count(*), count(*) filter (where v->>'t' = 'page_view'), bool_or(v->>'t' = 'engage')
    into n_events, n_pv, engaged_now
    from jsonb_array_elements(evs) v;
  engaged_now := coalesce(engaged_now, false);

  -- A trapped connection only marks visits that never interact. Someone who taps, scrolls or types is a person,
  -- even if a bot on the same mobile-carrier IP and phone model hit the trap earlier that day.
  bot := coalesce((x->>'is_bot')::boolean, false) or (trapped and not engaged_now);
  why := case when coalesce((x->>'is_bot')::boolean, false) then coalesce(nullif(left(x->>'bot_reason', 40), ''), 'crawler') when trapped then 'honeypot' end;

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
    nullif(left(a->>'channel', 20), ''), nullif(left(a->>'label', 80), ''), nullif(left(a->>'ad_network', 60), ''), engaged_now
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
    -- An engaged visit is only kept as a bot for a real signal (crawler, automation, datacenter), never for the trap alone.
    is_bot = case
      when (s.engaged or excluded.engaged) and coalesce(s.bot_reason, 'honeypot') = 'honeypot' and coalesce(excluded.bot_reason, 'honeypot') = 'honeypot' then false
      else s.is_bot or excluded.is_bot end,
    bot_reason = case
      when (s.engaged or excluded.engaged) and coalesce(s.bot_reason, 'honeypot') = 'honeypot' and coalesce(excluded.bot_reason, 'honeypot') = 'honeypot' then null
      else coalesce(s.bot_reason, excluded.bot_reason) end;

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
  -- Trapped connections are refused unless this visit already showed real interaction (see ingest).
  if private.is_trapped() and not coalesce((select engaged from sessions where id = left(p->>'session_id', 64)), false) then
    raise exception 'blocked';
  end if;
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

revoke all on function private.trap_key() from public, anon, authenticated;
revoke all on function private.is_trapped() from public, anon, authenticated;
revoke all on function public.flag_bot(text) from public, anon, authenticated;
revoke all on function public.ingest(jsonb) from public, anon, authenticated;
revoke all on function public.submit_lead(jsonb) from public, anon, authenticated;
grant execute on function public.flag_bot(text) to service_role;
grant execute on function public.ingest(jsonb) to service_role;
grant execute on function public.submit_lead(jsonb) to service_role;
