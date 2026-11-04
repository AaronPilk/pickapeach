-- Leads list and CSV export now carry the plain-English traffic source ("ChatGPT", "Traffic Junky (paid ad)").

create or replace function public.admin_leads(p_token uuid, p_limit integer default 500) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.admin_ok(p_token) then return null; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t)) from (
      select created_at, kind, email, phone, name, consent, consent_at, do_not_contact, opted_out_at, erased_at,
             channel, source_label, source, medium, campaign, origin, creator, page, country, region, city, device, query, extra
      from leads order by created_at desc limit greatest(1, least(p_limit, 10000))
    ) t), '[]'::jsonb);
end;
$$;

create or replace function public.admin_leads_export(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not private.admin_ok(p_token) then return null; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t)) from (
      select created_at, kind, email, phone, name, consent, consent_at, consent_text, source_label, channel,
             source, medium, campaign, origin, creator, country, region, city, device, page
      from leads where kind = 'vip' and consent and not do_not_contact and erased_at is null
      order by created_at desc limit 50000
    ) t), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_leads(uuid, integer) from public, anon, authenticated;
revoke all on function public.admin_leads_export(uuid) from public, anon, authenticated;
grant execute on function public.admin_leads(uuid, integer) to service_role;
grant execute on function public.admin_leads_export(uuid) to service_role;
