"use client";

import { useRef, useState } from "react";

export type RequestKind = "optout" | "delete" | "access" | "correct" | "ncii" | "copyright" | "impersonation" | "underage" | "other";

const LABELS: Record<RequestKind, string> = {
  optout: "Stop all marketing emails and texts",
  delete: "Delete my information",
  access: "Send me a copy of my information",
  correct: "Correct my information",
  ncii: "An intimate image of me was posted without my consent",
  copyright: "Copyright: my photo or video was used without permission",
  impersonation: "Someone is pretending to be me",
  underage: "Someone shown may be under 18",
  other: "Something else",
};

const NEEDS_URL: RequestKind[] = ["ncii", "copyright", "impersonation", "underage", "other"];
const NEEDS_SIGNATURE: RequestKind[] = ["ncii", "copyright"];

const GOOD_FAITH: Partial<Record<RequestKind, string>> = {
  ncii: "I have a good-faith belief that this image or video of me (or of the person I'm authorized to act for) was published without consent.",
  copyright:
    "I have a good-faith belief that this use isn't authorized by the copyright owner, its agent or the law. The information here is accurate, and under penalty of perjury I'm the owner or authorized to act for the owner.",
};

export default function RequestForm({ kinds, initial }: { kinds: RequestKind[]; initial?: RequestKind }) {
  const [kind, setKind] = useState<RequestKind>(initial || kinds[0]);
  const [f, setF] = useState({ email: "", phone: "", name: "", url: "", details: "", signature: "" });
  const [goodFaith, setGoodFaith] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const shownAt = useRef(Date.now());
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const website = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value || "";
      const r = await fetch("/api/privacy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, ...f, good_faith: goodFaith, website, t: Date.now() - shownAt.current }),
      });
      const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !data.ok) throw new Error(data.error || "That didn't go through. Try again, or email us.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't go through. Try again, or email us.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="req-ok" role="status">
        <b>Got it.</b>{" "}
        {kind === "optout"
          ? "We've stopped marketing to the email and number you gave us. Texts may take up to 10 business days to fully stop; you can also reply STOP to any text."
          : kind === "ncii" || kind === "underage"
            ? "We treat this as urgent. We'll take the content down while we look into it, within 48 hours at the latest, and email you when it's done."
            : "We'll email you within a few days, and finish within 45 days (we'll tell you if we need longer). We may ask you to confirm it's you."}
      </div>
    );
  }

  return (
    <form className="req-form" onSubmit={submit} noValidate>
      <div className="group-card">
        <label>
          <span>What do you need?</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as RequestKind)}>
            {kinds.map((k) => (
              <option key={k} value={k}>{LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Your email</span>
          <input type="email" inputMode="email" autoComplete="email" required value={f.email} onChange={set("email")} placeholder="you@email.com" />
        </label>
        {["optout", "delete", "access", "correct"].includes(kind) && (
          <label>
            <span>Mobile number (if you gave us one)</span>
            <input type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} placeholder="(555) 123-4567" />
          </label>
        )}
        {kind !== "optout" && (
          <label>
            <span>Your name{NEEDS_SIGNATURE.includes(kind) ? "" : " (optional)"}</span>
            <input type="text" autoComplete="name" value={f.name} onChange={set("name")} />
          </label>
        )}
        {NEEDS_URL.includes(kind) && (
          <label>
            <span>Link to the profile, photo or clip{kind === "other" ? " (if any)" : ""}</span>
            <input type="url" inputMode="url" value={f.url} onChange={set("url")} placeholder="https://…" />
          </label>
        )}
        {kind !== "optout" && (
          <label>
            <span>{kind === "correct" ? "What should we fix?" : kind === "copyright" ? "Describe the original work you own" : "Anything else we should know (optional)"}</span>
            <textarea value={f.details} onChange={set("details")} maxLength={4000} />
          </label>
        )}
        {NEEDS_SIGNATURE.includes(kind) && (
          <label>
            <span>Signature: type your full legal name</span>
            <input type="text" value={f.signature} onChange={set("signature")} />
          </label>
        )}
      </div>
      {GOOD_FAITH[kind] && (
        <label className="check">
          <input type="checkbox" checked={goodFaith} onChange={(e) => setGoodFaith(e.target.checked)} />
          <span>{GOOD_FAITH[kind]}</span>
        </label>
      )}
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className={`btn btn-block ${kind === "ncii" || kind === "underage" ? "btn-danger" : "btn-primary"}`} disabled={busy} type="submit">
        {busy ? "Sending…" : kind === "optout" ? "Stop marketing" : "Send request"}
      </button>
    </form>
  );
}
