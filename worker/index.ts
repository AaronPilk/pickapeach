/// <reference types="@cloudflare/workers-types" />
// Pick a Peach edge Worker.
// Serves the static site from ./out and handles the dynamic routes:
//   POST /api/t              batched tracking events  -> Supabase ingest()
//   GET  /go/:slug           tracked outbound click to the creator's fans page
//   POST /api/lead           VIP unlock + creator applications -> Supabase submit_lead()
//   GET  /api/vip            members-only creators (cookie-gated)
//   GET  /api/vip/summary    public count of members-only creators
//   /api/admin/*             password-protected dashboard data + creator approvals
//   /api/creator/*           Creator Studio: accounts, profile drafts, photo/video uploads
//   GET  /m/*                uploaded media from R2 (supports Range for iOS video)
//   POST /api/privacy        privacy + takedown requests (opt out, delete, NCII, copyright, ...)
//   GET  /api/geo            visitor's country + cookie rule for the consent banner (sets pp_geo)
// Worker responses get security headers here; static pages get theirs from public/_headers.
import roster from "../data/creators.json";
import { SMS_CONSENT_TEXT } from "../src/lib/sms";
import selfServe from "../data/self-serve.json";
import { mergeRoster } from "../src/lib/roster";

interface Env {
  ASSETS: Fetcher;
  MEDIA?: R2Bucket;
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;
  LEAD_WEBHOOK_URL?: string;
  ALERT_WEBHOOK_URL?: string;
}

type Json = Record<string, unknown>;
// Agency links are baked in. Self-serve links are always looked up live, so a takedown
// stops the redirect right away; `alias` maps a renamed slug ("skye-2") back to her DB slug.
type RosterRow = { slug: string; fansUrl: string; age?: number; dbSlug?: string };
const fans = new Map((roster as RosterRow[]).map((c) => [c.slug, c.fansUrl]));
const alias = new Map(
  mergeRoster(roster as RosterRow[], (selfServe as RosterRow[]).map((c) => ({ ...c, dbSlug: c.slug })))
    .filter((c) => c.dbSlug && c.dbSlug !== c.slug)
    .map((c) => [c.slug, c.dbSlug as string]),
);

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    return secure(req, url, await route(req, env, ctx, url));
  },
} satisfies ExportedHandler<Env>;

async function route(req: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const p = url.pathname;
  // Block cross-site form posts and fetches to anything that changes data (cookies are SameSite too; this is belt and braces).
  if (p.startsWith("/api/") && p !== "/api/t" && !["GET", "HEAD", "OPTIONS"].includes(req.method) && !sameOrigin(req, url)) {
    return json({ error: "forbidden" }, 403);
  }
  try {
    if (p === "/api/t" && req.method === "POST") return await handleTrack(req, env, ctx);
    if (p.startsWith("/go/")) return await handleGo(req, env, ctx, url);
    if (p === "/api/lead" && req.method === "POST") return await handleLead(req, env, ctx);
    if (p === "/api/privacy" && req.method === "POST") return await handleRequest(req, env, ctx);
    if (p === "/api/vip/summary") return await handleSummary(req, env, ctx);
    if (p === "/api/live") return await handleLive(req, env, ctx);
    if (p === "/api/geo") return handleGeo(req, url);
    if (p.startsWith("/m/")) return await serveMedia(req, env, url);
    if (p.startsWith("/api/creator/")) return await handleCreator(req, env, url);
    if (p === "/api/vip") return await handleVip(req, env);
    if (p.startsWith("/api/admin/")) return await handleAdmin(req, env, url);
    if (p.startsWith("/api/")) return json({ error: "not found" }, 404);
  } catch (err) {
    console.error(p, err);
    if (p.startsWith("/go/")) return Response.redirect(url.origin + "/", 302);
    return json({ error: "server error" }, 500);
  }
  return env.ASSETS.fetch(req);
}

// ---------------------------------------------------------------- security headers + consent region

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// Cookie consent is opt-in here (GDPR / UK GDPR / Swiss law); everywhere else it's notice + opt-out.
const OPT_IN = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH".split(" "));

