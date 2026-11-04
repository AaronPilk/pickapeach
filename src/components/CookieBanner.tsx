"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type Consent, ensureRegion, getConsent, gpcOn, onConsent, region, setConsent } from "@/lib/consent";
import { track } from "@/lib/track";
import { Close } from "./Icons";

const BOT = /bot|crawl|spider|slurp|lighthouse|pagespeed|headless|preview/i;
const ageOk = () => {
  try {
    const v = localStorage.getItem("pp_age_ok");
    if (v && Date.now() - Number(v) < 30 * 86400000) return true;
  } catch {}
  return document.cookie.includes("pp_age=1");
};

// Cookie notice. Opt-in regions get a real choice with equal buttons; elsewhere a slim notice.
// The settings sheet opens from the banner, the footer ("Cookie settings") and /privacy-choices.
export default function CookieBanner() {
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState(false);
  const [c, setC] = useState<Consent | null>(null);
  const [rule, setRule] = useState<"optin" | "optout">("optout");
  const [gpc, setGpc] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (BOT.test(navigator.userAgent)) return;
    setGpc(gpcOn());
    let ready = region().known;
    const sync = () => {
      setC(getConsent());
      setRule(region().rule);
    };
    const maybeShow = () => {
      if (ready && !getConsent().decided && ageOk()) setShow(true);
    };
    sync();
    ensureRegion().then(() => {
      ready = true;
      sync();
      maybeShow();
    });
    const offConsent = onConsent(sync);
    maybeShow();
    const onAge = () => setTimeout(maybeShow, 350);
    const onOpen = () => {
      setC(getConsent());
      setSettings(true);
    };
    window.addEventListener("pp:age-ok", onAge);
    window.addEventListener("pp:cookie-settings", onOpen);
    return () => {
      offConsent();
      window.removeEventListener("pp:age-ok", onAge);
      window.removeEventListener("pp:cookie-settings", onOpen);
    };
  }, []);

  if (!mounted || path?.startsWith("/admin")) return null;

  const save = (next: { analytics: boolean; ads: boolean }, src: Consent["source"]) => {
    const saved = setConsent(next, src);
    setC(saved);
    setShow(false);
    setSettings(false);
    track("consent", { m: { a: saved.analytics, d: saved.ads, src, rule, gpc } });
  };

  const sheet = settings && c && (
    <SettingsSheet
      c={c}
      gpc={gpc}
      onClose={() => setSettings(false)}
      onSave={(n) => save(n, "settings")}
      onAll={() => save({ analytics: true, ads: true }, "settings")}
      onNone={() => save({ analytics: false, ads: false }, "settings")}
    />
  );

  return (
    <>
      {show && !settings && (rule === "optin" ? (
        <div className="cookie-card glass-thick" role="dialog" aria-label="Cookie choices">
          <h2>Cookies</h2>
          <p>
            We&apos;d like to use cookies to see how the site is used and which ads bring people here. Cookies that keep the site working (like remembering
            you&apos;re 18+) are always on. <Link href="/cookies">Cookie Policy</Link>
          </p>
          <div className="cookie-actions">
            <button className="btn btn-gray" onClick={() => save({ analytics: false, ads: false }, "banner")}>Necessary only</button>
            <button className="btn btn-gray" onClick={() => save({ analytics: true, ads: true }, "banner")}>Accept all</button>
          </div>
          <button className="btn btn-plain btn-sm cookie-choose" onClick={() => setSettings(true)}>Choose what to allow</button>
        </div>
      ) : (
        <div className="cookie-pill glass-thick" role="region" aria-label="Cookie notice">
          <p>
            {gpc ? (
              <>Your browser&apos;s privacy signal is on, so we&apos;ve turned off ad sharing for you. We still use cookies for analytics. </>
            ) : (
              <>We use cookies for analytics and to measure our ads. </>
            )}
            <button className="link-btn" onClick={() => setSettings(true)}>Your choices</button>
          </p>
          <button className="icon-btn gray" aria-label="Close" onClick={() => save({ analytics: c?.analytics ?? true, ads: c?.ads ?? !gpc }, gpc ? "gpc" : "banner")}>
            <Close />
          </button>
        </div>
      ))}
      {sheet && createPortal(sheet, document.body)}
    </>
  );
}

function SettingsSheet({ c, gpc, onClose, onSave, onAll, onNone }: {
  c: Consent; gpc: boolean; onClose: () => void; onSave: (n: { analytics: boolean; ads: boolean }) => void; onAll: () => void; onNone: () => void;
}) {
  const [analytics, setAnalytics] = useState(c.analytics);
  const [ads, setAds] = useState(c.ads && !gpc);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="cookie-layer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cookie-sheet glass-thick" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
        <div className="cookie-sheet-head">
          <h2 id="cookie-title">Cookie settings</h2>
          <button className="icon-btn gray" onClick={onClose} aria-label="Close"><Close /></button>
        </div>
        <div className="group-card">
          <div className="cookie-row">
            <div><b>Necessary</b><p>Remembers you&apos;re 18+, your unlock, your theme and these choices. Always on.</p></div>
            <span className="t-foot c3">Always on</span>
          </div>
          <div className="cookie-row">
            <div><b>Analytics</b><p>A random ID that lets us count visits and see which pages and creators people like.</p></div>
            <button className="switch" role="switch" aria-checked={analytics} aria-label="Analytics cookies" onClick={() => setAnalytics(!analytics)} />
          </div>
          <div className="cookie-row">
            <div>
              <b>Advertising</b>
              <p>{gpc ? "Off because your browser's Global Privacy Control signal is on." : "Tells ad networks when someone they sent taps Follow, so we know which ads work."}</p>
            </div>
            <button className="switch" role="switch" aria-checked={ads} aria-label="Advertising cookies" disabled={gpc} onClick={() => setAds(!ads)} />
          </div>
        </div>
        <div className="cookie-actions">
          <button className="btn btn-gray" onClick={onNone}>Necessary only</button>
          <button className="btn btn-gray" onClick={onAll}>Allow all</button>
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 10 }} onClick={() => onSave({ analytics, ads })}>Save choices</button>
        <p className="t-foot c3" style={{ marginTop: 12, textAlign: "center" }}>
          More in our <Link href="/cookies" onClick={onClose}>Cookie Policy</Link> and <Link href="/privacy-choices" onClick={onClose}>Your Privacy Choices</Link>.
        </p>
      </div>
    </div>
  );
}
