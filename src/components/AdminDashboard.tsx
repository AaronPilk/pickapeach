"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Logo } from "./Chrome";
import Approvals from "./Approvals";
import Requests from "./Requests";
import Account from "./Account";

type Row = Record<string, string | number | null>;
type Stats = {
  since: string;
  totals: Record<string, number | null>;
  daily: { day: string; visitors: number; sessions: number; clicks: number; leads: number }[];
  sources: Row[];
  campaigns: Row[];
  creators: Row[];
  countries: Row[];
  devices: Row[];
  landing: Row[];
  event_types: Row[];
};

const RANGES = [1, 7, 30, 90];

export default function AdminDashboard() {
  const [auth, setAuth] = useState<"checking" | "out" | "in">("checking");
  const [pw, setPw] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Row[]>([]);
  const [leads, setLeads] = useState<Row[]>([]);
  const [tab, setTab] = useState<"overview" | "creators" | "approvals" | "requests" | "leads" | "live" | "account">("overview");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const [s, r, l] = await Promise.all([
        fetch(`/api/admin/stats?days=${d}`, { cache: "no-store" }),
        fetch(`/api/admin/recent`, { cache: "no-store" }),
        fetch(`/api/admin/leads`, { cache: "no-store" }),
      ]);
      if (s.status === 401) {
        setAuth("out");
        return;
      }
      setStats(await s.json());
      setRecent(r.ok ? await r.json() : []);
      setLeads(l.ok ? await l.json() : []);
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

  if (auth !== "in") {
    return (
      <div className="wrap" style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <form
          className="panel glass-thick"
          style={{ width: "100%", maxWidth: 380 }}
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
          <Logo />
          <h2 style={{ marginTop: 18 }}>Owner sign in</h2>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="username" />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          </label>
          {err && <p className="form-error">{err}</p>}
          <button className="btn btn-coral btn-block" style={{ marginTop: 14 }} disabled={auth === "checking" || busy}>
            {auth === "checking" ? "Checking…" : busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  const t = stats?.totals || {};
  const visitors = Number(t.visitors || 0);
  const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

  return (
    <div className="wrap" style={{ paddingTop: 18, paddingBottom: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Logo />
        <span className="faint" style={{ fontSize: "0.85rem" }}>Traffic dashboard</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <div className="seg pane">
            {RANGES.map((d) => (
              <button key={d} aria-pressed={days === d} onClick={() => setDays(d)} style={days === d ? { background: "var(--label)", color: "var(--bg)" } : undefined}>
                {d === 1 ? "Today" : `${d}d`}
              </button>
            ))}
          </div>
          <button className="btn btn-sm btn-glass" onClick={() => load(days)}>{loading ? "…" : "Refresh"}</button>
        </div>
      </div>

      <div className="chips" style={{ marginTop: 6 }}>
        {(["overview", "creators", "approvals", "requests", "leads", "live", "account"] as const).map((x) => (
          <button key={x} className="chip" aria-pressed={tab === x} onClick={() => setTab(x)}>
            {x === "live" ? "Live feed" : x === "creators" ? "Creator stats" : x === "approvals" ? "Approvals" : x === "requests" ? "Requests" : x === "account" ? "Account" : x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && stats && (
        <>
          <div className="kpis">
            <Kpi label="Visitors" value={visitors} />
            <Kpi label="Sessions" value={t.sessions} />
            <Kpi label="Page views" value={t.pageviews} />
            <Kpi label="Profile views" value={t.profile_views} />
            <Kpi label="Fans-page clicks" value={t.clicks} sub={`${pct(Number(t.clicking_sessions || 0), Number(t.sessions || 0))} of sessions click`} accent />
            <Kpi label="Leads (VIP)" value={t.leads} sub={`${pct(Number(t.leads || 0), visitors)} of visitors`} accent />
            <Kpi label="Clip views" value={t.clip_views} />
            <Kpi label="Avg engaged time" value={t.avg_engaged_s != null ? `${t.avg_engaged_s}s` : "—"} />
          </div>

          <Card title="Visitors per day" note="Hover a bar for clicks and leads">
            <DailyBars data={stats.daily} />
          </Card>

          <Card title="Traffic sources" note="Where visitors came from (last touch). Tag ad links with utm_source / utm_campaign.">
            <Table
              rows={stats.sources}
              cols={[
                ["source", "Source"],
                ["visitors", "Visitors"],
                ["sessions", "Sessions"],
                ["pageviews", "Views"],
                ["clicks", "Clicks"],
                ["leads", "Leads"],
              ]}
              extra={[["CTR", (r) => pct(Number(r.clicks), Number(r.sessions))], ["Lead %", (r) => pct(Number(r.leads), Number(r.visitors))]]}
            />
          </Card>

          {stats.campaigns.length > 0 && (
            <Card title="Campaigns">
              <Table rows={stats.campaigns} cols={[["source", "Source"], ["campaign", "Campaign"], ["sessions", "Sessions"], ["clicks", "Clicks"]]} extra={[["CTR", (r) => pct(Number(r.clicks), Number(r.sessions))]]} />
            </Card>
          )}

          <div className="two-col">
            <Card title="Countries"><BarList rows={stats.countries} k="country" v="sessions" /></Card>
            <Card title="Devices"><BarList rows={stats.devices} k="device" v="sessions" /></Card>
          </div>
          <div className="two-col">
            <Card title="Landing pages"><BarList rows={stats.landing} k="path" v="sessions" /></Card>
            <Card title="Every tracked action"><BarList rows={stats.event_types} k="type" v="count" /></Card>
          </div>
          <p className="faint" style={{ fontSize: "0.8rem", marginTop: 10 }}>{t.bots_filtered || 0} bot sessions filtered out of these numbers.</p>
        </>
      )}

      {tab === "creators" && stats && (
        <Card title="Creators" note="Impressions = card at least half on screen for 0.8s. Clicks = taps through to her fans page.">
          <Table
            rows={stats.creators}
            cols={[["creator", "Creator"], ["impressions", "Impressions"], ["profile_views", "Profile views"], ["clip_views", "Clip views"], ["social_clicks", "Social taps"], ["clicks", "Fans clicks"]]}
            extra={[["View→click", (r) => pct(Number(r.clicks), Number(r.profile_views))]]}
          />
        </Card>
      )}

      {tab === "leads" && (
        <Card title={`Leads (${leads.length}${leads.length === 200 ? "+" : ""})`} action={<a className="btn btn-sm btn-coral" href="/api/admin/leads.csv">Download CSV</a>}>
          <p className="t-foot c2" style={{ margin: "0 0 10px" }}>
            The CSV only includes people who agreed to messages and haven&apos;t opted out, so it&apos;s safe to import into your texting tool. Re-download before every send.
          </p>
          <Table
            rows={leads.map((l) => ({ ...l, status: l.erased_at ? "erased" : l.do_not_contact ? "opted out" : l.consent ? "ok to message" : "no consent" }))}
            cols={[["created_at", "When"], ["status", "Messages"], ["kind", "Type"], ["email", "Email"], ["phone", "Phone"], ["source", "Source"], ["campaign", "Campaign"], ["origin", "Unlocked from"], ["creator", "Creator"], ["country", "Country"], ["city", "City"], ["device", "Device"]]}
          />
        </Card>
      )}

      {tab === "approvals" && <Approvals />}

      {tab === "requests" && <Requests />}

      {tab === "account" && <Account onSignOut={() => { setAuth("out"); setTab("overview"); }} />}

      {tab === "live" && (
        <Card title="Live feed" note="Latest 80 actions, refreshes every 5 seconds.">
          <Table rows={recent} cols={[["ts", "When"], ["type", "Action"], ["creator", "Creator"], ["path", "Page"], ["source", "Source"], ["campaign", "Campaign"], ["country", "Country"], ["city", "City"], ["device", "Device"]]} />
        </Card>
      )}

      <style>{`
        .kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 6px 0 14px; }
        @media (min-width: 900px) { .kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        .kpi { border-radius: 20px; padding: 14px 16px; }
        .kpi .l { font-size: 0.78rem; color: var(--label-3); }
        .kpi .v { font-size: 1.7rem; font-weight: 750; letter-spacing: -0.03em; margin-top: 2px; font-variant-numeric: tabular-nums; }
        .kpi .s { font-size: 0.75rem; color: var(--label-3); margin-top: 2px; }
        .kpi.accent .v { color: var(--tint-text); }
        .dcard { border-radius: 24px; padding: 16px; margin-top: 12px; }
        .dcard-h { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .dcard-h h3 { font-size: 1rem; }
        .dcard-h p { font-size: 0.78rem; color: var(--label-3); }
        .two-col { display: grid; gap: 0 12px; }
        @media (min-width: 900px) { .two-col { grid-template-columns: 1fr 1fr; } }
        .tbl { width: 100%; border-collapse: collapse; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
        .tbl-wrap { overflow-x: auto; margin: 0 -16px; padding: 0 16px; }
        .tbl th { text-align: left; font-weight: 600; color: var(--label-3); font-size: 0.75rem; padding: 8px 10px; border-bottom: 1px solid var(--sep); white-space: nowrap; }
        .tbl td { padding: 9px 10px; border-bottom: 1px solid var(--sep); white-space: nowrap; color: var(--label-2); }
        .tbl td:first-child { color: var(--label); font-weight: 600; }
        .tbl tr:hover td { background: var(--fill); }
        .barlist { display: grid; gap: 6px; }
        .barlist div { position: relative; display: flex; justify-content: space-between; padding: 7px 10px; font-size: 0.85rem; border-radius: 8px; overflow: hidden; }
        .barlist div i { position: absolute; inset: 0 auto 0 0; background: var(--tint-soft); border-radius: 0 4px 4px 0; }
        .barlist span { position: relative; }
        .barlist b { position: relative; font-variant-numeric: tabular-nums; }
        .daily { position: relative; display: flex; align-items: flex-end; gap: 2px; height: 180px; padding-top: 10px; border-bottom: 1px solid var(--sep); }
        .daily button { flex: 1; height: 100%; display: flex; align-items: flex-end; min-width: 0; }
        .daily button i { display: block; width: 100%; background: var(--tint); border-radius: 4px 4px 0 0; min-height: 2px; transition: opacity 120ms ease; }
        .daily:hover button i { opacity: 0.55; }
        .daily button:hover i, .daily button:focus-visible i { opacity: 1; }
        .daily-tip { position: absolute; top: -6px; transform: translate(-50%, -100%); padding: 8px 10px; border-radius: 12px; font-size: 0.78rem; white-space: nowrap; pointer-events: none; z-index: 2; }
        .daily-axis { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--label-3); margin-top: 6px; }
      `}</style>
    </div>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: number | string | null | undefined; sub?: string; accent?: boolean }) {
  return (
    <div className={`kpi pane ${accent ? "accent" : ""}`}>
      <div className="l">{label}</div>
      <div className="v">{typeof value === "number" ? value.toLocaleString() : value ?? "0"}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

function Card({ title, note, action, children }: { title: string; note?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="dcard pane">
      <div className="dcard-h">
        <div>
          <h3>{title}</h3>
          {note && <p>{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Table({ rows, cols, extra = [] }: { rows: Row[]; cols: [string, string][]; extra?: [string, (r: Row) => string][] }) {
  if (!rows?.length) return <p className="faint" style={{ fontSize: "0.85rem" }}>Nothing yet. Data shows up here as soon as visitors arrive.</p>;
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {cols.map(([, l]) => <th key={l}>{l}</th>)}
            {extra.map(([l]) => <th key={l}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map(([k]) => <td key={k}>{fmtCell(k, r[k])}</td>)}
              {extra.map(([l, f]) => <td key={l}>{f(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtCell(k: string, v: unknown) {
  if (v == null || v === "") return "—";
  if ((k === "ts" || k === "created_at") && typeof v === "string") return new Date(v).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function BarList({ rows, k, v }: { rows: Row[]; k: string; v: string }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[v]) || 0));
  if (!rows.length) return <p className="faint" style={{ fontSize: "0.85rem" }}>Nothing yet.</p>;
  return (
    <div className="barlist">
      {rows.map((r, i) => (
        <div key={i}>
          <i style={{ width: `${((Number(r[v]) || 0) / max) * 100}%` }} />
          <span>{String(r[k] ?? "—")}</span>
          <b>{(Number(r[v]) || 0).toLocaleString()}</b>
        </div>
      ))}
    </div>
  );
}

function DailyBars({ data }: { data: Stats["daily"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.visitors)), [data]);
  if (!data.length) return null;
  const h = hover != null ? data[hover] : null;
  return (
    <div>
      <div className="daily" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <button key={d.day} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`${d.day}: ${d.visitors} visitors, ${d.clicks} clicks, ${d.leads} leads`}>
            <i style={{ height: `${(d.visitors / max) * 100}%` }} />
          </button>
        ))}
        {h && hover != null && (
          <div className="daily-tip glass-thick" style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>
            <b>{new Date(h.day + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}</b>
            <div>{h.visitors.toLocaleString()} visitors</div>
            <div className="faint">{h.clicks.toLocaleString()} clicks · {h.leads.toLocaleString()} leads</div>
          </div>
        )}
      </div>
      <div className="daily-axis">
        <span>{data[0].day.slice(5)}</span>
        <span>{data[data.length - 1].day.slice(5)}</span>
      </div>
    </div>
  );
}
