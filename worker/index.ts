/// <reference types="@cloudflare/workers-types" />
// Pick a Peach edge Worker.
// Serves the static site from ./out and handles the dynamic routes:
//   POST /api/t              batched tracking events  -> Supabase ingest()
//   GET  /go/:slug           tracked outbound click to the creator's fans page
//   POST /api/lead           VIP unlock + creator applications -> Supabase submit_lead()
//   GET  /api/vip            unlocked VIP content (cookie-gated)
//   GET  /api/vip/summary    public counts of locked content
//   /api/admin/*             password-protected dashboard data
import roster from "../data/creators.json";

interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  IP_SALT?: string;
  LEAD_WEBHOOK_URL?: string;
}

type Json = Record<string, unknown>;
const fans = new Map((roster as { slug: string; fansUrl: string }[]).map((c) => [c.slug, c.fansUrl]));

const CONSENT_TEXT =
  "I agree to get emails and texts from Pick a Peach about new creators and drops. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.";

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === "/api/t" && req.method === "POST") return await handleTrack(req, env, ctx);
      if (p.startsWith("/go/")) return await handleGo(req, env, ctx, url);
      if (p === "/api/lead" && req.method === "POST") return await handleLead(req, env, ctx);
      if (p === "/api/vip/summary") return await handleSummary(req, env, ctx);
      if (p === "/api/vip") return await handleVip(req, env);
      if (p.startsWith("/api/admin/")) return await handleAdmin(req, env, url);
      if (p.startsWith("/api/")) return json({ error: "not found" }, 404);
    } catch (err) {
      console.error(p, err);
      if (p.startsWith("/go/")) return Response.redirect(url.origin + "/", 302);
      return json({ error: "server error" }, 500);
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;

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
  ctx.waitUntil(rpc(env, "ingest", { p: payload }).catch((e) => console.error("ingest", e)));
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
  if (!target) target = ((await rpc(env, "vip_fans_url", { p_slug: slug })) as string | null) || undefined;
  if (!target || !/^https?:\/\//.test(target)) return Response.redirect(url.origin + "/", 302);

  const cookies = parseCookies(req);
  const isNewSession = !cookies.pp_sid;
  const s = cookies.pp_sid || crypto.randomUUID();
  const v = cookies.pp_vid || crypto.randomUUID();
  const event = { t: "go", ts: Date.now(), p: str(url.searchParams.get("from"), 300) || "/go", c: slug, m: { s: str(url.searchParams.get("s"), 30) || "link" } };
  const payload: Json = { s, v, e: [event], enr: await enrich(req, env) };
  // Someone landing on /go directly from an ad still gets attributed.
  if (isNewSession) payload.att = attribution({ lt: { q: Object.fromEntries(url.searchParams), ref: req.headers.get("referer") || "", ref_host: hostOf(req.headers.get("referer")), land: url.pathname } });
  ctx.waitUntil(rpc(env, "ingest", { p: payload }).catch((e) => console.error("go", e)));

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

  const res = (await rpc(env, "submit_lead", {
    p: {
      kind,
      email,
      phone: phone || null,
      name: name || null,
      consent: b.consent === true,
      consent_text: kind === "vip" ? CONSENT_TEXT : null,
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
      ip_hash: enr.ip_hash,
      user_agent: str(req.headers.get("user-agent"), 400),
      extra: Object.keys(extra).length ? extra : null,
    },
  })) as { token: string; existing: boolean };

  if (env.LEAD_WEBHOOK_URL) {
    ctx.waitUntil(
      fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, email, phone, name, ...extra, source: att.source, campaign: att.campaign, country: enr.country, city: enr.city, at: new Date().toISOString() }),
      }).catch(() => {}),
    );
  }

  if (kind === "creator") return json({ ok: true });

  const vip = await rpc(env, "vip_content", { p_token: res.token });
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  headers.append("set-cookie", `pp_vip=${res.token}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
  headers.append("set-cookie", `pp_unlocked=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax`);
  return new Response(JSON.stringify({ ok: true, existing: res.existing, vip }), { headers });
}

async function handleVip(req: Request, env: Env) {
  const tok = parseCookies(req).pp_vip;
  if (!tok || !/^[0-9a-f-]{36}$/i.test(tok)) return json({ error: "locked" }, 401);
  const vip = await rpc(env, "vip_content", { p_token: tok });
  if (!vip) return json({ error: "locked" }, 401);
  return json(vip, 200, { "cache-control": "private, no-store" });
}

async function handleSummary(req: Request, env: Env, ctx: ExecutionContext) {
  const cache = caches.default;
  const key = new Request(new URL("/api/vip/summary", req.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  const data = await rpc(env, "vip_summary", {});
  const res = json(data, 200, { "cache-control": "public, max-age=300" });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

// ---------------------------------------------------------------- admin

async function handleAdmin(req: Request, env: Env, url: URL) {
  const p = url.pathname.replace("/api/admin/", "");
  if (p === "login" && req.method === "POST") {
    const b = (await req.json().catch(() => ({}))) as Json;
    const tok = (await rpc(env, "admin_login", { p_password: str(b.password, 200) })) as string | null;
    if (!tok) return json({ error: "Wrong password, or too many tries. Wait 15 minutes." }, 401);
    return json({ ok: true }, 200, { "set-cookie": `pp_admin=${tok}; Path=/api/admin; Max-Age=1209600; HttpOnly; Secure; SameSite=Strict` });
  }
  if (p === "logout") return json({ ok: true }, 200, { "set-cookie": "pp_admin=; Path=/api/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict" });

  const tok = parseCookies(req).pp_admin;
  if (!tok || !/^[0-9a-f-]{36}$/i.test(tok)) return json({ error: "auth" }, 401);
  const nostore = { "cache-control": "no-store" };

  if (p === "stats") {
    const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days")) || 7));
    const data = await rpc(env, "admin_stats", { p_token: tok, p_days: days });
    return data ? json(data, 200, nostore) : json({ error: "auth" }, 401);
  }
  if (p === "recent") {
    const data = await rpc(env, "admin_recent", { p_token: tok, p_limit: 80 });
    return data ? json(data, 200, nostore) : json({ error: "auth" }, 401);
  }
  if (p === "leads" || p === "leads.csv") {
    const data = (await rpc(env, "admin_leads", { p_token: tok, p_limit: p === "leads.csv" ? 10000 : 200 })) as Json[] | null;
    if (!data) return json({ error: "auth" }, 401);
    if (p === "leads") return json(data, 200, nostore);
    const cols = ["created_at", "kind", "email", "phone", "name", "consent", "source", "medium", "campaign", "origin", "creator", "country", "region", "city", "device", "page"];
    const esc = (x: unknown) => {
      const s = x == null ? "" : typeof x === "object" ? JSON.stringify(x) : String(x);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(","), ...data.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    return new Response(csv, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="pickapeach-leads-${new Date().toISOString().slice(0, 10)}.csv"`, ...nostore },
    });
  }
  return json({ error: "not found" }, 404);
}

