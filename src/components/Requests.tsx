"use client";

import { useCallback, useEffect, useState } from "react";

type Req = {
  id: string; kind: string; email: string; phone?: string; name?: string; url?: string; details?: string; signature?: string; good_faith: boolean;
  status: "open" | "done" | "erased" | "rejected"; admin_note?: string; country?: string; created_at: string; resolved_at?: string;
  matching_leads: number; matching_creators: number;
};

const KIND: Record<string, string> = {
  optout: "Stop marketing", delete: "Delete my data", access: "Copy of my data", correct: "Correct my data",
  ncii: "Non-consensual image", underage: "May be under 18", impersonation: "Impersonation", copyright: "Copyright (DMCA)", other: "Other",
};
const URGENT = ["ncii", "underage"];

// Privacy requests and content reports. Urgent ones (non-consent, under 18) show a 48-hour countdown.
export default function Requests() {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [flash, setFlash] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/requests", { cache: "no-store" });
    setRows(r.ok ? await r.json() : []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (q: Req, action: "done" | "reject" | "erase") => {
    if (action === "erase" && !confirm(`Erase everything we hold for ${q.email}? This wipes ${q.matching_leads} lead record(s) and ${q.matching_creators} creator account(s), including uploaded files. It can't be undone.`)) return;
    const note = action === "reject" ? prompt("Why? (kept with the request)") || "" : "";
    const r = await fetch("/api/admin/requests/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: q.id, action, note }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setFlash(d.error || "That didn't work.");
    setFlash(action === "erase" ? `Erased: ${d.erased_leads} lead(s), ${(d.creator_accounts || []).length} creator account(s), ${d.media_deleted} file(s).` : "Updated.");
    load();
  };

  if (!rows) return <p className="c3" style={{ marginTop: 16 }}>Loading…</p>;
  const shown = rows.filter((q) => filter === "all" || q.status === "open");
  const open = rows.filter((q) => q.status === "open").length;

  return (
    <section style={{ marginTop: 6 }}>
      <div className="chips" style={{ paddingTop: 4 }}>
        <button className="chip" aria-pressed={filter === "open"} onClick={() => setFilter("open")}>Open {open ? <span className="count">{open}</span> : null}</button>
        <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
      </div>
      <p className="t-foot c2" style={{ margin: "8px 4px 0" }}>
        Opt-outs and deletion requests stop marketing automatically the moment they arrive. Non-consent and under-18 reports must be taken down within 48
        hours: hide the profile in Approvals (or set the row inactive in the sheet), then mark done.
      </p>
      {flash && <p className="studio-ok" role="status">{flash}</p>}
      {!shown.length && <p className="c3" style={{ marginTop: 16 }}>Nothing open. Nice.</p>}
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {shown.map((q) => {
          const hoursLeft = 48 - (Date.now() - new Date(q.created_at).getTime()) / 3600000;
          const urgent = URGENT.includes(q.kind) && q.status === "open";
          return (
            <div key={q.id} className="group-card" style={{ padding: 16, boxShadow: urgent ? "0 0 0 1px #ff453a" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <b>{KIND[q.kind] || q.kind}</b>
                <span className="t-foot" style={{ color: urgent ? "#ff453a" : "var(--label-3)", fontWeight: urgent ? 700 : 400 }}>
                  {urgent ? (hoursLeft > 0 ? `${Math.floor(hoursLeft)}h left` : "OVERDUE") : q.status === "open" ? ago(q.created_at) : q.status}
                </span>
              </div>
              <p className="t-foot c2" style={{ marginTop: 6, wordBreak: "break-word" }}>
                {q.email}{q.phone ? ` · ${q.phone}` : ""}{q.name ? ` · ${q.name}` : ""}{q.country ? ` · ${q.country}` : ""}
              </p>
              {q.url && <p className="t-foot" style={{ marginTop: 4, wordBreak: "break-all" }}><a className="ct" href={q.url} target="_blank" rel="noopener noreferrer nofollow">{q.url}</a></p>}
              {q.details && <p className="t-foot" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{q.details}</p>}
              {q.signature && <p className="t-foot c3" style={{ marginTop: 6 }}>Signed: {q.signature} · good-faith statement {q.good_faith ? "ticked" : "missing"}</p>}
              {["delete", "access", "correct", "optout"].includes(q.kind) && (
                <p className="t-foot c3" style={{ marginTop: 6 }}>We hold: {q.matching_leads} lead record(s), {q.matching_creators} creator account(s) for this email/number.</p>
              )}
              {q.admin_note && <p className="t-foot c3" style={{ marginTop: 6 }}>Note: {q.admin_note}</p>}
              {q.status === "open" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {q.kind === "delete" && <button className="btn btn-sm btn-danger" onClick={() => act(q, "erase")}>Erase their data</button>}
                  <button className="btn btn-sm btn-primary" onClick={() => act(q, "done")}>Mark done</button>
                  <button className="btn btn-sm btn-gray" onClick={() => act(q, "reject")}>Decline</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ago(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))}m ago` : h < 48 ? `${Math.round(h)}h ago` : `${Math.round(h / 24)}d ago`;
}
