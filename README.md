# Pick a Peach

Creator directory built for paid traffic. Mobile first, light (cream) and dark (navy) themes with a coral accent, first-party tracking on every visit, click and lead.

- **Site:** Next.js static export (`out/`) on Cloudflare Pages (project `pickapeach`), with the Worker in `worker/index.ts` bundled to `out/_worker.js` for the dynamic routes
- **Data:** Supabase project `qcuzrmceswanetrmimzn` (Pick A Peach org). Tracking, leads, hidden girls, creator accounts, dashboard. Schema in `supabase/migrations/`.
- **Media:** creator uploads in R2 bucket `pickapeach-media`, served from `/m/*`
- **Roster:** `data/creators.json` (synced from the Google Sheet) + approved self-serve profiles (`data/self-serve.json`, pulled at build time)

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
   ADMIN_EMAIL="<your owner email>" ADMIN_PASSWORD="<your owner password>" SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0" npm run sync:sheet
   git commit -am "Update roster" && git push   # Cloudflare Pages rebuilds automatically
   ```

   Agency rows go into `data/creators.json` (public, built into the static pages). Locked rows never touch the repo: they're pushed straight to Supabase (`vip_creators`) and served only to visitors who unlocked.

The build refuses to ship if a slug clashes with a page, a fans link is missing, or an age is under 18. While any placeholder creator is still in the roster the whole site is `noindex`; it switches to indexable automatically once the real roster is in.

## Creator Studio (self-serve profiles)

Creators sign up at `/creator` (linked from `/apply`) and build their own profile:

- **Photos:** up to 8. Each one goes through a crop screen locked to 4:5, then is re-encoded in the browser as a 1080×1350 JPEG (this also strips GPS/EXIF data). First photo is the cover.
- **Clips:** up to 6, MP4 or MOV (H.264), max 60 seconds and 50 MB. The browser checks length, size and that it can actually play the file, rejects HEVC-only iPhone videos with a message on how to fix it, and makes a 9:16 poster. Horizontal clips are allowed with a warning.
- **Profile:** name, handle, birthday (must be 18+), city/state, height, hair, eyes, tagline, bio, up to 6 vibes, page link, socials, plus four required confirmations (18+, everyone shown is 18+, owns the content, not explicit).
- Drafts save automatically. **Preview** shows the exact profile page. **Submit** sends it for review.

Uploads go to the Worker, which checks the file's real type from its bytes (not the name), and stores it at `c/<account>/<random>.<ext>` in R2. The database only accepts media paths under the creator's own folder.

**Approving:** `/admin` → **Approvals**. Open a profile, check the age line and her page link, look through photos and clips, pick **Public** (everyone) or **Hidden** (behind the unlock wall), then **Approve**, **Ask for changes** (with a note she sees), **Reject**, or **Take down** later. When she edits a live profile, the live version stays up until you approve the edits.

Approving, rejecting, taking down or moving tier calls the Cloudflare Pages deploy hook (stored in `private.settings` as `pages_deploy_hook`), so the site rebuilds and public profiles go live in about a minute. Hidden ones show instantly. To change the hook:

```sql
insert into private.settings (key, value) values ('pages_deploy_hook', 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/<id>')
on conflict (key) do update set value = excluded.value;
```

## The gate (hidden girls)

Agency girls are open to everyone. Every other girl is hidden: she shows up as a blurred "+N hidden girls" card and a home-page section until the visitor adds email + phone. Then she appears in the grid, on `/vip` (Unlocked girls) and on her own profile at `/more?c=slug`. Her data lives in Supabase (`vip_creators`, or `creator_profiles` for approved hidden self-serve creators), never in this public repo, so the gate can't be bypassed by viewing source.

Leads land in `leads` (email, phone, consent, traffic source, campaign, geo, which page/creator they unlocked from). Set `LEAD_WEBHOOK_URL` to push every lead to GoHighLevel/Zapier in real time.

## Live bar

The pill above the home headline shows real numbers from tracking (people browsing in the last 5 minutes, visitors today, total creators), refreshed every 60 seconds. "Browsing now" and "visitors today" stay hidden until they clear the floors in `src/lib/config.ts` (`live.nowMin`, `live.todayMin`).

## Blog

`/blog` has written guides (`src/lib/blog.ts`) plus auto-built "Best X creators" and "Best creators in <state>" pages for every vibe/state with 2+ creators. Each article has a quick-answer box, table of contents, FAQ, BlogPosting + FAQPage + Breadcrumb schema, and is listed in the sitemap, `/blog/rss.xml`, `llms.txt` and (full text) `llms-full.txt`. Add a guide by adding an entry to the `guides` array.

## Tracking

Every visit stores the traffic source on the session (UTM tags, ad click IDs, referrer, AI-search referrals like ChatGPT/Perplexity) plus device and geo. Events tracked: page views, card impressions (≥50% visible for 0.8s), card swipes, profile views, photo views, clip opens/plays, feed views, likes, shares, social taps, fans-page clicks (logged server-side at `/go/:slug`, so ad blockers can't drop them), searches, filters, sort changes, gate opens/closes, lead submits, age-gate passes, engaged time and scroll depth per page.

Tag every ad link. Traffic Junky example (their macros fill in the braces):

```
https://www.pickapeach.com/?utm_source=trafficjunky&utm_medium=cpm&utm_campaign={CampaignID}&utm_content={SpotID}&utm_term={SiteID}
```

Any extra query params are kept too, so you can add `sub1`, `zone_id`, etc.

Conversion pixels: set `NEXT_PUBLIC_PIXEL_FOLLOW` / `NEXT_PUBLIC_PIXEL_LEAD` (space-separated URLs, `{ts}` `{event}` `{creator}` get replaced) and rebuild. `NEXT_PUBLIC_GA_ID` turns on GA4.

## Privacy, consent and legal pages

- **Legal pages:** `/terms`, `/privacy`, `/cookies`, `/creator-terms`, `/content-removal` (TAKE IT DOWN + DMCA), `/18-plus` (age + 2257 statement), `/privacy-choices`. All linked in the footer. Written for a Florida operator; have a lawyer give them a once-over before you scale.
- **Before launch, set these in Cloudflare Pages → Settings → Variables (build) and redeploy:** `NEXT_PUBLIC_LEGAL_ENTITY` (your company's legal name), `NEXT_PUBLIC_LEGAL_ADDRESS` (mailing address, needed for the DMCA agent), and optionally `NEXT_PUBLIC_PRIVACY_EMAIL` / `NEXT_PUBLIC_DMCA_EMAIL` (default: `contactEmail` in `src/lib/config.ts`). Register the DMCA agent at copyright.gov (about $6) using the same details.
- **Cookie consent:** EU/EEA/UK/Swiss visitors get an opt-in banner (equal "Necessary only" / "Accept all" buttons); everyone else gets a slim notice with a link to their choices. Global Privacy Control turns off ad pixels automatically. Without analytics consent nothing is stored on the device and visits are counted anonymously. Google Analytics and conversion pixels only load with consent. Region comes from `/api/geo` (country only).
- **SMS consent:** the exact checkbox wording lives in `src/lib/sms.ts` and is stored with every lead, with a timestamp. The leads CSV only includes people who agreed and haven't opted out, so it's safe to import into your texting tool. Re-download before each send.
- **Requests:** opt-outs, deletion/access/correction requests and content reports land in `/admin` → **Requests**. Opt-outs stop marketing instantly (and are forwarded to `LEAD_WEBHOOK_URL` as `type: "optout"` so your CRM can mark do-not-contact). "Erase their data" wipes matching leads and creator accounts, including uploaded files. Non-consent and under-18 reports show a 48-hour countdown: set `ALERT_WEBHOOK_URL` (Slack/Zapier/GHL webhook) so you get pinged the moment one arrives.
- **Creators** can delete their own account in Creator Studio (password required). It wipes the profile and every uploaded file and rebuilds the site if they were public.
- **Retention:** a nightly pg_cron job (`pp-purge-old-data`, 3:23 AM Eastern) deletes analytics older than 25 months and security logs older than 30 days, which is what the Privacy Policy promises (`supabase/migrations/0004_retention.sql`).

## Security

- Page security headers (CSP, HSTS, no framing, etc.) are in `public/_headers`; Worker responses get the same in `worker/index.ts`. Uploaded media is served with a sandbox CSP and can't be embedded by other sites.
- The Worker blocks cross-site POSTs. Leads, sign-ups, logins, uploads (60 files / 1.5 GB per creator per day) and requests are rate-limited per connection in the database. A stranger can no longer lock you out of the dashboard.
- IP addresses are hashed in the database with a secret, daily-rotating salt; the raw IP is never stored.
- The Pages deploy hook lives only in the database (`private.settings`); rebuilds are triggered there via `pg_net`.
- Self-serve profiles: media must come from the creator's own upload folder, vibes must be from the Studio list, social fields are reduced to plain handles, page links must be `https://`.
- **Database API is locked down** (done 2026-11-04). The Worker uses the Supabase secret key (Cloudflare Pages secret `SUPABASE_KEY`, set for Production and Preview), and `supabase/migrations/0005_lock_api.sql` removed the public key's access to everything except public data (`public_profiles`, `live_stats`, `locked_summary`) and the two password-protected functions `npm run sync:sheet` uses. If you ever rotate the secret key in Supabase, update the Cloudflare secret and retry the latest deployment, or the site's forms and tracking stop working.
- Dashboard password: use 12+ characters (`select private.set_admin_password('…');` enforces it). Once you're on your own domain, put Cloudflare Access (free, email code) in front of `/admin*` and `/api/admin/*` for a second lock.

## Dashboard

`/admin`: approvals, privacy/takedown requests, visitors, sessions, clicks, leads by day, by source, by campaign, by creator, countries, devices, landing pages, every event type, live feed, lead CSV export.

Each owner signs in with their own email and password. In **Account** you can change your password (signs out your other devices) and add or remove other owner logins. Logins lock for 15 minutes after 8 wrong tries from one connection. Passwords are stored as bcrypt hashes in `private.admin_users`; to reset a forgotten one, run in the Supabase SQL editor:

```sql
update private.admin_users set password_hash = extensions.crypt('new-password-here', extensions.gen_salt('bf', 12)) where lower(email) = 'owner@example.com';
```

## Domain

`www.pickapeach.com` is the main address (Cloudflare Pages custom domain, CNAME `www` → `pickapeach.pages.dev` at GoDaddy). The bare `pickapeach.com` is forwarded at GoDaddy to `https://www.pickapeach.com` (301, no masking). Canonical tags, the sitemap, robots.txt and llms.txt all use the www address.

## Deploy

Cloudflare Pages project `pickapeach` is connected to this repo: every push to `main` builds (`npm run build`, output `out`) and deploys. Bindings (R2 `MEDIA`) and vars come from `wrangler.jsonc`.

Manual deploy: `npm run deploy` (build + `wrangler pages deploy`).

Env (build time, optional): `NEXT_PUBLIC_SITE_URL` (canonical domain, default https://www.pickapeach.com), `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_PIXEL_FOLLOW`, `NEXT_PUBLIC_PIXEL_LEAD`, `NEXT_PUBLIC_NOINDEX=1`.
Worker secrets: `SUPABASE_KEY` (secret key, see Security), `LEAD_WEBHOOK_URL`, `ALERT_WEBHOOK_URL`. Build vars: `NEXT_PUBLIC_LEGAL_ENTITY`, `NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_PRIVACY_EMAIL`, `NEXT_PUBLIC_DMCA_EMAIL`.

## Local

```bash
npm run preview       # build + wrangler pages dev on :8788 (real Supabase, local R2)
npm run placeholders  # regenerate the demo roster
```
