# Pick a Peach

Creator directory built for paid traffic. Mobile first, light (cream) and dark (navy) themes with a coral accent, first-party tracking on every visit, click and lead.

- **Site:** Next.js static export (`out/`), served by a Cloudflare Worker (`worker/index.ts`)
- **Data:** Supabase project `qcuzrmceswanetrmimzn` (Pick A Peach org). Tracking, leads, VIP content, dashboard.
- **Roster:** `data/creators.json`, synced from the Google Sheet

## Adding your creators

1. Make a Google Sheet with a header row. Only `name` and `fans_url` are required:

   | name | tier | slug | handle | tagline | bio | age | location | height | hair | eyes | tags | fans_url | free | badge | featured | added | instagram | tiktok | x | snapchat | reddit | threads | youtube | telegram | photos | clips | clip_posters | active |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

   - `tier`: `agency` (or blank) = shown to everyone. `locked` = members-only, unlocked with email + phone.

   - `tags`, `photos`, `clips`, `clip_posters`: separate with commas, pipes or new lines
   - `photos` / `clips`: direct image/video URLs (Cloudflare R2 recommended). Google Drive share links are converted automatically, but they're slow; use R2 for anything with real traffic.
   - `fans_url`: use an OnlyFans **tracking link** per creator (e.g. `onlyfans.com/name/c12`) so OF reports the clicks too
   - `free`: yes/no. `badge`: new / hot / trending. `active`: set to no to hide someone without deleting the row.
2. Share the sheet as "Anyone with the link can view", then:

   ```bash
   ADMIN_PASSWORD="<dashboard password>" SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0" npm run sync:sheet
   git commit -am "Update roster" && git push   # Cloudflare Pages rebuilds automatically
   ```

   Agency rows go into `data/creators.json` (public, built into the static pages). Locked rows never touch the repo: they're pushed straight to Supabase (`vip_creators`) and served only to visitors who unlocked.

The build refuses to ship if a slug clashes with a page, a fans link is missing, or an age is under 18. While any placeholder creator is still in the roster the whole site is `noindex`; it switches to indexable automatically once the real roster is in.

## The gate (members-only girls)

Agency girls are open to everyone. Every other girl is members-only: she shows up as a blurred "+N members-only girls" card and a home-page section until the visitor adds email + phone. Then she appears in the grid, on `/vip` (Members) and on her own profile at `/more?c=slug`. Her data lives in Supabase `vip_creators`, never in this public repo, so the gate can't be bypassed by viewing source.

Leads land in `leads` (email, phone, consent, traffic source, campaign, geo, which page/creator they unlocked from). Set `LEAD_WEBHOOK_URL` to push every lead to GoHighLevel/Zapier in real time.

## Live bar

The pill above the home headline shows real numbers from tracking (people browsing in the last 5 minutes, visitors today, total creators), refreshed every 60 seconds. "Browsing now" and "visitors today" stay hidden until they clear the floors in `src/lib/config.ts` (`live.nowMin`, `live.todayMin`).

## Blog

`/blog` has written guides (`src/lib/blog.ts`) plus auto-built "Best X creators" and "Best creators in <state>" pages for every vibe/state with 2+ creators. Each article has a quick-answer box, table of contents, FAQ, BlogPosting + FAQPage + Breadcrumb schema, and is listed in the sitemap, `/blog/rss.xml`, `llms.txt` and (full text) `llms-full.txt`. Add a guide by adding an entry to the `guides` array.

## Tracking

Every visit stores the traffic source on the session (UTM tags, ad click IDs, referrer, AI-search referrals like ChatGPT/Perplexity) plus device and geo. Events tracked: page views, card impressions (≥50% visible for 0.8s), card swipes, profile views, photo views, clip opens/plays, feed views, likes, shares, social taps, fans-page clicks (logged server-side at `/go/:slug`, so ad blockers can't drop them), searches, filters, sort changes, gate opens/closes, lead submits, age-gate passes, engaged time and scroll depth per page.

Tag every ad link. Traffic Junky example (their macros fill in the braces):

```
https://pickapeach.com/?utm_source=trafficjunky&utm_medium=cpm&utm_campaign={CampaignID}&utm_content={SpotID}&utm_term={SiteID}
```

Any extra query params are kept too, so you can add `sub1`, `zone_id`, etc.

Conversion pixels: set `NEXT_PUBLIC_PIXEL_FOLLOW` / `NEXT_PUBLIC_PIXEL_LEAD` (space-separated URLs, `{ts}` `{event}` `{creator}` get replaced) and rebuild. `NEXT_PUBLIC_GA_ID` turns on GA4.

## Dashboard

`/admin`: visitors, sessions, clicks, leads by day, by source, by campaign, by creator, countries, devices, landing pages, every event type, live feed, lead CSV export. Change the password in the Supabase SQL editor:

```sql
select private.set_admin_password('new-password');
```

## Deploy

```bash
npm install
npm run deploy        # builds + wrangler deploy
```

Or connect the repo in Cloudflare (Workers & Pages → Create → Import a repository) with build command `npm run build` and deploy command `npx wrangler deploy`; every push to `main` then deploys.

Env (build time, optional): `NEXT_PUBLIC_SITE_URL` (canonical domain, default https://pickapeach.com), `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_PIXEL_FOLLOW`, `NEXT_PUBLIC_PIXEL_LEAD`, `NEXT_PUBLIC_NOINDEX=1`.
Worker secrets (optional): `IP_SALT`, `LEAD_WEBHOOK_URL`.

## Local

```bash
npm run preview       # build + wrangler dev on :8787 (talks to the real Supabase)
npm run placeholders  # regenerate the demo roster
```
