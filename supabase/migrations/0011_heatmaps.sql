-- Heatmaps: where people tap on each page, what they tap most, and how far down they get.
-- Taps come in as 'tap' events (meta: x = share of screen width, cx = px from the centre line, y = px from the top
-- of the page, fx = tapped something pinned to the screen, el = what was tapped, dead = not a button or link).
-- Scroll reach comes from 'page_leave' (depth %, my = lowest px seen, vh = screen height).

create index if not exists events_type_path_ts_idx on public.events (type, path, ts desc);

create or replace function public.admin_heatmap(p_token uuid, p_path text default '/', p_device text default 'mobile', p_days int default 7)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)));
  dev text := case when p_device in ('mobile', 'desktop', 'tablet') then p_device else 'mobile' end;
  pth text := left(coalesce(nullif(p_path, ''), '/'), 300);
begin
  if not private.admin_ok(p_token) then return null; end if;
  return (
    with ev as (
      select e.session_id, e.type, e.path, e.meta, e.ts
      from events e join sessions s on s.id = e.session_id
      where e.ts >= since and not s.is_bot and coalesce(s.device, 'mobile') = dev
        and e.type in ('page_view', 'tap', 'page_leave')
    ),
    pages as (
      select path, count(*) filter (where type = 'page_view') as views, count(*) filter (where type = 'tap') as taps
      from ev
      where type in ('page_view', 'tap') and path is not null and path not like '/admin%' and path not like '/creator%'
      group by path order by 2 desc, 3 desc limit 40
    ),
    t as (
      select session_id, meta from ev where type = 'tap' and path = pth order by ts desc limit 5000
    ),
    leaves as (
      select session_id,
             max(nullif(meta->>'depth', '')::numeric) as d,
             max(nullif(meta->>'my', '')::numeric) as my,
             max(nullif(meta->>'vh', '')::numeric) as vh,
             max(nullif(meta->>'ms', '')::numeric) as ms
      from ev where type = 'page_leave' and coalesce(meta->>'path', path) = pth
      group by session_id
    )
    select jsonb_build_object(
      'path', pth,
      'device', dev,
      'pages', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'views', views, 'taps', taps)) from pages), '[]'::jsonb),
      'views', (select count(*) from ev where type = 'page_view' and path = pth),
      'visitors', (select count(distinct session_id) from ev where type = 'page_view' and path = pth),
      'tap_count', (select count(*) from t),
      'tappers', (select count(distinct session_id) from t),
      'taps', coalesce((select jsonb_agg(jsonb_build_array(
          round(coalesce(nullif(meta->>'x', '')::numeric, 0.5), 4),
          coalesce(nullif(meta->>'cx', '')::numeric, 0)::int,
          coalesce(nullif(meta->>'y', '')::numeric, 0)::int,
          case when coalesce(meta->>'fx', '') in ('true', '1') then 1 else 0 end,
          case when coalesce(meta->>'dead', '') in ('true', '1') then 1 else 0 end,
          coalesce(nullif(meta->>'vh', '')::numeric, 0)::int)) from t), '[]'::jsonb),
      'top', coalesce((select jsonb_agg(x order by (x->>'taps')::int desc) from (
          select jsonb_build_object(
            'el', coalesce(nullif(meta->>'el', ''), 'Empty space'),
            'dead', bool_or(coalesce(meta->>'dead', '') in ('true', '1')),
            'taps', count(*),
            'people', count(distinct session_id)) as x
          from t group by coalesce(nullif(meta->>'el', ''), 'Empty space')
          order by count(*) desc limit 15) q), '[]'::jsonb),
      'reach', coalesce((select jsonb_agg(jsonb_build_array(coalesce(d, 0), coalesce(my, 0)::int, coalesce(vh, 0)::int))
          from (select * from leaves limit 5000) l), '[]'::jsonb),
      'avg_ms', (select round(avg(least(ms, 1800000))) from leaves where ms > 0)
    )
  );
end;
$$;

revoke all on function public.admin_heatmap(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.admin_heatmap(uuid, text, text, int) to service_role;
