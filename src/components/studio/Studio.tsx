"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper from "./Cropper";
import { ProfileBody } from "../Profile";
import { Check, Close, Lock, Play, Sparkle } from "../Icons";
import { decodeImage, inspectClip, renderCrop, upload, CLIP_MAX_SECONDS, type Decoded } from "@/lib/media";
import { track } from "@/lib/track";
import type { Creator } from "@/lib/types";

type Photo = { src: string; w: number; h: number };
type ClipT = { src: string; poster: string; w: number; h: number; duration: number };
type Draft = {
  name?: string; handle?: string; tagline?: string; bio?: string; dob?: string; location?: string; region?: string;
  height?: string; hair?: string; eyes?: string; tags: string[]; fansUrl?: string; free: boolean;
  socials: Record<string, string>; photos: Photo[]; clips: ClipT[];
};
type Attest = { adult?: boolean; owner?: boolean; everyone_adult?: boolean; non_explicit?: boolean; terms?: boolean };
type Me = {
  account: { id: string; email: string };
  profile: { slug?: string; status: string; tier: string; data: Partial<Draft>; attest?: Attest; note?: string; isLive: boolean; hasChanges: boolean };
};

const EMPTY: Draft = { tags: [], free: true, socials: {}, photos: [], clips: [] };
const MAX_PHOTOS = 8;
const MAX_CLIPS = 6;
const HAIR = ["Blonde", "Brunette", "Black", "Redhead", "Other"];
const EYES = ["Blue", "Brown", "Green", "Hazel", "Grey", "Other"];
const HEIGHTS = Array.from({ length: 17 }, (_, i) => { const t = 58 + i; return `${Math.floor(t / 12)}'${t % 12}`; });
const VIBES = ["girl next door", "fitness", "yoga", "petite", "curvy", "tall", "alt", "tattoos", "cosplay", "gamer", "beach", "country", "latina", "fashion", "outdoors", "foodie", "blonde", "brunette", "redhead"];
const SOCIALS: [string, string][] = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["x", "X"], ["snapchat", "Snapchat"], ["reddit", "Reddit"], ["threads", "Threads"], ["youtube", "YouTube"], ["telegram", "Telegram"]];
const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function ageOf(dob?: string) {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return undefined;
  const d = new Date(dob + "T12:00:00");
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

export default function Studio() {
  const [phase, setPhase] = useState<"loading" | "auth" | "editor">("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [d, setD] = useState<Draft>(EMPTY);
  const [attest, setAttest] = useState<Attest>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "submit">("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [preview, setPreview] = useState(false);

  const hydrate = useCallback((m: Me) => {
    setMe(m);
    setD({ ...EMPTY, ...m.profile.data, tags: m.profile.data.tags || [], socials: m.profile.data.socials || {}, photos: m.profile.data.photos || [], clips: m.profile.data.clips || [] });
    setAttest(m.profile.attest || {});
    setDirty(false);
    setPhase("editor");
  }, []);

  useEffect(() => {
    fetch("/api/creator/me", { cache: "no-store" })
      .then(async (r) => (r.ok ? hydrate(await r.json()) : setPhase("auth")))
      .catch(() => setPhase("auth"));
  }, [hydrate]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const save = async (submit: boolean, draft: Draft = d, background = false) => {
    if (!background) {
      setBusy(submit ? "submit" : "save");
      setMsg(null);
    }
    try {
      const r = await fetch("/api/creator/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: draft, attest, submit }) });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) {
        setPhase("auth");
        return false;
      }
      if (!r.ok) throw new Error(data.error || "Couldn't save. Try again.");
      // Background saves (after an upload) must not overwrite what the creator is typing.
      if (background) {
        setMe(data);
        return true;
      }
      hydrate(data);
      setMsg({ kind: "ok", text: submit ? "Submitted. We'll review your profile and it goes live once approved." : "Saved." });
      if (submit) track("creator_submit");
      return true;
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Couldn't save." });
      return false;
    } finally {
      if (!background) setBusy("");
    }
  };

  // Media changes save right away so an upload is never lost.
  const latestDraft = useRef(d);
  latestDraft.current = d;
  const saveMedia = (patch: Partial<Draft>) => {
    const next = { ...latestDraft.current, ...patch };
    latestDraft.current = next;
    setD(next);
    save(false, next, true);
  };

  if (phase === "loading") return <div className="wrap studio"><p className="c3" style={{ padding: "40px 0" }}>Loading…</p></div>;
  if (phase === "auth") return <Auth onIn={hydrate} />;

  const p = me!.profile;
  const age = ageOf(d.dob);
  const asCreator: Creator = {
    slug: p.slug || "preview", name: d.name || "Your name", handle: d.handle, tagline: d.tagline || "", bio: d.bio || "", age, location: d.location, region: d.region,
    height: d.height, hair: d.hair, eyes: d.eyes, tags: d.tags, fansUrl: d.fansUrl || "#", free: d.free, addedAt: "", updatedAt: "",
    socials: d.socials, photos: d.photos.length ? d.photos : [{ src: "/media/ui/vip-blur-1.svg", w: 1080, h: 1350 }], clips: d.clips,
  };

  return (
    <div className="wrap studio">
      <header className="page-head">
        <h1 className="t-large">Your profile</h1>
        <p className="lede">Signed in as {me!.account.email}. <button className="ct" onClick={async () => { await fetch("/api/creator/logout", { method: "POST" }); setPhase("auth"); }}>Log out</button></p>
      </header>

      <StatusCard p={p} />

      <section className="group">
        <div className="group-label">Photos · {d.photos.length}/{MAX_PHOTOS}</div>
        <p className="t-foot c2 studio-hint">The first photo is your cover. Every photo is cropped to 4:5 so your profile looks clean everywhere. Add at least 2.</p>
        <Photos photos={d.photos} onChange={(photos) => saveMedia({ photos })} />
      </section>

      <section className="group">
        <div className="group-label">Clips · {d.clips.length}/{MAX_CLIPS}</div>
        <p className="t-foot c2 studio-hint">Vertical (9:16) works best. MP4 or MOV, up to {CLIP_MAX_SECONDS} seconds and 50 MB each.</p>
        <Clips clips={d.clips} onChange={(clips) => saveMedia({ clips })} />
      </section>

      <section className="group">
        <div className="group-label">About you</div>
        <div className="form-card form-rows">
          <Row label="Name"><input value={d.name || ""} maxLength={40} onChange={(e) => set("name", e.target.value)} placeholder="The name fans know you by" /></Row>
          <Row label="Handle"><input value={d.handle || ""} maxLength={40} onChange={(e) => set("handle", e.target.value.replace(/^@/, ""))} placeholder="optional, without @" /></Row>
          <Row label="Birthday"><input type="date" value={d.dob || ""} max={new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)} onChange={(e) => set("dob", e.target.value)} /></Row>
          <Row label="City"><input value={d.location || ""} maxLength={60} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Miami, FL" /></Row>
          <Row label="State">
            <select value={d.region || ""} onChange={(e) => set("region", e.target.value)}>
              <option value="">Choose</option>
              {STATES.map((s) => <option key={s} value={slug(s)}>{s}</option>)}
              <option value="outside-us">Outside the US</option>
            </select>
          </Row>
          <Row label="Height">
            <select value={d.height || ""} onChange={(e) => set("height", e.target.value)}>
              <option value="">Choose</option>
              {HEIGHTS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </Row>
          <Row label="Hair">
            <select value={d.hair || ""} onChange={(e) => set("hair", e.target.value)}>
              <option value="">Choose</option>
              {HAIR.map((h) => <option key={h}>{h}</option>)}
            </select>
          </Row>
          <Row label="Eyes">
            <select value={d.eyes || ""} onChange={(e) => set("eyes", e.target.value)}>
              <option value="">Choose</option>
              {EYES.map((h) => <option key={h}>{h}</option>)}
            </select>
          </Row>
        </div>
        {age !== undefined && age < 18 && <p className="form-error">You need to be 18 or older to be listed.</p>}
        <label className="field">
          <span>Tagline · {(d.tagline || "").length}/90</span>
          <input className="input" value={d.tagline || ""} maxLength={90} onChange={(e) => set("tagline", e.target.value)} placeholder="One line that sums you up" />
        </label>
        <label className="field">
          <span>Bio · {(d.bio || "").length}/1000</span>
          <textarea className="input" rows={5} value={d.bio || ""} maxLength={1000} onChange={(e) => set("bio", e.target.value)} placeholder="Tell fans what you post and why they'll like you" style={{ height: "auto", padding: 14, lineHeight: 1.5 }} />
        </label>
        <div className="field">
          <span>Vibe · pick up to 6</span>
          <div className="filter-opts">
            {VIBES.map((v) => {
              const on = d.tags.includes(v);
              return (
                <button key={v} className="chip" aria-pressed={on} onClick={() => set("tags", on ? d.tags.filter((x) => x !== v) : d.tags.length < 6 ? [...d.tags, v] : d.tags)}>
                  {v.replace(/(^|\s)\w/g, (m) => m.toUpperCase())}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="group">
        <div className="group-label">Your page</div>
        <div className="form-card form-rows">
          <Row label="Page link"><input type="url" inputMode="url" value={d.fansUrl || ""} onChange={(e) => set("fansUrl", e.target.value.trim())} placeholder="https://onlyfans.com/yourname" /></Row>
          <div className="form-row toggle-row">
            <span>Free page</span>
            <button className="switch" role="switch" aria-checked={d.free} aria-label="Free page" onClick={() => set("free", !d.free)} />
          </div>
        </div>
        <p className="t-foot c2 studio-hint">Tip: use a tracking link from your page settings so you can see how many fans came from us.</p>
      </section>

      <section className="group">
        <div className="group-label">Socials</div>
        <div className="form-card form-rows">
          {SOCIALS.map(([k, l]) => (
            <Row key={k} label={l}>
              <input value={d.socials[k] || ""} maxLength={120} onChange={(e) => set("socials", { ...d.socials, [k]: e.target.value.replace(/^@/, "") })} placeholder="username" autoCapitalize="none" autoCorrect="off" />
            </Row>
          ))}
        </div>
      </section>

      <section className="group">
        <div className="group-label">Before you submit</div>
        <div className="cell" style={{ borderRadius: 14, padding: "4px 16px 14px" }}>
          {([
            ["adult", "I'm 18 or older."],
            ["everyone_adult", "Everyone in my photos and clips is 18 or older and agreed to be shown."],
            ["owner", "I own these photos and clips, or have the rights to post them, and these accounts are mine."],
            ["non_explicit", "My photos and clips aren't explicit (teasers only, nothing that would break the site rules)."],
            ["terms", "I agree to the Creator Terms."],
          ] as [keyof Attest, string][]).map(([k, label]) => (
            <label key={k} className="check" style={{ fontSize: "0.875rem", color: "var(--label)" }}>
              <input type="checkbox" checked={!!attest[k]} onChange={(e) => { setAttest({ ...attest, [k]: e.target.checked }); setDirty(true); }} />
              <span>
                {k === "terms" ? <>I agree to the <a href="/creator-terms" target="_blank" rel="noopener" className="ct">Creator Terms</a>.</> : label}
              </span>
            </label>
          ))}
        </div>
      </section>

      <DeleteAccount onDeleted={() => setPhase("auth")} />

      {msg && <p className={msg.kind === "err" ? "form-error" : "studio-ok"} role="status">{msg.text}</p>}
      <div style={{ height: 110 }} />

      <div className="action-bar glass-thick">
        <button className="btn btn-gray btn-sm" onClick={() => setPreview(true)}>Preview</button>
        <button className="btn btn-gray btn-sm" disabled={!!busy} onClick={() => save(false)}>{busy === "save" ? "Saving…" : dirty ? "Save" : "Saved"}</button>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={!!busy || p.status === "pending" && !dirty} onClick={() => save(true)}>
          {busy === "submit" ? "Submitting…" : p.status === "pending" && !dirty ? "In review" : p.isLive ? "Submit changes" : "Submit for review"}
        </button>
      </div>

      {preview && createPortal(
        <div className="preview-layer">
          <div className="preview-bar glass-thick">
            <b>Preview</b>
            <button className="icon-btn gray" onClick={() => setPreview(false)} aria-label="Close preview"><Close /></button>
          </div>
          <ProfileBody c={asCreator} related={[]} preview />
        </div>,
        document.body,
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-row">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusCard({ p }: { p: Me["profile"] }) {
  const map: Record<string, [string, string, "tint" | "ok" | "warn" | "plain"]> = {
    draft: ["Draft", "Finish your profile and submit it. Nothing is public until we approve it.", "plain"],
    pending: ["In review", p.isLive ? "Your current profile stays live while we review your changes." : "We review every profile by hand, usually within a day.", "tint"],
    approved: ["Live", p.hasChanges ? "You have edits that aren't live yet. Submit them for review." : p.tier === "hidden" ? "You're live in the members-only section." : "Your profile is live.", "ok"],
    changes: ["Changes requested", p.note || "Make a few changes and submit again.", "warn"],
    rejected: ["Not approved", p.note || "Your profile wasn't approved.", "warn"],
    unpublished: ["Taken down", "Your profile was taken down. Contact us if you think that's a mistake.", "warn"],
  };
  const [title, body, tone] = map[p.status] || map.draft;
  return (
    <div className={`status-card ${tone}`}>
      <span className="status-ico">{tone === "ok" ? <Check /> : tone === "tint" ? <Sparkle /> : <Lock />}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{title}</b>
        <p>{body}</p>
        {p.status === "approved" && p.slug && p.tier === "public" && <Link href={`/${p.slug}`} className="ct t-foot">View your profile</Link>}
      </div>
    </div>
  );
}

type Job = { id: string; label: string; pct: number };

function Photos({ photos, onChange }: { photos: Photo[]; onChange: (p: Photo[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const queue = useRef<File[]>([]);
  const [img, setImg] = useState<Decoded | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [err, setErr] = useState("");
  const latest = useRef(photos);
  latest.current = photos;

  const next = async () => {
    const f = queue.current.shift();
    if (!f) return;
    try {
      setErr("");
      setImg(await decodeImage(f));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't open that image.");
      next();
    }
  };

  const onPick = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - latest.current.length;
    queue.current = [...files].slice(0, room);
    if (files.length > room) setErr(`You can add ${room} more photo${room === 1 ? "" : "s"}.`);
    next();
  };

  const onCrop = async (crop: { sx: number; sy: number; sw: number; sh: number }) => {
    const source = img!;
    setImg(null);
    const id = Math.random().toString(36).slice(2);
    setJob({ id, label: "Uploading photo", pct: 0 });
    try {
      const blob = await renderCrop(source, crop);
      source.close();
      const src = await upload(blob, "photo", (pct) => setJob({ id, label: "Uploading photo", pct }));
      onChange([...latest.current, { src, w: 1080, h: 1350 }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setJob(null);
      next();
    }
  };

  return (
    <>
      <div className="media-grid">
        {photos.map((ph, i) => (
          <div key={ph.src} className="media-tile photo">
            <img src={ph.src} alt={`Photo ${i + 1}`} loading="lazy" />
            {i === 0 ? <span className="media-flag">Cover</span> : (
              <button className="media-flag as-btn" onClick={() => onChange([ph, ...photos.filter((x) => x !== ph)])}>Make cover</button>
            )}
            <button className="media-x" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(photos.filter((x) => x !== ph))}><Close /></button>
          </div>
        ))}
        {job && <Progress job={job} shape="photo" />}
        {photos.length < MAX_PHOTOS && !job && (
          <button className="media-tile photo add" onClick={() => input.current?.click()}>
            <span className="plus">+</span>
            <span className="t-foot">Add photos</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />
      {err && <p className="form-error">{err}</p>}
      {img && <Cropper img={img} onCancel={() => { img.close(); setImg(null); next(); }} onDone={onCrop} />}
    </>
  );
}

function Clips({ clips, onChange }: { clips: ClipT[]; onChange: (c: ClipT[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [err, setErr] = useState("");
  const [play, setPlay] = useState<ClipT | null>(null);

  const onPick = async (file?: File) => {
    if (!file) return;
    setErr("");
    const id = Math.random().toString(36).slice(2);
    setJob({ id, label: "Checking video", pct: 0 });
    try {
      const info = await inspectClip(file);
      setJob({ id, label: "Uploading", pct: 0 });
      const poster = await upload(info.poster, "poster");
      const src = await upload(file, "clip", (pct) => setJob({ id, label: "Uploading", pct }));
      onChange([...clips, { src, poster, w: info.width, h: info.height, duration: Math.round(info.duration * 10) / 10 }]);
      if (!info.vertical) setErr("Heads up: this clip is horizontal, so the sides get cropped in the feed. Vertical clips look best.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setJob(null);
    }
  };

  return (
    <>
      <div className="media-grid clips">
        {clips.map((c, i) => (
          <div key={c.src} className="media-tile clip">
            <button className="media-play" onClick={() => setPlay(c)} aria-label={`Play clip ${i + 1}`}>
              <img src={c.poster} alt="" loading="lazy" />
              <span className="play-pill"><Play /> {Math.round(c.duration)}s</span>
            </button>
            <button className="media-x" aria-label={`Remove clip ${i + 1}`} onClick={() => onChange(clips.filter((x) => x !== c))}><Close /></button>
          </div>
        ))}
        {job && <Progress job={job} shape="clip" />}
        {clips.length < MAX_CLIPS && !job && (
          <button className="media-tile clip add" onClick={() => input.current?.click()}>
            <span className="plus">+</span>
            <span className="t-foot">Add a clip</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }} />
      {err && <p className="form-error">{err}</p>}
      {play && createPortal(
        <div className="lightbox" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setPlay(null)}>
          <video src={play.src} poster={play.poster} autoPlay playsInline controls loop />
          <button className="icon-btn close" onClick={() => setPlay(null)} aria-label="Close"><Close /></button>
        </div>,
        document.body,
      )}
    </>
  );
}

function Progress({ job, shape }: { job: Job; shape: "photo" | "clip" }) {
  return (
    <div className={`media-tile ${shape} busy`} aria-live="polite">
      <div className="ring" style={{ ["--p" as string]: `${job.pct}%` }} />
      <span className="t-foot">{job.label}{job.pct ? ` ${job.pct}%` : "…"}</span>
    </div>
  );
}

function Auth({ onIn }: { onIn: (m: Me) => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/creator/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: pw }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Something went wrong.");
      track(mode === "signup" ? "creator_signup" : "creator_login");
      onIn(data);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="wrap studio" style={{ display: "grid", placeItems: "center", minHeight: "72dvh" }}>
      <form onSubmit={submit} className="panel cell" style={{ width: "100%", maxWidth: 400, padding: "26px 20px 20px" }}>
        <div className="unlock-hero">
          <div className="ico"><Sparkle /></div>
          <h1 className="t-title1">{mode === "signup" ? "Get listed" : "Welcome back"}</h1>
          <p>{mode === "signup" ? "Create your profile, add your photos and clips, and send it to us for review. It's free." : "Log in to edit your profile."}</p>
        </div>
        <div className="seg" style={{ display: "flex", marginTop: 18 }} role="group">
          <button type="button" aria-pressed={mode === "signup"} style={{ flex: 1, ...(mode === "signup" ? { background: "var(--cell-2)", boxShadow: "0 3px 8px rgba(0,0,0,.12)" } : {}) }} onClick={() => setMode("signup")}>Create account</button>
          <button type="button" aria-pressed={mode === "login"} style={{ flex: 1, ...(mode === "login" ? { background: "var(--cell-2)", boxShadow: "0 3px 8px rgba(0,0,0,.12)" } : {}) }} onClick={() => setMode("login")}>Log in</button>
        </div>
        <div className="form-card">
          <label>
            <span>Email</span>
            <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={mode === "signup" ? "8+ characters" : ""} />
          </label>
        </div>
        {err && <p className="form-error">{err}</p>}
        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={busy}>{busy ? "One sec…" : mode === "signup" ? "Create account" : "Log in"}</button>
        <p className="t-cap c3" style={{ marginTop: 12, textAlign: "center" }}>Creators must be 18+. Forgot your password? Email us and we&apos;ll reset it.</p>
      </form>
    </div>
  );
}

// Wipes the account, the profile and every uploaded file. Asks for the password so a borrowed phone can't do it.
function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async () => {
    setBusy(true);
    setError("");
    const r = await fetch("/api/creator/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const data = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!r.ok || !data.ok) return setError(data.error || "That didn't work. Try again.");
    onDeleted();
  };
  return (
    <section className="danger-zone">
      <h3>Delete account</h3>
      <p className="t-foot c2" style={{ marginTop: 4 }}>
        Removes your profile from the site within minutes and permanently deletes your account, photos and clips. This can&apos;t be undone.
      </p>
      {!open ? (
        <button className="btn btn-sm btn-gray" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>Delete my account</button>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <input className="input" type="password" autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-sm btn-gray" onClick={() => { setOpen(false); setPassword(""); setError(""); }}>Cancel</button>
            <button className="btn btn-sm btn-danger" style={{ flex: 1 }} disabled={busy || !password} onClick={go}>{busy ? "Deleting…" : "Delete everything"}</button>
          </div>
        </div>
      )}
    </section>
  );
}