function secure(_req: Request, url: URL, res: Response) {
  const out = new Response(res.body, res);
  const h = out.headers;
  const https = url.protocol === "https:";
  const p = url.pathname;
  if (p.startsWith("/m/")) {
    // Uploaded media: never executable, never embeddable by other sites.
    h.set("content-security-policy", "default-src 'none'; sandbox");
    h.set("cross-origin-resource-policy", "same-site");
  } else {
    h.set("content-security-policy", CSP + (https ? "; upgrade-insecure-requests" : ""));
    h.set("cross-origin-opener-policy", "same-origin");
  }
  if (https) h.set("strict-transport-security", "max-age=63072000; includeSubDomains");
  h.set("x-content-type-options", "nosniff");
  h.set("x-frame-options", "DENY");
  h.set("referrer-policy", "strict-origin-when-cross-origin");
  h.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()");
  if (p.startsWith("/api/") || p.startsWith("/go/")) h.set("x-robots-tag", "noindex, nofollow");
  return out;
}

// Which cookie rules apply: opt-in in the EU/EEA/UK/Switzerland, notice + opt-out elsewhere.
// Unknown country gets the stricter rule. Only the country is used; nothing is stored server-side.
function handleGeo(req: Request, url: URL) {
  const country = ((req.cf as { country?: string } | undefined)?.country || "").toUpperCase();
  const rule = !country || country === "XX" || country === "T1" || OPT_IN.has(country) ? "optin" : "optout";
  const secureFlag = url.protocol === "https:" ? "; Secure" : "";
  return json({ country, rule }, 200, {
    "cache-control": "private, no-store",
    "set-cookie": `pp_geo=${country || "XX"}.${rule}; Path=/; Max-Age=86400; SameSite=Lax${secureFlag}`,
  });
}

function sameOrigin(req: Request, url: URL) {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === url.host;
    } catch {
      return false;
    }
  }
  return req.headers.get("sec-fetch-site") !== "cross-site";
}

function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") || "";
}

// ---------------------------------------------------------------- tracking

async function handleTrack(req: Request, env: Env, ctx: ExecutionContext) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 64_000) return new Response(null, { status: 413 });
  let body: Json;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const s = str(body.s, 64);
  const v = str(body.v, 64);
  const events = Array.isArray(body.e) ? (body.e as Json[]).slice(0, 60) : [];
  if (!s || !v || !events.length) return new Response(null, { status: 204 });

  const payload = {
    s,
    v,
    e: events.map(cleanEvent),
    att: body.ctx ? attribution(body.ctx as Json) : undefined,
    enr: await enrich(req, env, body.ctx as Json | undefined),
  };
  ctx.waitUntil(rpc(env, "ingest", { p: payload }, clientIp(req)).catch((e) => console.error("ingest", e)));
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

function cleanEvent(e: Json) {
  const m = e.m && typeof e.m === "object" ? (e.m as Json) : undefined;
  let meta: Json | undefined;
  if (m) {
    meta = {};
    for (const [k, val] of Object.entries(m).slice(0, 16)) {
      if (["string", "number", "boolean"].includes(typeof val)) meta[k.slice(0, 32)] = typeof val === "string" ? val.slice(0, 200) : val;
    }
  }
  return { t: str(e.t, 40), ts: typeof e.ts === "number" ? e.ts : Date.now(), p: str(e.p, 300), c: str(e.c, 80) || undefined, m: meta };
}

// ---------------------------------------------------------------- outbound clicks

