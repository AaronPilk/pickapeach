"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Sheet from "./Sheet";
import { Check, Clips, Lock, Sparkle, Bolt } from "./Icons";
import { closeGate, markUnlocked, useVip } from "@/lib/vip";
import { track } from "@/lib/track";
import type { VipContent } from "@/lib/types";

function formatPhone(v: string) {
  if (v.trim().startsWith("+")) return v.replace(/[^\d+\s()-]/g, "");
  const d = v.replace(/\D/g, "").slice(0, 11);
  const x = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (x.length < 4) return x;
  if (x.length < 7) return `(${x.slice(0, 3)}) ${x.slice(3)}`;
  return `(${x.slice(0, 3)}) ${x.slice(3, 6)}-${x.slice(6, 10)}`;
}
function phoneOk(v: string) {
  const d = v.replace(/\D/g, "");
  return v.trim().startsWith("+") ? d.length >= 8 && d.length <= 15 : d.length === 10 || (d.length === 11 && d.startsWith("1"));
}

export default function UnlockSheet() {
  const vip = useVip();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [touched, setTouched] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (vip.open) {
      submitted.current = false;
      setError("");
      setDone(vip.unlocked);
      track("gate_open", { c: vip.creator, m: { o: vip.origin, unlocked: vip.unlocked } });
    }
  }, [vip.open, vip.origin, vip.creator, vip.unlocked]);

  const close = () => {
    if (vip.open && !submitted.current && !vip.unlocked) track("gate_close", { c: vip.creator, m: { o: vip.origin } });
    closeGate();
  };

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim());
  const valid = emailOk && phoneOk(phone) && consent;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    submitted.current = true;
    track("lead_submit", { c: vip.creator, m: { o: vip.origin } });
    let attr: unknown = null;
    try {
      attr = { ft: JSON.parse(localStorage.getItem("pp_ft") || "null"), lt: JSON.parse(sessionStorage.getItem("pp_lt") || "null") };
    } catch {}
    try {
      const hp = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value || "";
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "vip", email: email.trim(), phone, consent, origin: vip.origin, creator: vip.creator, page: location.pathname, attr, website: hp }),
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; vip?: VipContent; existing?: boolean };
      if (!r.ok || !data.ok) throw new Error(data.error || "Something went wrong. Try again.");
      track("lead_success", { c: vip.creator, m: { o: vip.origin, existing: !!data.existing } });
      markUnlocked(data.vip || null);
      setDone(true);
      setTimeout(() => closeGate(), 1600);
    } catch (err) {
      submitted.current = false;
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      track("lead_error", { m: { o: vip.origin } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={vip.open} onClose={close} label="Unlock VIP" hideHead>
      {done ? (
        <div className="success">
          <div className="tick">
            <Check />
          </div>
          <h2>You&apos;re in.</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            VIP is unlocked on this device. Look for the coral sparkle on every profile.
          </p>
          <button className="btn btn-glass btn-block" style={{ marginTop: 20 }} onClick={() => closeGate()}>
            Start browsing
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="unlock-hero">
            <div className="lock-ico">
              <Lock />
            </div>
            <h2>Unlock VIP, free</h2>
            <p>Extra photos and clips from every creator. Takes 10 seconds.</p>
          </div>
          <div className="perks-row">
            <span><Sparkle /> VIP photos</span>
            <span><Clips /> Members-only clips</span>
            <span><Bolt /> New girls first</span>
          </div>
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={touched && !emailOk}
              required
            />
          </label>
          <label className="field">
            <span>Mobile number</span>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              aria-invalid={touched && !phoneOk(phone)}
              required
            />
          </label>
          <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={touched && !consent} />
            <span>
              I&apos;m 18+ and I agree to get emails and texts from Pick a Peach about new creators and drops. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
              <Link href="/privacy" onClick={() => closeGate()}>Privacy Policy</Link> and <Link href="/terms" onClick={() => closeGate()}>Terms</Link>.
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {touched && !valid && !error && <p className="form-error">Add a valid email, mobile number and tick the box.</p>}
          <button className="btn btn-coral btn-block" style={{ marginTop: 16 }} disabled={busy} type="submit">
            {busy ? "Unlocking…" : "Unlock now"}
          </button>
          <button type="button" className="btn btn-block" style={{ marginTop: 4, color: "var(--text-3)" }} onClick={close}>
            Not now
          </button>
        </form>
      )}
    </Sheet>
  );
}
