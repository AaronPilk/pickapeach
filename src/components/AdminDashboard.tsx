"use client";

import { useCallback, useEffect, useState } from "react";
import Approvals from "./Approvals";
import Requests from "./Requests";
import Account from "./Account";
import Traffic, { type TrafficData } from "./admin/Traffic";
import Heatmaps from "./admin/Heatmaps";
import { Bars, ChannelTag, Empty, Glass, Seg, Stat, Trend } from "./admin/parts";
import { CHANNELS, EVENTS, fmt, fmtPct, greeting, pct } from "./admin/meta";
import {
  IBell, ICheck, IDownload, IEye, IFlag, IFlame, IHome, IInbox, IPulse, IRefresh, IShield, IStar, ITap, ITraffic, IUnlock, IUser, IUsers,
} from "./admin/icons";

type Row = Record<string, string | number | boolean | null>;
type Stats = { creators: Row[]; countries: Row[]; devices: Row[]; totals: Record<string, number | null> };
type Tab = "overview" | "traffic" | "heatmaps" | "creators" | "leads" | "approvals" | "requests" | "live" | "account";

const MAIN: [Tab, string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement][] = [
  ["overview", "Overview", IHome],
  ["traffic", "Traffic", ITraffic],
  ["heatmaps", "Heatmaps", IFlame],
  ["creators", "Creators", IStar],
  ["leads", "Leads", IInbox],
];
const MORE: [Tab, string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement][] = [
  ["approvals", "Approvals", ICheck],
  ["requests", "Requests", IFlag],
  ["live", "Live feed", IPulse],
  ["account", "Account", IUser],
];
const RANGES: [number, string][] = [[1, "Today"], [7, "7 days"], [30, "30 days"], [90, "90 days"]];

