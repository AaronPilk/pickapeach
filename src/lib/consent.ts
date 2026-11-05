"use client";

// Cookie consent.
// - EU/EEA, UK, Switzerland ("optin"): analytics + ad cookies stay off until the visitor says yes.
// - Everywhere else ("optout"): on by default, with a short notice and a one-tap way to turn them off.
// - Global Privacy Control (browser opt-out signal) always turns off ad sharing, everywhere.
// The region comes from /api/geo (country only), cached for a day in the pp_geo cookie. Until it's known we
// behave as opt-in, so nothing is stored for an EU visitor on their very first page. Choices live in pp_consent.

export type Consent = { analytics: boolean; ads: boolean; decided: boolean; source: "default" | "banner" | "settings" | "gpc" | "gate" };
export type Rule = "optin" | "optout";

const KEY = "pp_consent";
const EVENT = "pp:consent";
const VERSION = 1;

function readCookie(k: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${k}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

export function region(): { country: string; rule: Rule; known: boolean } {
  const raw = readCookie("pp_geo");
  const [country = "", rule = ""] = raw.split(".");
  return { country, rule: rule === "optout" ? "optout" : "optin", known: !!raw };
}

let geoPromise: Promise<void> | null = null;
// Looks up the visitor's region once (then it's cached in the pp_geo cookie for a day).
export function ensureRegion(): Promise<void> {
  if (typeof window === "undefined" || region().known) return Promise.resolve();
  geoPromise ??= fetch("/api/geo", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { country?: string; rule?: string } | null) => {
      // Fallback if the endpoint fails: treat as opt-in for this page only.
      if (!d && !region().known) return;
      window.dispatchEvent(new CustomEvent(EVENT, { detail: getConsent() }));
    })
    .catch(() => {});
  return geoPromise;
}

export function gpcOn() {
  return typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

function stored(): Consent | null {
  const raw = readCookie(KEY);
  if (!raw) return null;
  const q = new URLSearchParams(raw);
  if (Number(q.get("v")) !== VERSION) return null;
  return { analytics: q.get("a") === "1", ads: q.get("d") === "1", decided: true, source: (q.get("s") as Consent["source"]) || "banner" };
}

export function getConsent(): Consent {
  const gpc = gpcOn();
  const saved = stored();
  if (saved) return { ...saved, ads: saved.ads && !gpc };
  const { rule, known } = region();
  if (!known || rule === "optin") return { analytics: false, ads: false, decided: false, source: "default" };
  return { analytics: true, ads: !gpc, decided: false, source: gpc ? "gpc" : "default" };
}

export function setConsent(next: { analytics: boolean; ads: boolean }, source: Consent["source"] = "banner") {
  const ads = next.ads && !gpcOn();
  const value = new URLSearchParams({ v: String(VERSION), a: next.analytics ? "1" : "0", d: ads ? "1" : "0", s: source, t: String(Date.now()) }).toString();
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${KEY}=${encodeURIComponent(value)}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
  const c: Consent = { analytics: next.analytics, ads, decided: true, source };
  window.dispatchEvent(new CustomEvent(EVENT, { detail: c }));
  return c;
}

export function onConsent(fn: (c: Consent) => void) {
  const h = (e: Event) => fn((e as CustomEvent<Consent>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

// Lets any "Cookie settings" link reopen the banner's settings view.
export function openCookieSettings() {
  window.dispatchEvent(new Event("pp:cookie-settings"));
}
