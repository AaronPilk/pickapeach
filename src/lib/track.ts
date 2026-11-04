"use client";

// First-party tracking. Every event is batched and sent to /api/t (our Worker),
// which enriches it with geo + device info and stores it in Supabase.
// Visitor + session ids also live in cookies so server routes (/go, /api/lead)
// can tie clicks and leads back to the traffic source.

import { site } from "./site";

type Meta = Record<string, string | number | boolean | null | undefined>;
type Ev = { t: string; ts: number; p: string; c?: string; m?: Meta };

const VID = "pp_vid";
const SID = "pp_sid";
const FT = "pp_ft"; // first touch (never overwritten)
const LT = "pp_lt"; // last touch (per session)
const SESSION_MS = 30 * 60 * 1000;

const queue: Ev[] = [];
let ctxPending = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

const KNOWN = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "ttclid", "msclkid", "src", "source", "ref"];

function rid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getCookie(k: string) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${k}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}
function setCookie(k: string, v: string, maxAge: number) {
  document.cookie = `${k}=${encodeURIComponent(v)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
function store(k: string, v?: string) {
  try {
    if (v === undefined) return localStorage.getItem(k) || "";
    localStorage.setItem(k, v);
  } catch {}
  return v || "";
}

function visitorId() {
  let v = getCookie(VID) || store(VID);
  if (!v) v = rid();
  setCookie(VID, v, 60 * 60 * 24 * 400);
  store(VID, v);
  return v;
}

function sessionId() {
  let s = "";
  let last = 0;
  try {
    s = sessionStorage.getItem(SID) || "";
    last = Number(sessionStorage.getItem(SID + "_t") || 0);
  } catch {}
  if (!s) s = getCookie(SID);
  const fresh = !s || (last && Date.now() - last > SESSION_MS);
  if (fresh) {
    s = rid();
    ctxPending = true;
  }
  try {
    sessionStorage.setItem(SID, s);
    sessionStorage.setItem(SID + "_t", String(Date.now()));
  } catch {}
  setCookie(SID, s, SESSION_MS / 1000);
  return s;
}

function readAttribution() {
  const q = new URLSearchParams(location.search);
  const params: Record<string, string> = {};
  let n = 0;
  q.forEach((v, k) => {
    if (n++ < 25) params[k.slice(0, 40)] = v.slice(0, 200);
  });
  const ref = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : "";
  const hasCampaign = KNOWN.some((k) => q.has(k)) || n > 0;
  return {
    hasCampaign,
    touch: {
      at: new Date().toISOString(),
      land: location.pathname,
      ref,
      ref_host: ref ? safeHost(ref) : "",
      q: params,
    },
  };
}

function safeHost(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function buildCtx() {
  const { touch } = readAttribution();
  let ft = store(FT);
  if (!ft) {
    ft = JSON.stringify(touch);
    store(FT, ft);
  }
  let lt = "";
  try {
    lt = sessionStorage.getItem(LT) || "";
  } catch {}
  if (!lt) {
    lt = JSON.stringify(touch);
    try {
      sessionStorage.setItem(LT, lt);
    } catch {}
  }
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
  return {
    ft: JSON.parse(ft),
    lt: JSON.parse(lt),
    sw: screen.width,
    sh: screen.height,
    vw: innerWidth,
    dpr: devicePixelRatio || 1,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    net: nav.connection?.effectiveType || "",
  };
}

export function initTracking() {
  if (started || typeof window === "undefined") return;
  started = true;
  visitorId();
  sessionId();
  // A new campaign click mid-session starts a fresh last-touch.
  const { hasCampaign, touch } = readAttribution();
  if (hasCampaign) {
    try {
      sessionStorage.setItem(LT, JSON.stringify(touch));
    } catch {}
    ctxPending = true;
  }
  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  addEventListener("pagehide", () => flush(true));
}

export function track(type: string, data: { c?: string; m?: Meta } = {}) {
  if (typeof window === "undefined") return;
  initTracking();
  sessionId(); // keeps the session sliding
  queue.push({ t: type, ts: Date.now(), p: location.pathname, ...(data.c ? { c: data.c } : {}), ...(data.m ? { m: data.m } : {}) });
  firePixels(type, data.c);
  forwardGa(type, data);
  if (queue.length >= 20) flush();
  else if (!timer) timer = setTimeout(() => flush(), 2500);
}

export function flush(final = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const body: Record<string, unknown> = { v: visitorId(), s: sessionId(), e: queue.splice(0, queue.length) };
  if (ctxPending) {
    body.ctx = buildCtx();
    ctxPending = false;
  }
  const json = JSON.stringify(body);
  try {
    if (final && navigator.sendBeacon) {
      navigator.sendBeacon("/api/t", new Blob([json], { type: "application/json" }));
      return;
    }
    fetch("/api/t", { method: "POST", body: json, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {}
}

function firePixels(type: string, creator?: string) {
  const urls = (site.pixels as Record<string, string[]>)[type];
  if (!urls?.length) return;
  for (const u of urls) {
    const img = new Image();
    img.referrerPolicy = "no-referrer-when-downgrade";
    img.src = u.replace("{ts}", String(Date.now())).replace("{event}", type).replace("{creator}", creator || "");
  }
}

function forwardGa(type: string, data: { c?: string; m?: Meta }) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  if (!w.gtag || type === "page_view") return;
  w.gtag("event", type, { creator: data.c, ...data.m });
}

// Visitor's last-touch source label, used for display + lead attribution.
export function currentSource() {
  try {
    const lt = JSON.parse(sessionStorage.getItem(LT) || "{}");
    return lt?.q?.utm_source || lt?.q?.src || lt?.ref_host || "direct";
  } catch {
    return "direct";
  }
}
