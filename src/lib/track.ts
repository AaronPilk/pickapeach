"use client";

// First-party tracking. Every event is batched and sent to /api/t (our Worker),
// which enriches it with geo + device info and stores it in Supabase.
// Visitor + session ids also live in cookies so server routes (/go, /api/lead)
// can tie clicks and leads back to the traffic source.
//
// Consent: without analytics consent (EU/UK until they accept, or anyone who turns it off) nothing is
// stored on the device. Events still go out, but anonymously: no visitor ID, a throwaway session ID kept
// in memory for this tab only. Ad pixels only fire with ad consent (and never with Global Privacy Control on).

import { site } from "./config";
import { ensureRegion, getConsent, onConsent, region } from "./consent";

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
// Anonymous mode (no analytics consent): nothing touches cookies or storage.
let memSid = "";
let memTouch: ReturnType<typeof readAttribution>["touch"] | null = null;
const analyticsOn = () => getConsent().analytics;

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
  if (!analyticsOn()) return "anon";
  let v = getCookie(VID) || store(VID);
  if (!v) v = rid();
  setCookie(VID, v, 60 * 60 * 24 * 400);
  store(VID, v);
  return v;
}

function sessionId() {
  if (!analyticsOn()) {
    if (!memSid) {
      memSid = rid();
      ctxPending = true;
    }
    return memSid;
  }
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
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
  const device = {
    sw: screen.width,
    sh: screen.height,
    vw: innerWidth,
    dpr: devicePixelRatio || 1,
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    net: nav.connection?.effectiveType || "",
  };
  // Automation tells (headless browsers report webdriver=true and no languages). Used for bot filtering only.
  const nv = navigator as Navigator & { webdriver?: boolean };
  const signals = { wd: nv.webdriver === true, hl: navigator.languages ? navigator.languages.length : -1 };
  if (!analyticsOn()) {
    const t = memTouch || touch;
    return { ft: t, lt: t, ...device, ...signals };
  }
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
  return { ft: JSON.parse(ft), lt: JSON.parse(lt), ...device, ...signals };
}

function clearStored() {
  for (const k of [VID, SID]) document.cookie = `${k}=; Path=/; Max-Age=0`;
  try {
    for (const k of [VID, FT]) localStorage.removeItem(k);
    for (const k of [SID, SID + "_t", LT]) sessionStorage.removeItem(k);
  } catch {}
}

// The dashboard shows pages inside a frame for heatmaps. Nothing is tracked there.
export const inPreview = () => typeof window !== "undefined" && window.top !== window.self;

export function initTracking() {
  if (started || typeof window === "undefined" || inPreview()) return;
  started = true;
  memTouch = readAttribution().touch;
  ensureRegion();
  onConsent((c) => {
    if (!c.analytics) {
      clearStored();
      memSid = "";
    }
    ctxPending = true; // next batch carries attribution under the new mode
  });
  visitorId();
  sessionId();
  // A new campaign click mid-session starts a fresh last-touch.
  const { hasCampaign, touch } = readAttribution();
  if (hasCampaign) {
    if (analyticsOn()) {
      try {
        sessionStorage.setItem(LT, JSON.stringify(touch));
      } catch {}
    }
    ctxPending = true;
  }
  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  // First real interaction (tap, scroll, key) marks the visit as "engaged": a strong sign of a real person.
  const engage = () => {
    ["pointerdown", "touchstart", "keydown", "scroll"].forEach((t) => removeEventListener(t, engage, true));
    track("engage");
  };
  ["pointerdown", "touchstart", "keydown", "scroll"].forEach((t) => addEventListener(t, engage, { capture: true, passive: true }));
  addEventListener("pagehide", () => flush(true));
}

export function track(type: string, data: { c?: string; m?: Meta } = {}) {
  if (typeof window === "undefined" || inPreview()) return;
  initTracking();
  sessionId(); // keeps the session sliding
  queue.push({ t: type, ts: Date.now(), p: location.pathname, ...(data.c ? { c: data.c } : {}), ...(data.m ? { m: data.m } : {}) });
  firePixels(type, data.c);
  forwardGa(type, data);
  if (queue.length >= 20) flush();
  else if (!timer) timer = setTimeout(() => flush(), 2500);
}

let regionWaits = 0;
export function flush(final = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  // First visit: wait briefly for the region lookup so the first page isn't logged as a separate anonymous visit.
  if (!final && !region().known && regionWaits++ < 8) {
    timer = setTimeout(() => flush(), 400);
    return;
  }
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
  if (!urls?.length || !getConsent().ads) return;
  for (const u of urls) {
    const img = new Image();
    img.referrerPolicy = "no-referrer-when-downgrade";
    img.src = u.replace("{ts}", String(Date.now())).replace("{event}", type).replace("{creator}", creator || "");
  }
}

function forwardGa(type: string, data: { c?: string; m?: Meta }) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  if (!w.gtag || type === "page_view" || !analyticsOn()) return;
  w.gtag("event", type, { creator: data.c, ...data.m });
}

// Visitor's last-touch source label, used for display + lead attribution.
export function currentSource() {
  try {
    const lt = analyticsOn() ? JSON.parse(sessionStorage.getItem(LT) || "{}") : memTouch || {};
    return lt?.q?.utm_source || lt?.q?.src || lt?.ref_host || "direct";
  } catch {
    return "direct";
  }
}

// Session id for this visit (in-memory one when there's no analytics consent). Lets /go and leads join the visit.
export function currentSessionId() {
  return sessionId();
}

// First and last touch for a lead, from storage (with consent) or from memory (without).
export function leadAttribution() {
  try {
    if (analyticsOn()) return { ft: JSON.parse(localStorage.getItem(FT) || "null"), lt: JSON.parse(sessionStorage.getItem(LT) || "null") };
  } catch {}
  return { ft: memTouch, lt: memTouch };
}