async function handleGo(req: Request, env: Env, ctx: ExecutionContext, url: URL) {
  const slug = decodeURIComponent(url.pathname.slice(4)).replace(/\/$/, "");
  let target = fans.get(slug);
  if (!target) target = ((await rpc(env, "vip_fans_url", { p_slug: alias.get(slug) || slug })) as string | null) || undefined;
  if (!target || !/^https?:\/\//.test(target)) return Response.redirect(url.origin + "/", 302);

  const cookies = parseCookies(req);
  const isNewSession = !cookies.pp_sid;
  const s = cookies.pp_sid || crypto.randomUUID();
  const v = cookies.pp_vid || crypto.randomUUID();
  const event = { t: "go", ts: Date.now(), p: str(url.searchParams.get("from"), 300) || "/go", c: slug, m: { s: str(url.searchParams.get("s"), 30) || "link" } };
  const payload: Json = { s, v, e: [event], enr: await enrich(req, env) };
  // Someone landing on /go directly from an ad still gets attributed.
  if (isNewSession) payload.att = attribution({ lt: { q: Object.fromEntries(url.searchParams), ref: req.headers.get("referer") || "", ref_host: hostOf(req.headers.get("referer")), land: url.pathname } });
  ctx.waitUntil(rpc(env, "ingest", { p: payload }, clientIp(req)).catch((e) => console.error("go", e)));

  return new Response(null, {
    status: 302,
    headers: { location: target, "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
}

// ---------------------------------------------------------------- leads + VIP

async function handleLead(req: Request, env: Env, ctx: ExecutionContext) {
  if (Number(req.headers.get("content-length") || 0) > 16_000) return json({ error: "too large" }, 413);
  let b: Json;
  try {
    b = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const kind = b.kind === "creator" ? "creator" : "vip";
  // Honeypot: bots fill hidden fields. Pretend it worked, store nothing.
  if (str(b.website, 200)) return json({ ok: true });

  const email = str(b.email, 200).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return json({ error: "Enter a valid email." }, 422);
  const phone = normPhone(str(b.phone, 40));
  if (kind === "vip") {
    if (!phone) return json({ error: "Enter a valid phone number." }, 422);
    if (b.consent !== true) return json({ error: "Tick the box to unlock." }, 422);
  }
  const name = str(b.name, 120);
  if (kind === "creator" && !name) return json({ error: "Add your name." }, 422);

  const cookies = parseCookies(req);
  const enr = await enrich(req, env);
  const att = b.attr ? attribution(b.attr as Json) : ({} as ReturnType<typeof attribution>);
  const extra: Json = {};
  if (kind === "creator") {
    for (const k of ["instagram", "tiktok", "fans", "message"]) if (str(b[k], 500)) extra[k] = str(b[k], 500);
  }

  let res: { token: string; existing: boolean };
  try {
    res = (await rpc(env, "submit_lead", {
    p: {
      kind,
      email,
      phone: phone || null,
      name: name || null,
      consent: b.consent === true,
      consent_text: kind === "vip" ? SMS_CONSENT_TEXT : null,
      source: att.source && att.source !== "direct" ? att.source : null,
      medium: att.medium || null,
      campaign: att.campaign || null,
      query: att.query || null,
      first_touch: att.first_touch || null,
      session_id: cookies.pp_sid || null,
      visitor_id: cookies.pp_vid || null,
      origin: str(b.origin, 60) || null,
      creator: str(b.creator, 80) || null,
      page: str(b.page, 300) || null,
      country: enr.country,
      region: enr.region,
      city: enr.city,
      device: enr.device,
      user_agent: str(req.headers.get("user-agent"), 400),
      extra: Object.keys(extra).length ? extra : null,
    },
  }, clientIp(req))) as { token: string; existing: boolean };
  } catch (e) {
    const msg = rpcMessage(e);
    return json({ error: msg }, /too many/i.test(msg) ? 429 : 422);
  }

  if (env.LEAD_WEBHOOK_URL) {
    ctx.waitUntil(
      fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind, email, phone, name, ...extra, source: att.source, campaign: att.campaign, country: enr.country, city: enr.city,
          consent: b.consent === true, consent_text: kind === "vip" ? SMS_CONSENT_TEXT : null, page: str(b.page, 300) || null, at: new Date().toISOString(),
        }),
      }).catch(() => {}),
    );
  }

  if (kind === "creator") return json({ ok: true });

  const creators = await rpc(env, "locked_creators", { p_token: res.token });
  const vip = { creators: creators || [] };
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  headers.append("set-cookie", `pp_vip=${res.token}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
  headers.append("set-cookie", `pp_unlocked=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`);
  return new Response(JSON.stringify({ ok: true, existing: res.existing, vip }), { headers });
}

// Privacy choices + takedown requests. Opt-outs take effect immediately in the database.
async function handleRequest(req: Request, env: Env, ctx: ExecutionContext) {
  if (Number(req.headers.get("content-length") || 0) > 16_000) return json({ error: "too large" }, 413);
  const b = (await req.json().catch(() => ({}))) as Json;
  if (str(b.website, 200)) return json({ ok: true });
  const country = ((req.cf as { country?: string } | undefined)?.country || "").slice(0, 8);
  try {
    await rpc(env, "submit_request", {
      p: {
        kind: str(b.kind, 20), email: str(b.email, 200), phone: str(b.phone, 40), name: str(b.name, 120), url: str(b.url, 500),
        details: str(b.details, 4000), signature: str(b.signature, 120), good_faith: b.good_faith === true, country,
      },
    }, clientIp(req));
  } catch (e) {
    const msg = rpcMessage(e);
    return json({ error: msg }, /too many/i.test(msg) ? 429 : 422);
  }
  const kind = str(b.kind, 20);
  // Pass opt-outs to the CRM too, so a contact pushed there earlier gets marked do-not-contact.
  if (env.LEAD_WEBHOOK_URL && (kind === "optout" || kind === "delete")) {
    ctx.waitUntil(
      fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "optout", reason: kind, email: str(b.email, 200).toLowerCase(), phone: str(b.phone, 40), at: new Date().toISOString() }),
      }).catch(() => {}),
    );
  }
  if (env.ALERT_WEBHOOK_URL) {
    ctx.waitUntil(
      fetch(env.ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "request", kind, urgent: ["ncii", "underage"].includes(kind), url: str(b.url, 500), at: new Date().toISOString() }),
      }).catch(() => {}),
    );
  }
  return json({ ok: true }, 200, { "cache-control": "no-store" });
}

async function handleVip(req: Request, env: Env) {
  const tok = parseCookies(req).pp_vip;
  if (!tok || !/^[0-9a-f-]{36}$/i.test(tok)) return json({ error: "locked" }, 401);
  const creators = await rpc(env, "locked_creators", { p_token: tok });
  if (!creators) return json({ error: "locked" }, 401);
  return json({ creators }, 200, { "cache-control": "private, no-store" });
}

async function handleSummary(req: Request, env: Env, ctx: ExecutionContext) {
  const cache = caches.default;
  const key = new Request(new URL("/api/vip/summary", req.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  const data = await rpc(env, "locked_summary", {});
  const res = json(data, 200, { "cache-control": "public, max-age=300" });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

// Real activity numbers for the live bar. Cached at the edge for 30s.
async function handleLive(req: Request, env: Env, ctx: ExecutionContext) {
  const cache = caches.default;
  const key = new Request(new URL("/api/live", req.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  const data = await rpc(env, "live_stats", {});
  const res = json(data, 200, { "cache-control": "public, max-age=30" });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

// ---------------------------------------------------------------- admin

async function handleAdmin(req: Request, env: Env, url: URL) {
  const p = url.pathname.replace("/api/admin/", "");
  if (p === "login" && req.method === "POST") {
    const b = (await req.json().catch(() => ({}))) as Json;
    const tok = (await rpc(env, "admin_login", { p_password: typeof b.password === "string" ? b.password.slice(0, 200) : "" }, clientIp(req))) as string | null;
    if (!tok) return json({ error: "Wrong password, or too many tries. Wait 15 minutes." }, 401);
    return json({ ok: true }, 200, { "set-cookie": `pp_admin=${tok}; Path=/api/admin; Max-Age=1209600; HttpOnly; Secure; SameSite=Strict` });
  }
  if (p === "logout") return json({ ok: true }, 200, { "set-cookie": "pp_admin=; Path=/api/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict" });

  const tok = parseCookies(req).pp_admin;
  if (!tok || !/^[0-9a-f-]{36}$/i.test(tok)) return json({ error: "auth" }, 401);
  const nostore = { "cache-control": "no-store" };

  if (p === "creators") {
    const data = await rpc(env, "admin_creators", { p_token: tok });
    return data ? json(data, 200, nostore) : json({ error: "auth" }, 401);
  }
  if (p === "creators/review" && req.method === "POST") {
    const b = (await req.json().catch(() => ({}))) as Json;
    const action = str(b.action, 20);
    let res: { rebuilding?: boolean } | null;
    try {
      res = await rpc(env, "admin_creator_review", { p_token: tok, p_account: str(b.id, 64), p_action: action, p_tier: str(b.tier, 10) || null, p_note: str(b.note, 1000) || null });
    } catch (e) {
      return json({ error: rpcMessage(e) }, 422, nostore);
    }
    // The database fires the Pages deploy hook itself (via pg_net), so the hook URL never leaves it.
    return json({ ok: true, result: res, rebuilding: Boolean(res?.rebuilding) }, 200, nostore);
  }
  if (p === "requests") {
    const data = await rpc(env, "admin_requests", { p_token: tok });
    return data ? json(data, 200, nostore) : json({ error: "auth" }, 401);
  }
  if (p === "requests/resolve" && req.method === "POST") {
    const b = (await req.json().catch(() => ({}))) as Json;
    let res: { creator_accounts?: string[]; erased_leads?: number; rebuilding?: boolean };
    try {
      res = await rpc(env, "admin_request_resolve", { p_token: tok, p_id: str(b.id, 64), p_action: str(b.action, 20), p_note: str(b.note, 1000) || null });
    } catch (e) {
      return json({ error: rpcMessage(e) }, 422, nostore);
    }
    let media = 0;
    for (const acc of res.creator_accounts || []) media += await purgeMedia(env, acc);
    return json({ ok: true, ...res, media_deleted: media }, 200, nostore);
  }
  if (p === "stats") {
    const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days")) || 7));
    const data = await rpc(env, "admin_stats", { p_token: tok, p_days: days });
    return data ? json(data, 200, nostore) : json({ error: "auth" }, 401);
  }
  if (p === "recent") {
    const data = await rpc(env, "admin_recent", { p_token: tok, p_limit: 80 });
    return data ? json(data, 200, nostore) : json({ error: "auth" }, 401);
  }
  if (p === "leads") {
    const data = await rpc(env, "admin_leads", { p_token: tok, p_limit: 200 });
    return data ? json(data, 200, nostore) : json({ error: "auth" }, 401);
  }
  if (p === "leads.csv") {
    // Only people who agreed to messages, haven't opted out and weren't erased, so the file is safe to import and message.
    const data = (await rpc(env, "admin_leads_export", { p_token: tok })) as Json[] | null;
    if (!data) return json({ error: "auth" }, 401);
    const cols = ["created_at", "email", "phone", "name", "consent_at", "consent_text", "source", "medium", "campaign", "origin", "creator", "country", "region", "city", "device", "page"];
    const esc = (x: unknown) => {
      let s = x == null ? "" : typeof x === "object" ? JSON.stringify(x) : String(x);
      // Stop spreadsheet apps from running anything a visitor typed as a formula.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(","), ...data.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    return new Response(csv, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="pickapeach-leads-${new Date().toISOString().slice(0, 10)}.csv"`, ...nostore },
    });
  }
  return json({ error: "not found" }, 404);
}