// ---------------------------------------------------------------- helpers

async function rpc(env: Env, fn: string, args: Json) {
  const headers: Record<string, string> = { apikey: env.SUPABASE_KEY, "content-type": "application/json" };
  if (!env.SUPABASE_KEY.startsWith("sb_")) headers.authorization = `Bearer ${env.SUPABASE_KEY}`;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) });
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

async function enrich(req: Request, env: Env, c?: Json) {
  const cf = (req.cf || {}) as Record<string, unknown>;
  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("cf-connecting-ip") || "";
  const day = new Date().toISOString().slice(0, 10);
  let ip_hash = "";
  if (ip) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${env.IP_SALT || "pickapeach"}|${day}`));
    ip_hash = [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
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
    ip_hash,
  };
}

function device(ua: string) {
  const tablet = /ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/i.test(ua);
  const mobile = !tablet && /mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua);
  const os = /iphone|ipad|ipod/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /mac os x/i.test(ua) ? "macOS" : /windows/i.test(ua) ? "Windows" : /cros/i.test(ua) ? "ChromeOS" : /linux/i.test(ua) ? "Linux" : "Other";
  const browser = /edg\//i.test(ua) ? "Edge" : /samsungbrowser/i.test(ua) ? "Samsung" : /opr\/|opera/i.test(ua) ? "Opera" : /fxios|firefox/i.test(ua) ? "Firefox" : /crios|chrome/i.test(ua) ? "Chrome" : /instagram/i.test(ua) ? "Instagram" : /fban|fbav/i.test(ua) ? "Facebook" : /safari/i.test(ua) ? "Safari" : "Other";
  return { device: tablet ? "tablet" : mobile ? "mobile" : "desktop", os, browser };
}
