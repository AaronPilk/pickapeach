"use client";

import { useEffect, useState } from "react";
import { Peach } from "./Icons";
import { track } from "@/lib/track";

const KEY = "pp_age_ok";
const BOT = /bot|crawl|spider|slurp|lighthouse|pagespeed|headless|preview/i;

export default function AgeGate() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (BOT.test(navigator.userAgent)) return;
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

  useEffect(() => {
    if (!show) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;

  const enter = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
    document.cookie = `pp_age=1; Path=/; Max-Age=${30 * 86400}; SameSite=Lax`;
    track("age_gate_pass");
    setLeaving(true);
    setTimeout(() => setShow(false), 240);
  };

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
        <h2 id="age-title">Adults only</h2>
        <p>This site lists adult creators. Confirm you&apos;re 18 or older (or the age of majority where you live) to keep going.</p>
        <button className="btn btn-coral btn-block" onClick={enter} autoFocus>
          I&apos;m 18 or older
        </button>
        <a
          className="btn btn-glass btn-block"
          href="https://www.google.com"
          onClick={() => track("age_gate_leave")}
          rel="nofollow noopener"
        >
          Take me out
        </a>
        <p className="fine">By entering you agree to our Terms and Privacy Policy.</p>
      </div>
    </div>
  );
}