// ---------------------------------------------------------------- Creator Studio

const PHOTO_MAX = 6 * 1024 * 1024;
const CLIP_MAX = 50 * 1024 * 1024;

async function handleCreator(req: Request, env: Env, url: URL) {
  const p = url.pathname.replace("/api/creator/", "");
  const nostore = { "cache-control": "no-store" };
  const cookie = (tok: string, age: number) => `pp_creator=${tok}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;

  if ((p === "signup" || p === "login") && req.method === "POST") {
    const b = (await req.json().catch(() => ({}))) as Json;
    let tok: string | null = null;
    try {
      tok = (await rpc(env, p === "signup" ? "creator_signup" : "creator_login", { p_email: str(b.email, 200), p_password: typeof b.password === "string" ? b.password.slice(0, 200) : "" }, clientIp(req))) as string | null;
    } catch (e) {
      return json({ error: rpcMessage(e) }, 422, nostore);
    }
    if (!tok) return json({ error: "Wrong email or password. After 8 misses you'll need to wait 15 minutes." }, 401, nostore);
    const me = await rpc(env, "creator_me", { p_token: tok });
    return json(me, 200, { ...nostore, "set-cookie": cookie(tok, 2592000) });
  }

  const tok = parseCookies(req).pp_creator;
  if (p === "logout") {
    if (tok && /^[0-9a-f-]{36}$/i.test(tok)) await rpc(env, "creator_logout", { p_token: tok }).catch(() => {});
    return json({ ok: true }, 200, { ...nostore, "set-cookie": cookie("", 0) });
  }
  if (!tok || !/^[0-9a-f-]{36}$/i.test(tok)) return json({ error: "auth" }, 401, nostore);

  if (p === "me") {
    const me = await rpc(env, "creator_me", { p_token: tok });
    return me ? json(me, 200, nostore) : json({ error: "auth" }, 401, nostore);
  }

  if (p === "delete" && req.method === "POST") {
    const b = (await req.json().catch(() => ({}))) as Json;
    let res: { account?: string };
    try {
      res = await rpc(env, "creator_delete_account", { p_token: tok, p_password: typeof b.password === "string" ? b.password.slice(0, 200) : "" }, clientIp(req));
    } catch (e) {
      return json({ error: rpcMessage(e) }, 422, nostore);
    }
    if (res?.account) await purgeMedia(env, res.account);
    return json({ ok: true }, 200, { ...nostore, "set-cookie": cookie("", 0) });
  }

  if (p === "save" && req.method === "POST") {
    if (Number(req.headers.get("content-length") || 0) > 64_000) return json({ error: "Too much data." }, 413, nostore);
    const b = (await req.json().catch(() => ({}))) as Json;
    try {
      const me = await rpc(env, "creator_save", { p_token: tok, p_data: b.data || {}, p_attest: b.attest || null, p_submit: b.submit === true });
      return json(me, 200, nostore);
    } catch (e) {
      return json({ error: rpcMessage(e) }, 422, nostore);
    }
  }

  if (p === "media" && req.method === "POST") {
    if (!env.MEDIA) return json({ error: "Uploads aren't set up yet." }, 503, nostore);
    const kind = url.searchParams.get("kind") === "clip" ? "clip" : url.searchParams.get("kind") === "poster" ? "poster" : "photo";
    const declared = Number(req.headers.get("content-length") || 0);
    const max = kind === "clip" ? CLIP_MAX : PHOTO_MAX;
    if (declared > max) return json({ error: kind === "clip" ? "Clips can be up to 50 MB." : "That image is too big." }, 413, nostore);
    // Checks the session and the daily upload allowance (60 files / 1.5 GB per account).
    let accountId: string | null;
    try {
      accountId = (await rpc(env, "creator_upload_begin", { p_token: tok, p_bytes: declared, p_kind: kind }, clientIp(req))) as string | null;
    } catch (e) {
      return json({ error: rpcMessage(e) }, 429, nostore);
    }
    if (!accountId) return json({ error: "auth" }, 401, nostore);
    const buf = new Uint8Array(await req.arrayBuffer());
    if (!buf.length || buf.length > max) return json({ error: "That file is too big or empty." }, 413, nostore);
    const type = sniff(buf);
    const okTypes = kind === "clip" ? ["video/mp4", "video/quicktime", "video/webm"] : ["image/jpeg", "image/png", "image/webp"];
    if (!type || !okTypes.includes(type)) return json({ error: kind === "clip" ? "Upload an MP4, MOV or WebM video." : "Upload a JPG, PNG or WebP image." }, 415, nostore);
    if (kind === "clip" && isHevcOnly(buf)) {
      return json({ error: "This video uses HEVC, which won't play on Android or Chrome. Export it as H.264 MP4 (on iPhone: Settings → Camera → Formats → Most Compatible)." }, 415, nostore);
    }
    // iPhone exports H.264 inside a .mov container. Serve those as MP4 so Chrome and Android play them too.
    const finalType = type === "video/quicktime" && hasBytes(buf, "avc1") ? "video/mp4" : type;
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" }[finalType];
    const key = `c/${accountId}/${crypto.randomUUID()}.${ext}`;
    await env.MEDIA.put(key, buf, { httpMetadata: { contentType: finalType, cacheControl: "public, max-age=31536000, immutable" } });
    return json({ ok: true, src: `/m/${key}`, type: finalType, bytes: buf.length }, 200, nostore);
  }

  return json({ error: "not found" }, 404, nostore);
}

// Identify the real file type from its first bytes (never trust the client's label).
function sniff(b: Uint8Array): string | null {
  const at = (o: number, s: string) => [...s].every((ch, i) => b[o + i] === ch.charCodeAt(0));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && at(1, "PNG")) return "image/png";
  if (at(0, "RIFF") && at(8, "WEBP")) return "image/webp";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  if (at(4, "ftyp")) return at(8, "qt  ") ? "video/quicktime" : "video/mp4";
  return null;
}

function hasBytes(b: Uint8Array, s: string) {
  const c = [...s].map((ch) => ch.charCodeAt(0));
  outer: for (let i = 0; i <= b.length - c.length; i++) {
    for (let j = 0; j < c.length; j++) if (b[i + j] !== c[j]) continue outer;
    return true;
  }
  return false;
}
function isHevcOnly(b: Uint8Array) {
  return (hasBytes(b, "hvc1") || hasBytes(b, "hev1")) && !hasBytes(b, "avc1");
}

// Deletes every file a creator uploaded (account deletion or an erasure request).
async function purgeMedia(env: Env, account: string) {
  if (!env.MEDIA || !/^[0-9a-f-]{36}$/.test(account)) return 0;
  let cursor: string | undefined;
  let n = 0;
  do {
    const list = await env.MEDIA.list({ prefix: `c/${account}/`, cursor, limit: 1000 });
    const keys = list.objects.map((o) => o.key);
    if (keys.length) {
      await env.MEDIA.delete(keys);
      n += keys.length;
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  return n;
}

async function serveMedia(req: Request, env: Env, url: URL) {
  if (!env.MEDIA) return new Response("Not found", { status: 404 });
  const key = decodeURIComponent(url.pathname.slice(3));
  if (!/^c\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|mov|webm)$/.test(key)) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "cache-control": "public, max-age=31536000, immutable", "accept-ranges": "bytes", "content-disposition": "inline" });
  if (req.method === "HEAD") {
    const h = await env.MEDIA.head(key);
    if (!h) return new Response(null, { status: 404 });
    headers.set("content-type", h.httpMetadata?.contentType || "application/octet-stream");
    headers.set("content-length", String(h.size));
    headers.set("etag", h.httpEtag);
    return new Response(null, { headers });
  }
  const range = req.headers.get("range");
  const obj = await env.MEDIA.get(key, range ? { range: req.headers } : undefined);
  if (!obj) return new Response("Not found", { status: 404 });
  headers.set("content-type", obj.httpMetadata?.contentType || "application/octet-stream");
  headers.set("etag", obj.httpEtag);
  const body = (obj as R2ObjectBody).body;
  if (range && obj.range) {
    const r = obj.range as { offset?: number; length?: number; suffix?: number };
    const start = r.suffix != null ? obj.size - r.suffix : r.offset ?? 0;
    const len = r.suffix != null ? r.suffix : r.length ?? obj.size - start;
    headers.set("content-range", `bytes ${start}-${start + len - 1}/${obj.size}`);
    headers.set("content-length", String(len));
    return new Response(body, { status: 206, headers });
  }
  headers.set("content-length", String(obj.size));
  return new Response(body, { headers });
}

// Passes through the plain-English errors our functions raise; hides anything that looks like database internals.
function rpcMessage(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  const match = m.match(/"message":"([^"]+)"/);
  const msg = match ? match[1].replace(/\\u0027/g, "'") : "";
  if (!msg || msg.length > 200 || /violates|relation|column|function|syntax|constraint|permission|null value|duplicate key|invalid input|operator|schema|not authorized/i.test(msg)) {
    return "Something went wrong. Try again.";
  }
  return msg;
}

// ---------------------------------------------------------------- helpers

// Defaults let the same bundle run on Pages without dashboard env vars.
// The publishable key is public by design: tables are RLS-locked, only the RPCs below are callable.
const DEFAULT_SUPABASE_URL = "https://qcuzrmceswanetrmimzn.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_zG7RWc6SzzTIVBRMPXSJ0w_K0tLxwfD";

// `ip` is the visitor's address, passed so the database can rate-limit and hash it with its own secret salt.
// The raw IP is never stored.
async function rpc(env: Env, fn: string, args: Json, ip?: string) {
  const key = env.SUPABASE_KEY || DEFAULT_SUPABASE_KEY;
  const base = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const headers: Record<string, string> = { apikey: key, "content-type": "application/json" };
  if (!key.startsWith("sb_")) headers.authorization = `Bearer ${key}`;
  if (ip) headers["x-pp-ip"] = ip.slice(0, 64);
  const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`${fn} ${r.status} ${(await r.text()).slice(0, 300)}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });
}

