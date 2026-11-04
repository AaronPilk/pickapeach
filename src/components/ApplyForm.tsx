"use client";

import { useState } from "react";
import { Check } from "./Icons";
import { track } from "@/lib/track";

export default function ApplyForm() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    setState("busy");
    setError("");
    track("apply_submit");
    try {
      const r = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, kind: "creator", consent: form.get("consent") === "on", page: "/apply" }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Something went wrong.");
      track("apply_success");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
    }
  };

  if (state === "done")
    return (
      <div className="success">
        <div className="tick"><Check /></div>
        <h2>Got it, thank you.</h2>
        <p className="muted" style={{ marginTop: 8 }}>We review every application and we&apos;ll reach out within a few days if it&apos;s a fit.</p>
      </div>
    );

  return (
    <form onSubmit={submit}>
      <label className="field"><span>Name</span><input className="input" name="name" required autoComplete="name" /></label>
      <label className="field"><span>Email</span><input className="input" name="email" type="email" required autoComplete="email" inputMode="email" /></label>
      <label className="field"><span>Phone (optional)</span><input className="input" name="phone" type="tel" autoComplete="tel" inputMode="tel" /></label>
      <label className="field"><span>Instagram</span><input className="input" name="instagram" placeholder="@yourhandle" /></label>
      <label className="field"><span>TikTok</span><input className="input" name="tiktok" placeholder="@yourhandle" /></label>
      <label className="field"><span>Your fans page link</span><input className="input" name="fans" type="url" placeholder="https://" /></label>
      <label className="field"><span>Anything else?</span><textarea className="input" name="message" rows={3} style={{ height: "auto", padding: 14 }} /></label>
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
      <label className="check">
        <input type="checkbox" name="consent" required />
        <span>I&apos;m 18 or older, these accounts are mine, and Pick a Peach can contact me about my application.</span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn btn-coral btn-block" style={{ marginTop: 16 }} disabled={state === "busy"}>
        {state === "busy" ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
