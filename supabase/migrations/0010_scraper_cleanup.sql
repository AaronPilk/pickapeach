-- Re-label past visits with the bot rules added on 2026-11-05.
-- Nothing is deleted: these visits move from the real-people numbers into "Bots blocked".

-- Follow-link scrapers: a visit whose only record is a creator link hit, never a page,
-- with no referrer and no ad tags.
update public.sessions
set is_bot = true, bot_reason = 'link scraper'
where not is_bot
  and pageviews = 0
  and landing_path like '/go/%'
  and coalesce(referrer_host, '') = ''
  and not (coalesce(query, '{}'::jsonb) ?| array['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid', 'ttclid', 'msclkid']);

-- Hosting and proxy networks seen in real traffic.
update public.sessions
set is_bot = true, bot_reason = 'datacenter / VPN'
where not is_bot
  and asn_org ~* '(collyer quay|egihosting|google llc|code200|packethub|clouvider|tefincom|cdnext|ipxo|latitude\.sh|maxihost)';

-- 800x600 is the default headless-browser screen.
update public.sessions
set is_bot = true, bot_reason = 'automated browser'
where not is_bot and screen like '800x600@%';

-- Our own QA visits from the build.
update public.sessions
set is_bot = true, bot_reason = 'internal test'
where not is_bot and source like 'qa-%';

-- Home screen shortcut was tagged utm_source=pwa; it's not an ad.
update public.sessions set channel = 'direct', source_label = 'Home screen app' where source = 'pwa';
update public.leads set channel = 'direct', source_label = 'Home screen app' where source = 'pwa';
