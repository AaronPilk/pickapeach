"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ProfileBody } from "./Profile";
import { Close, Play } from "./Icons";
import type { Creator } from "@/lib/types";

type App = {
  id: string;
  email: string;
  slug?: string;
  status: string;
  tier: "public" | "hidden";
  isLive: boolean;
  age?: number;
  note?: string;
  attest?: Record<string, boolean | string>;
  submittedAt?: string;
  updatedAt: string;
  data: {
    name?: string; handle?: string; tagline?: string; bio?: string; location?: string; region?: string; height?: string; hair?: string; eyes?: string;
    tags?: string[]; fansUrl?: string; free?: boolean; socials?: Record<string, string>;
    photos?: { src: string; w: number; h: number }[]; clips?: { src: string; poster: string; w: number; h: number; duration: number }[];
  };
};

const FILTERS = [["pending", "Waiting"], ["approved", "Live"], ["changes", "Changes asked"], ["rejected", "Rejected"], ["all", "All"]] as const;

export default function Approvals() {
  const [apps, setApps] = useState<App[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("pending");
  const [open, setOpen] = useState<App | null>(null);
  const [flash, setFlash] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/creators", { cache: "no-store" });
    setApps(r.ok ? await r.json() : []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (a: App, action: string, extra: { tier?: string; note?: string } = {}) => {
    const r = await fetch("/api/admin/creators/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: a.id, action, ...extra }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setFlash(data.error || "That didn't work.");
      return;
    }
    const verb = { approve: "Approved", changes: "Sent back for changes", reject: "Rejected", unpublish: "Taken down", tier: "Moved" }[action] || "Done";
    setFlash(`${verb}: ${a.data.name || a.email}.${data.rebuilding ? " The site is rebuilding, live in about a minute." : action === "approve" && (extra.tier || a.tier) === "public" ? " It shows up after the next deploy." : ""}`);
    setOpen(null);
    load();
  };

  if (!apps) return <p className="c3" style={{ marginTop: 16 }}>Loading…</p>;
  const shown = apps.filter((a) => filter === "all" || a.status === filter);
  const waiting = apps.filter((a) => a.status === "pending").length;

  return (
    <section style={{ marginTop: 6 }}>
      <div className="chips" style={{ paddingTop: 4 }}>
        {FILTERS.map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {l} {k === "pending" && waiting ? <span className="count">{waiting}</span> : null}
          </button>
        ))}
      </div>
      {flash && <p className="studio-ok" role="status">{flash}</p>}
      {!shown.length && <p className="c3" style={{ marginTop: 16 }}>Nothing here right now.</p>}
      <div className="post-list" style={{ marginTop: 10 }}>
        {shown.map((a) => (
          <button key={a.id} className="post-row" style={{ width: "100%", textAlign: "left" }} onClick={() => setOpen(a)}>
            <span style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
              <span style={{ width: 44, height: 55, borderRadius: 10, overflow: "hidden", flex: "none", background: "var(--img-bg)" }}>
                {a.data.photos?.[0] && <img src={a.data.photos[0].src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="t-headline" style={{ display: "block" }}>{a.data.name || "No name yet"}{a.age ? <span className="c3" style={{ fontWeight: 400 }}> · {a.age}</span> : null}</span>
                <span className="t-foot c2" style={{ display: "block" }}>
                  {statusLabel(a)} · {a.tier === "hidden" ? "Hidden" : "Public"} · {a.data.photos?.length || 0} photos · {a.data.clips?.length || 0} clips
                </span>
              </span>
            </span>
            <span className="t-foot c3">{timeAgo(a.submittedAt || a.updatedAt)}</span>
          </button>
        ))}
      </div>
      {open && <Review a={open} onClose={() => setOpen(null)} onAct={act} />}
    </section>
  );
}

function Review({ a, onClose, onAct }: { a: App; onClose: () => void; onAct: (a: App, action: string, extra?: { tier?: string; note?: string }) => void }) {
  const [tier, setTier] = useState<"public" | "hidden">(a.tier);
  const [note, setNote] = useState(a.note || "");
  const [preview, setPreview] = useState(false);
  const [play, setPlay] = useState<string | null>(null);
  const d = a.data;
  const checks: [string, string][] = [["adult", "18 or older"], ["everyone_adult", "Everyone shown is 18+"], ["owner", "Owns the content and accounts"], ["non_explicit", "Not explicit"], ["terms", "Agreed to Creator Terms"]];
  const asCreator: Creator = {
    slug: a.slug || "preview", name: d.name || "", handle: d.handle, tagline: d.tagline || "", bio: d.bio || "", age: a.age, location: d.location, region: d.region,
    height: d.height, hair: d.hair, eyes: d.eyes, tags: d.tags || [], fansUrl: d.fansUrl || "#", free: d.free ?? true, addedAt: "", updatedAt: "",
    socials: d.socials || {}, photos: d.photos?.length ? d.photos : [{ src: "/media/ui/vip-blur-1.svg", w: 1080, h: 1350 }], clips: d.clips || [], locked: tier === "hidden",
  };

  return createPortal(
    <div className="preview-layer" role="dialog" aria-modal="true" aria-label={`Review ${d.name || a.email}`}>
      <div className="preview-bar glass-thick">
        <b>{preview ? "Profile preview" : `Review: ${d.name || a.email}`}</b>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm btn-gray" onClick={() => setPreview(!preview)}>{preview ? "Details" : "Preview"}</button>
          <button className="icon-btn gray" onClick={onClose} aria-label="Close"><Close /></button>
        </div>
      </div>
      {preview ? (
        <ProfileBody c={asCreator} related={[]} preview />
      ) : (
        <div className="wrap" style={{ maxWidth: 820, paddingBottom: 140 }}>
          <div className="group" style={{ marginTop: 16 }}>
            <div className="group-label">Age check</div>
            <div className="group-card">
              <div className="row"><span className="k">Age from birthday</span><span className="v" style={{ color: (a.age ?? 0) >= 18 ? "#34c759" : "#ff453a", fontWeight: 600 }}>{a.age ?? "missing"}</span></div>
              {checks.map(([k, l]) => (
                <div key={k} className="row"><span className="k">{l}</span><span className="v">{a.attest?.[k] === true ? "Yes" : "No"}</span></div>
              ))}
              <div className="row"><span className="k">Page link</span>{d.fansUrl ? <a className="v ct" href={d.fansUrl} target="_blank" rel="noopener nofollow">{d.fansUrl.replace(/^https?:\/\//, "")}</a> : <span className="v">missing</span>}</div>
            </div>
            <p className="t-foot c2 studio-hint" style={{ marginTop: 8 }}>Open her page link and check the name and photos match. Platforms like OnlyFans ID-verify every creator, so a real, matching page is your best age check.</p>
          </div>

          <div className="group">
            <div className="group-label">Photos ({d.photos?.length || 0})</div>
            <div className="media-grid">
              {(d.photos || []).map((p) => (
                <a key={p.src} className="media-tile photo" href={p.src} target="_blank" rel="noopener"><img src={p.src} alt="" loading="lazy" /></a>
              ))}
            </div>
          </div>

          {!!d.clips?.length && (
            <div className="group">
              <div className="group-label">Clips ({d.clips.length})</div>
              <div className="media-grid clips">
                {d.clips.map((c) => (
                  <button key={c.src} className="media-tile clip" onClick={() => setPlay(c.src)}>
                    <img src={c.poster} alt="" loading="lazy" />
                    <span className="play-pill"><Play /> {Math.round(c.duration)}s</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="group">
            <div className="group-label">Profile</div>
            <div className="group-card">
              {([["Name", d.name], ["Handle", d.handle], ["Email", a.email], ["City", d.location], ["Height", d.height], ["Hair", d.hair], ["Eyes", d.eyes], ["Vibe", d.tags?.join(", ")], ["Free page", d.free ? "Yes" : "No"]] as [string, string | undefined][]).map(([k, v]) => (
                <div key={k} className="row"><span className="k">{k}</span><span className="v">{v || "—"}</span></div>
              ))}
              {Object.entries(d.socials || {}).map(([k, v]) => (
                <div key={k} className="row"><span className="k" style={{ textTransform: "capitalize" }}>{k}</span><span className="v">@{v}</span></div>
              ))}
              {d.tagline && <p className="row-text"><b>{d.tagline}</b></p>}
              {d.bio && <p className="row-text c2">{d.bio}</p>}
            </div>
          </div>

          <div className="group">
            <div className="group-label">Where she shows up</div>
            <div className="seg" style={{ display: "flex" }}>
              {(["public", "hidden"] as const).map((t) => (
                <button key={t} aria-pressed={tier === t} style={{ flex: 1, ...(tier === t ? { background: "var(--cell-2)", boxShadow: "0 3px 8px rgba(0,0,0,.12)" } : {}) }} onClick={() => setTier(t)}>
                  {t === "public" ? "Public (everyone)" : "Hidden (unlock wall)"}
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>Note to creator (sent with changes or rejection)</span>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} style={{ height: "auto", padding: 12 }} placeholder="e.g. Please swap photo 3 for one without text on it." />
          </label>
        </div>
      )}
      <div className="action-bar glass-thick" style={{ flexWrap: "wrap" }}>
        {a.isLive && <button className="btn btn-sm btn-gray" onClick={() => confirm("Take this profile down?") && onAct(a, "unpublish")}>Take down</button>}
        <button className="btn btn-sm btn-gray" onClick={() => onAct(a, "reject", { note })}>Reject</button>
        <button className="btn btn-sm btn-tinted" onClick={() => onAct(a, "changes", { note })}>Ask for changes</button>
        <button className="btn btn-sm btn-primary" style={{ flex: 1 }} disabled={(a.age ?? 0) < 18} onClick={() => onAct(a, "approve", { tier })}>
          {a.isLive ? "Approve changes" : "Approve"}
        </button>
      </div>
      {play && (
        <div className="lightbox" onClick={(e) => e.target === e.currentTarget && setPlay(null)}>
          <video src={play} autoPlay playsInline controls loop />
          <button className="icon-btn close" onClick={() => setPlay(null)} aria-label="Close"><Close /></button>
        </div>
      )}
    </div>,
    document.body,
  );
}

function statusLabel(a: App) {
  if (a.status === "pending") return a.isLive ? "Edits waiting" : "Waiting";
  return { approved: "Live", changes: "Changes asked", rejected: "Rejected", unpublished: "Taken down", draft: "Draft" }[a.status] || a.status;
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
