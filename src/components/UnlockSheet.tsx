"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Sheet from "./Sheet";
import { Check, Lock } from "./Icons";
import { closeGate, markUnlocked, useVip } from "@/lib/vip";
import { currentSessionId, leadAttribution, track } from "@/lib/track";
import { SMS_CONSENT_TEXT } from "@/lib/sms";
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
  const openedAt = useRef(0);
  const count = vip.summary?.count ?? 0;

  useEffect(() => {
    if (vip.open) {
      openedAt.current = Date.now();
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
    const attr = leadAttribution();
    try {
      const hp = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value || "";
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "vip", email: email.trim(), phone, consent, origin: vip.origin, creator: vip.creator, page: location.pathname, attr, website: hp, t: Date.now() - openedAt.current, sid: currentSessionId() }),
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; vip?: VipContent; existing?: boolean };
      if (!r.ok || !data.ok) throw new Error(data.error || "Something went wrong. Try again.");
      track("lead_success", { c: vip.creator, m: { o: vip.origin, existing: !!data.existing } });
      markUnlocked(data.vip || null);
      setDone(true);
    } catch (err) {
      submitted.current = false;
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      track("lead_error", { m: { o: vip.origin } });
    } finally {
      setBusy(false);
    }
  };

  const n = vip.content?.creators.length || count;

  return (
    <Sheet open={vip.open} onClose={close} label="Unlock the hidden creators" hideHead>
      {done ? (
        <div className="success">
          <div className="tick">
            <Check />
          </div>
          <h2 className="t-title2">You&apos;re in</h2>
          <p className="c2 t-sub" style={{ marginTop: 6 }}>
            {n ? `All ${n} hidden girls are unlocked on this device.` : "The hidden girls are unlocked on this device."}
          </p>
          <Link href="/vip" className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={() => closeGate()}>
            See them now
          </Link>
          <button className="btn btn-plain btn-block" onClick={() => closeGate()}>
            Keep browsing
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="unlock-hero">
            <div className="ico">
              <Lock />
            </div>
            <h2>{count ? `See ${count} more girls` : "See everyone"}</h2>
            <p>Some of our creators are hidden. Add your email and number once to see all of them. It&apos;s free, and only our team sees your details. We never show them to anyone else.</p>
          </div>
          <div className="form-card">
            <label data-invalid={touched && !emailOk}>
              <span>Email</span>
              <input type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label data-invalid={touched && !phoneOk(phone)}>
              <span>Mobile</span>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} required />
            </label>
          </div>
          <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={touched && !consent} />
            <span>
              {SMS_CONSENT_TEXT}{" "}
              See our <Link href="/terms#messages" onClick={() => closeGate()}>Terms</Link> and <Link href="/privacy" onClick={() => closeGate()}>Privacy Policy</Link>.
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {touched && !valid && !error && <p className="form-error">Add a valid email and mobile number, and tick the box.</p>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={busy} type="submit">
            {busy ? "Unlocking…" : "Unlock free"}
          </button>
          <button type="button" className="btn btn-plain btn-block" onClick={close}>
            Not now
          </button>
        </form>
      )}
    </Sheet>
  );
}
