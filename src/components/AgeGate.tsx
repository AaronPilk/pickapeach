"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Peach } from "./Icons";
import { inPreview, track } from "@/lib/track";
import { ensureRegion, getConsent, onConsent, openCookieSettings, region, setConsent, type Rule } from "@/lib/consent";

const KEY = "pp_age_ok";
const BOT = /bot|crawl|spider|slurp|lighthouse|pagespeed|headless|preview/i;
// Anyone can read the legal pages before agreeing to them. The owner dashboard and creator login have their own sign-in.
const OPEN = ["/terms", "/privacy", "/cookies", "/creator-terms", "/content-removal", "/18-plus", "/privacy-choices", "/admin", "/creator"];

// The 18+ check and the cookie choice live in one box, so a visitor taps once to get in.
// EU/UK/Swiss visitors get two equal buttons (accept or necessary only); everyone else accepts on the way in.
export default function AgeGate() {
  const path = usePathname() || "/";
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [rule, setRule] = useState<Rule | null>(null);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    if (BOT.test(navigator.userAgent) || inPreview()) return;
    let ok = false;
    try {
      const v = localStorage.getItem(KEY);
      ok = !!v && Date.now() - Number(v) < 30 * 86400000;
    } catch {}
    if (!ok && !document.cookie.includes("pp_age=1")) {
      setShow(true);
      track("age_gate_view");
    }
  }, []);

  // Which cookie buttons to show depends on the visitor's region. Wait briefly for it; if it never comes, be strict.
  useEffect(() => {
    if (!show) return;
    setDecided(getConsent().decided);
    const off = onConsent((c) => setDecided(c.decided));
    const r = region();
    if (r.known) {
      setRule(r.rule);
      return off;
    }
    let settled = false;
    const t = setTimeout(() => {
      if (!settled) setRule("optin");
    }, 1500);
    ensureRegion().then(() => {
      settled = true;
      clearTimeout(t);
      setRule(region().rule);
    });
    return () => {
      off();
      clearTimeout(t);
    };
  }, [show]);

  const onOpenPage = OPEN.some((p) => path.startsWith(p));
  useEffect(() => {
    if (!show || onOpenPage) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [show, onOpenPage]);

  if (!show || onOpenPage) return null;

  const enter = (cookies?: "all" | "necessary") => {
    if (cookies) {
      const saved = setConsent(cookies === "all" ? { analytics: true, ads: true } : { analytics: false, ads: false }, "gate");
      track("consent", { m: { a: saved.analytics, d: saved.ads, src: "gate", rule: rule || "optin" } });
    }
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
    document.cookie = `pp_age=1; Path=/; Max-Age=${30 * 86400}; SameSite=Lax`;
    track("age_gate_pass");
    window.dispatchEvent(new Event("pp:age-ok"));
    setLeaving(true);
    setTimeout(() => setShow(false), 200);
  };

  let actions: React.ReactNode;
  if (decided) {
    actions = (
      <button className="btn btn-primary btn-block" onClick={() => enter()} autoFocus>
        Yes, I&apos;m 18 or older
      </button>
    );
  } else if (!rule) {
    actions = <div className="gate-wait" aria-hidden />;
  } else if (rule === "optout") {
    actions = (
      <button className="btn btn-primary btn-block" onClick={() => enter("all")} autoFocus>
        I&apos;m 18+, accept cookies &amp; enter
      </button>
    );
  } else {
    actions = (
      <div className="gate-choice">
        <button className="btn btn-gray btn-block" onClick={() => enter("all")}>
          I&apos;m 18+, accept all cookies
        </button>
        <button className="btn btn-gray btn-block" onClick={() => enter("necessary")}>
          I&apos;m 18+, necessary cookies only
        </button>
      </div>
    );
  }

  return (
    <div className="gate" data-leaving={leaving} role="dialog" aria-modal="true" aria-labelledby="age-title">
      <div className="gate-card glass-thick">
        <div className="logo">
          <Peach />
          <span>
            pick a <b>peach</b>
          </span>
        </div>
        <div className="eighteen">18+</div>
        <h2 id="age-title">Are you 18 or older?</h2>
        <p>This site lists adult creators. You need to be 18, or the age of majority where you live, to continue.</p>
        {actions}
        <a className="btn btn-plain btn-block" href="https://www.google.com" onClick={() => track("age_gate_leave")} rel="nofollow noopener">
          No, take me out
        </a>
        <p className="fine">
          {!decided && (
            <>
              We use cookies to count visits and see which ads bring people here.{" "}
              <button className="link-btn" onClick={openCookieSettings}>Cookie settings</button>
              <br />
            </>
          )}
          By continuing you agree to our <Link href="/terms">Terms</Link>, <Link href="/privacy">Privacy Policy</Link> and{" "}
          <Link href="/cookies">Cookie Policy</Link>.
        </p>
      </div>
    </div>
  );
}