export default function AdminDashboard() {
  const [auth, setAuth] = useState<"checking" | "out" | "in">("checking");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState<Tab>("overview");
  const [channel, setChannel] = useState("all");
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Row[]>([]);
  const [leads, setLeads] = useState<Row[]>([]);
  const [me, setMe] = useState<{ name?: string; email?: string } | null>(null);
  const [badges, setBadges] = useState({ approvals: 0, requests: 0, urgent: 0 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const [t, s, r, l, m, c, q] = await Promise.all([
        fetch(`/api/admin/traffic?days=${d}`, { cache: "no-store" }),
        fetch(`/api/admin/stats?days=${d}`, { cache: "no-store" }),
        fetch(`/api/admin/recent`, { cache: "no-store" }),
        fetch(`/api/admin/leads`, { cache: "no-store" }),
        fetch(`/api/admin/me`, { cache: "no-store" }),
        fetch(`/api/admin/creators`, { cache: "no-store" }),
        fetch(`/api/admin/requests`, { cache: "no-store" }),
      ]);
      if (t.status === 401) {
        setAuth("out");
        return;
      }
      setTraffic(await t.json());
      setStats(s.ok ? await s.json() : null);
      setRecent(r.ok ? await r.json() : []);
      setLeads(l.ok ? await l.json() : []);
      setMe(m.ok ? await m.json() : null);
      const apps = c.ok ? ((await c.json()) as Row[]) : [];
      const reqs = q.ok ? ((await q.json()) as Row[]) : [];
      setBadges({
        approvals: apps.filter((a) => a.status === "pending").length,
        requests: reqs.filter((x) => x.status === "open").length,
        urgent: reqs.filter((x) => x.status === "open" && (x.kind === "ncii" || x.kind === "underage")).length,
      });
      setAuth("in");
    } catch {
      setAuth("out");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  useEffect(() => {
    if (auth !== "in" || tab !== "live") return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/admin/recent`, { cache: "no-store" });
      if (r.ok) setRecent(await r.json());
    }, 5000);
    return () => clearInterval(t);
  }, [auth, tab]);

  const go = (t: Tab, ch?: string) => {
    if (ch) setChannel(ch);
    setTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (auth === "checking") {
    return (
      <div className="dash dash-login">
        <Scene />
        <p className="g-loading" role="status"><span />Loading dashboard…</p>
      </div>
    );
  }

  if (auth !== "in") {
    return (
      <div className="dash dash-login">
        <Scene />
        <form
          className="g-card g-login"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr("");
            setBusy(true);
            const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: pw }) });
            setBusy(false);
            if (r.ok) {
              setPw("");
              load(days);
            } else setErr((await r.json().catch(() => ({}))).error || "Wrong email or password.");
          }}
        >
          <div className="g-brand"><PeachMark /> pick a <b>peach</b></div>
          <h1>Owner sign in</h1>
          <p className="g-sub">Traffic, creators, approvals and leads.</p>
          <label className="g-field">
            <span>Email</span>
            <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="username" />
          </label>
          <label className="g-field">
            <span>Password</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          </label>
          {err && <p className="form-error">{err}</p>}
          <button className="g-btn primary block" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  const T: Record<string, number> = traffic?.totals || {};
  const P: Record<string, number> = traffic?.previous || {};
  const sessions = T.sessions || 0;
  const initials = (me?.name || me?.email || "?").slice(0, 1).toUpperCase();
  const vs = days === 1 ? "vs yesterday" : `vs the ${days} days before`;
  const badgeFor = (t: Tab) => (t === "approvals" ? badges.approvals : t === "requests" ? badges.requests : 0);

  return (
    <div className="dash">
      <Scene />

      <header className="dash-top">
        <button className="g-icon" onClick={() => go("overview")} aria-label="Overview"><PeachMark /></button>
        <nav className="dash-pills" aria-label="Sections">
          {[...MAIN, ...MORE].map(([k, l, I]) => (
            <button key={k} className={`g-pill ${MORE.some((m) => m[0] === k) ? "only-narrow" : ""}`} aria-current={tab === k ? "page" : undefined} onClick={() => go(k)}>
              <I /> {l}
              {badgeFor(k) > 0 && <em>{badgeFor(k)}</em>}
            </button>
          ))}
        </nav>
        <div className="dash-top-r">
          <button className="g-icon" onClick={() => load(days)} aria-label="Refresh" data-spin={loading}><IRefresh /></button>
          <button className="g-icon" onClick={() => go("requests")} aria-label={`Requests${badges.requests ? `, ${badges.requests} open` : ""}`}>
            <IBell />
            {badges.urgent + badges.requests > 0 && <em className={badges.urgent ? "hot" : ""}>{badges.requests}</em>}
          </button>
          <button className="g-avatar" onClick={() => go("account")} aria-label="Account">{initials}<i /></button>
        </div>
      </header>

      <aside className="dash-rail" aria-label="More">
        {[...MAIN, ...MORE].map(([k, l, I]) => (
          <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => go(k)} aria-label={l}>
            <I />
            {badgeFor(k) > 0 && <em>{badgeFor(k)}</em>}
            <span className="g-rail-tip">{l}</span>
          </button>
        ))}
      </aside>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>{tab === "overview" ? greeting(me?.name) : [...MAIN, ...MORE].find((m) => m[0] === tab)?.[1]}</h1>
            <p>
              {tab === "overview" && "Here's how Pick a Peach is doing. Bots are already filtered out."}
              {tab === "traffic" && "Every visitor, labeled by where they came from."}
              {tab === "heatmaps" && "Where people tap on each page, what they tap most, and how far down they get."}
              {tab === "creators" && "Which creators get looked at and clicked."}
              {tab === "leads" && "People who unlocked the hidden girls."}
              {tab === "approvals" && "Creator profiles waiting for a yes or no."}
              {tab === "requests" && "Privacy requests and content reports."}
              {tab === "live" && "What's happening right now. Refreshes every 5 seconds."}
              {tab === "account" && "Your login and your team."}
            </p>
          </div>
          {["overview", "traffic", "heatmaps", "creators"].includes(tab) && (
            <div className="dash-head-r">
              <Seg label="Date range" value={days} options={RANGES} onChange={setDays} />
            </div>
          )}
          {tab === "leads" && <a className="g-btn" href="/api/admin/leads.csv"><IDownload /> Export CSV</a>}
        </div>

        {tab === "overview" && traffic && (
          <div className="g-stack" key={`o${days}`}>
            {badges.urgent > 0 && (
              <button className="g-alert" onClick={() => go("requests")}>
                <IFlag /> {badges.urgent} urgent report{badges.urgent > 1 ? "s" : ""} waiting. Must be handled within 48 hours. Open Requests →
              </button>
            )}
            <div className="g-stats">
              <Stat vs={vs} label="Real visitors" value={T.visitors || 0} prev={P.visitors} icon={<IUsers />} tint="linear-gradient(135deg,#ffb199,#ff7a5c)" help="Different people, bots removed." />
              <Stat vs={vs} label="Engaged visits" value={pct(T.engaged || 0, sessions)} suffix="%" prev={pct(P.engaged || 0, P.sessions || 0)} icon={<IEye />} tint="linear-gradient(135deg,#93c5fd,#3b6cf6)" help="Share of visits where the person tapped, scrolled or typed. The best sign your traffic is real." />
              <Stat vs={vs} label="Follow clicks" value={T.clicks || 0} prev={P.clicks} icon={<ITap />} tint="linear-gradient(135deg,#fda4af,#e11d48)" help="Taps that sent someone to a creator's page." />
              <Stat vs={vs} label="Click rate" value={pct(T.clicking_sessions || 0, sessions)} suffix="%" prev={pct(P.clicking_sessions || 0, P.sessions || 0)} icon={<ITraffic />} tint="linear-gradient(135deg,#fcd34d,#f59e0b)" help="Share of visits that tapped Follow at least once." />
              <Stat vs={vs} label="Unlocks" value={T.leads || 0} prev={P.leads} icon={<IUnlock />} tint="linear-gradient(135deg,#c4b5fd,#7c3aed)" help="Emails and numbers collected from the unlock screen." />
              <Stat vs={vs} label="Bots blocked" value={T.bots || 0} prev={P.bots} invert icon={<IShield />} tint="linear-gradient(135deg,#86efac,#16a34a)" help="Fake visits, plus your own team's visits, kept out of every number here." />
            </div>

            <Glass title="Visitors, follow clicks and unlocks" note="Per day. Hover or tap the chart for exact numbers.">
              <Trend data={traffic.daily} />
            </Glass>

            <div className="g-grid-2">
              <Glass title="Where visitors come from" note="Tap a bucket to see every source inside it." action={<button className="g-link" onClick={() => go("traffic")}>All sources →</button>}>
                <Bars
                  rows={traffic.channels as unknown as Record<string, unknown>[]}
                  value="visitors"
                  label={(r) => CHANNELS[String(r.channel)]?.name || String(r.channel)}
                  sub={(r) => `${fmt(Number(r.clicks))} follow clicks · ${fmt(Number(r.leads))} unlocks`}
                  onPick={(r) => go("traffic", String(r.channel))}
                />
              </Glass>
              <Glass title="Top sources" note="Ranked by visitors." action={<button className="g-link" onClick={() => go("traffic")}>Details →</button>}>
                {traffic.sources.length ? (
                  <div className="g-list">
                    {traffic.sources.slice(0, 7).map((s) => (
                      <div key={s.channel + s.label} className="g-list-row">
                        <div><b>{s.label}</b><ChannelTag channel={s.channel} /></div>
                        <div className="g-list-n">
                          <span>{fmt(s.visitors)}<small>visitors</small></span>
                          <span>{fmtPct(s.clicking_sessions, s.sessions)}<small>click rate</small></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty />
                )}
              </Glass>
            </div>

            <div className="g-grid-3">
              <Glass title="Top creators" note="By follow clicks." action={<button className="g-link" onClick={() => go("creators")}>All →</button>}>
                <Bars rows={(stats?.creators || []).slice(0, 6) as Record<string, unknown>[]} value="clicks" label={(r) => String(r.creator)} sub={(r) => `${fmt(Number(r.profile_views))} profile views`} />
              </Glass>
              <Glass title="Countries">
                <Bars rows={(stats?.countries || []).slice(0, 6) as Record<string, unknown>[]} value="sessions" label={(r) => countryName(String(r.country))} />
              </Glass>
              <Glass title="Devices">
                <Bars rows={(stats?.devices || []) as Record<string, unknown>[]} value="sessions" label={(r) => cap(String(r.device))} />
              </Glass>
            </div>
          </div>
        )}

        {tab === "traffic" && traffic && <Traffic data={traffic} initialChannel={channel} key={`t${days}`} />}
        {tab === "heatmaps" && <Heatmaps days={days} />}

        {tab === "creators" && (
          <Glass title="Creators" note="Card views = her card was on screen for a moment. Follow clicks = taps through to her page.">
            {stats?.creators?.length ? (
              <div className="g-table-wrap">
                <table className="g-table">
                  <thead><tr><th>Creator</th><th>Card views</th><th>Profile views</th><th>Clip views</th><th>Social taps</th><th>Follow clicks</th><th>View → click</th></tr></thead>
                  <tbody>
                    {stats.creators.map((c) => (
                      <tr key={String(c.creator)}>
                        <td><b>{String(c.creator)}</b></td>
                        <td data-l="Card views">{fmt(Number(c.impressions))}</td>
                        <td data-l="Profile views">{fmt(Number(c.profile_views))}</td>
                        <td data-l="Clip views">{fmt(Number(c.clip_views))}</td>
                        <td data-l="Social taps">{fmt(Number(c.social_clicks))}</td>
                        <td data-l="Follow clicks">{fmt(Number(c.clicks))}</td>
                        <td data-l="View → click">{fmtPct(Number(c.clicks), Number(c.profile_views))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
          </Glass>
        )}

        {tab === "leads" && (
          <Glass
            title={`${fmt(leads.length)}${leads.length === 200 ? "+" : ""} unlocks`}
            note="Export only includes people who agreed to messages and haven't opted out, so it's safe to import into your texting tool. Download a fresh copy before every send."
          >
            {leads.length ? (
              <div className="g-table-wrap">
                <table className="g-table">
                  <thead><tr><th>When</th><th>Email</th><th>Phone</th><th>Came from</th><th>Messages</th><th>Unlocked on</th><th>Where</th></tr></thead>
                  <tbody>
                    {leads.map((l, i) => (
                      <tr key={i}>
                        <td><b>{when(String(l.created_at))}</b></td>
                        <td data-l="Email">{String(l.email ?? "erased")}</td>
                        <td data-l="Phone">{String(l.phone ?? "—")}</td>
                        <td data-l="Came from">{String(l.source_label || l.source || "Direct / unknown")}</td>
                        <td data-l="Messages">
                          <span className={`g-status ${l.erased_at ? "" : l.do_not_contact ? "bad" : l.consent ? "good" : ""}`}>
                            {l.erased_at ? "erased" : l.do_not_contact ? "opted out" : l.consent ? "ok to message" : "no consent"}
                          </span>
                        </td>
                        <td data-l="Unlocked on">{String(l.creator || l.page || "—")}</td>
                        <td data-l="Where">{[l.city, l.country].filter(Boolean).join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No unlocks yet.</Empty>
            )}
          </Glass>
        )}

        {tab === "approvals" && <div className="g-card g-pad"><Approvals /></div>}
        {tab === "requests" && <div className="g-card g-pad"><Requests /></div>}
        {tab === "account" && <div className="g-card g-pad"><Account onSignOut={() => { setAuth("out"); setTab("overview"); }} /></div>}

        {tab === "live" && (
          <Glass title="Live feed" note="Latest actions from real people. Bot visits are shown faded.">
            {recent.length ? (
              <div className="g-feed">
                {recent.map((e, i) => (
                  <div key={i} className={`g-feed-row ${e.is_bot ? "bot" : ""}`}>
                    <span className="g-feed-t">{when(String(e.ts))}</span>
                    <span className="g-feed-a">
                      <b>{EVENTS[String(e.type)] || String(e.type)}</b>
                      {e.creator ? <> · {String(e.creator)}</> : null}
                      <small>{String(e.path || "")}</small>
                    </span>
                    <span className="g-feed-s">
                      {e.is_bot ? <span className="g-status bad">bot</span> : <ChannelTag channel={String(e.channel || "direct")} />}
                      <small>{String(e.source_label || "")}{e.city ? ` · ${e.city}` : ""}{e.country ? `, ${e.country}` : ""}</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </Glass>
        )}
      </main>
    </div>
  );
}

// Dusk scene behind the glass: warm horizon, layered ridges, low sun. Pure CSS/SVG, no photos.
function Scene() {
  return (
    <div className="dash-scene" aria-hidden>
      <div className="dash-sun" />
      <svg className="dash-ridges" viewBox="0 0 1440 400" preserveAspectRatio="none">
        <path d="M0 260 C 140 210, 260 230, 380 200 S 620 150, 760 190 S 1020 240, 1160 200 S 1360 170, 1440 190 V400 H0Z" fill="rgba(46,32,74,0.55)" />
        <path d="M0 300 C 160 270, 300 290, 460 260 S 760 230, 900 270 S 1180 310, 1300 280 S 1400 270, 1440 280 V400 H0Z" fill="rgba(24,20,52,0.75)" />
        <path d="M0 340 C 200 320, 380 345, 560 325 S 900 300, 1080 330 S 1340 345, 1440 335 V400 H0Z" fill="rgba(10,12,32,0.92)" />
      </svg>
    </div>
  );
}

function PeachMark() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden>
      <defs>
        <radialGradient id="pk" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffd2bf" />
          <stop offset="60%" stopColor="#ff8a6b" />
          <stop offset="100%" stopColor="#e2504a" />
        </radialGradient>
      </defs>
      <path d="M16 29c-6.6 0-11-4.6-11-10.6C5 12.3 9.4 8 14.6 8c.6 0 1 .1 1.4.2.4-.1.8-.2 1.4-.2C22.6 8 27 12.3 27 18.4 27 24.4 22.6 29 16 29z" fill="url(#pk)" />
      <path d="M16 8.5c-.4-2.6.6-4.8 3.2-6 .9 2.6-.2 5-3.2 6z" fill="#4ade80" />
    </svg>
  );
}

function when(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function countryName(code: string) {
  if (!code || code === "??") return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}