function str(v: unknown, max: number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function parseCookies(req: Request) {
  const out: Record<string, string> = {};
  for (const part of (req.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function hostOf(u?: string | null) {
  if (!u) return "";
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normPhone(raw: string) {
  if (!raw) return "";
  const plus = raw.trim().startsWith("+");
  const d = raw.replace(/\D/g, "");
  if (!plus && d.length === 10) return `+1${d}`;
  if (!plus && d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (plus && d.length >= 8 && d.length <= 15) return `+${d}`;
  return "";
}

const SEARCH: [RegExp, string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)yahoo\./, "yahoo"],
  [/(^|\.)yandex\./, "yandex"],
  [/(^|\.)baidu\.com$/, "baidu"],
  [/ecosia\.org$/, "ecosia"],
  [/search\.brave\.com$/, "brave"],
];
const AI: [RegExp, string][] = [
  [/chatgpt\.com$|openai\.com$/, "chatgpt"],
  [/perplexity\.ai$/, "perplexity"],
  [/claude\.ai$/, "claude"],
  [/gemini\.google\.com$/, "gemini"],
  [/copilot\.microsoft\.com$/, "copilot"],
];
const SOCIAL: [RegExp, string][] = [
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)x\.com$|(^|\.)t\.co$|twitter\.com$/, "x"],
  [/instagram\.com$/, "instagram"],
  [/tiktok\.com$/, "tiktok"],
  [/facebook\.com$|fb\.com$|(^|\.)fb\.me$/, "facebook"],
  [/snapchat\.com$/, "snapchat"],
  [/t\.me$|telegram\.org$/, "telegram"],
  [/linktr\.ee$|beacons\.ai$|allmylinks\.com$/, "link-in-bio"],
];

function refSource(host: string) {
  if (!host) return { source: "", medium: "" };
  for (const [re, name] of AI) if (re.test(host)) return { source: name, medium: "ai" };
  for (const [re, name] of SEARCH) if (re.test(host)) return { source: name, medium: "organic" };
  for (const [re, name] of SOCIAL) if (re.test(host)) return { source: name, medium: "social" };
  return { source: host, medium: "referral" };
}

function attribution(ctx: Json) {
  const touch = (ctx.lt || {}) as Json;
  const q = ((touch.q || {}) as Record<string, string>) || {};
  const clickKeys: [string, string][] = [["gclid", "google"], ["fbclid", "facebook"], ["ttclid", "tiktok"], ["msclkid", "bing"]];
  let click_id = "";
  let clickSrc = "";
  for (const [k, src] of clickKeys) if (q[k]) { click_id = `${k}:${q[k]}`; clickSrc = src; break; }
  const ref = refSource(String(touch.ref_host || ""));
  const tagged = q.utm_source || q.src || q.source || q.ref || "";
  const source = (tagged || clickSrc || ref.source || "direct").toLowerCase().slice(0, 120);
  const medium = (q.utm_medium || (click_id ? "cpc" : tagged ? "paid" : ref.medium) || "none").toLowerCase();
  const ft = (ctx.ft || null) as Json | null;
  let first_source = "";
  if (ft) {
    const fq = (ft.q || {}) as Record<string, string>;
    first_source = (fq.utm_source || fq.src || fq.source || refSource(String(ft.ref_host || "")).source || "direct").toLowerCase();
  }
  return {
    source,
    medium,
    campaign: q.utm_campaign || q.campaign || q.campaign_id || q.cid || "",
    content: q.utm_content || q.ad_id || q.spot_id || q.creative_id || "",
    term: q.utm_term || q.keyword || q.site_id || q.zone_id || "",
    click_id,
    landing: String(touch.land || ""),
    referrer: String(touch.ref || "").slice(0, 500),
    referrer_host: String(touch.ref_host || ""),
    query: Object.keys(q).length ? q : undefined,
    first_touch: ft || undefined,
    first_source,
  };
}

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp|monitor|uptime/i;

// IP hashing happens in the database with a secret salt (see private.ip_hash), not here.
async function enrich(req: Request, _env: Env, c?: Json) {
  const cf = (req.cf || {}) as Record<string, unknown>;
  const ua = req.headers.get("user-agent") || "";
  const verified = (cf.botManagement as { verifiedBot?: boolean } | undefined)?.verifiedBot;
  return {
    country: (cf.country as string) || "",
    region: (cf.region as string) || "",
    city: (cf.city as string) || "",
    postal: (cf.postalCode as string) || "",
    timezone: (cf.timezone as string) || "",
    asn_org: (cf.asOrganization as string) || "",
    colo: (cf.colo as string) || "",
    ...device(ua),
    is_bot: Boolean(verified) || BOT.test(ua) || !ua,
    screen: c ? `${c.sw}x${c.sh}@${c.dpr}` : undefined,
    lang: c ? str(c.lang, 20) : undefined,
    net: c ? str(c.net, 10) : undefined,
  };
}

function device(ua: string) {
  const tablet = /ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua);
  const mobile = !tablet && /mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua);
  const os = /iphone|ipad|ipod/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /mac os x/i.test(ua) ? "macOS" : /windows/i.test(ua) ? "Windows" : /cros/i.test(ua) ? "ChromeOS" : /linux/i.test(ua) ? "Linux" : "Other";
  const browser = /edg\//i.test(ua) ? "Edge" : /samsungbrowser/i.test(ua) ? "Samsung" : /opr\/|opera/i.test(ua) ? "Opera" : /fxios|firefox/i.test(ua) ? "Firefox" : /crios|chrome/i.test(ua) ? "Chrome" : /instagram/i.test(ua) ? "Instagram" : /fban|fbav/i.test(ua) ? "Facebook" : /safari/i.test(ua) ? "Safari" : "Other";
  return { device: tablet ? "tablet" : mobile ? "mobile" : "desktop", os, browser };
}
