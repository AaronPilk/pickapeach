"use client";

import { useMemo, useState } from "react";
import { IArrowDown, IArrowUp, IInfo } from "./icons";
import { CHANNELS, fmt } from "./meta";

export function Glass({ title, note, action, className = "", children }: { title?: React.ReactNode; note?: React.ReactNode; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={`g-card ${className}`}>
      {(title || action) && (
        <div className="g-card-h">
          <div>
            {title && <h3>{title}</h3>}
            {note && <p>{note}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children = "Nothing yet. This fills in as soon as real visitors arrive." }: { children?: React.ReactNode }) {
  return <p className="g-empty">{children}</p>;
}

export function Tip({ text }: { text: string }) {
  return (
    <span className="g-tip" tabIndex={0} aria-label={text}>
      <IInfo />
      <span role="tooltip">{text}</span>
    </span>
  );
}

// Big number tile with a colored icon and the change versus the previous period.
export function Stat({ label, value, prev, icon, tint, help, suffix = "", invert = false, vs = "vs previous period" }: {
  label: string; value: number; prev?: number; icon: React.ReactNode; tint: string; help?: string; suffix?: string; invert?: boolean; vs?: string;
}) {
  let delta: React.ReactNode = null;
  if (prev != null) {
    if (prev === 0 && value === 0) delta = <span className="g-delta flat">no change</span>;
    else if (prev === 0) delta = <span className={`g-delta ${invert ? "down" : "up"}`}>new</span>;
    else {
      const ch = Math.round(((value - prev) / prev) * 100);
      const good = invert ? ch <= 0 : ch >= 0;
      delta = (
        <span className={`g-delta ${ch === 0 ? "flat" : good ? "up" : "down"}`}>
          {ch > 0 ? <IArrowUp /> : ch < 0 ? <IArrowDown /> : null}
          {Math.abs(ch)}%
        </span>
      );
    }
  }
  return (
    <div className="g-stat">
      <div className="g-stat-top">
        <span className="g-ico" style={{ background: tint }}>{icon}</span>
        {help && <Tip text={help} />}
      </div>
      <div className="g-stat-l">{label}</div>
      <div className="g-stat-v">
        {typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value}
        {suffix && <small>{suffix}</small>}
      </div>
      {delta && <div className="g-stat-f">{delta}<span>{vs}</span></div>}
    </div>
  );
}

type Day = { day: string; visitors: number; clicks: number; leads: number; bots?: number };

// Smooth line/area chart. Hover or tap a day to see its numbers.
export function Trend({ data }: { data: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { t: 16, r: 8, b: 26, l: 8 };
  const max = useMemo(() => Math.max(4, ...data.map((d) => Math.max(d.visitors, d.clicks, d.leads))), [data]);
  if (!data.length) return <Empty />;
  const x = (i: number) => pad.l + (data.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = (k: keyof Day) => {
    const pts = data.map((d, i) => [x(i), y(Number(d[k]) || 0)]);
    if (pts.length === 1) return `M${pts[0][0] - 1},${pts[0][1]}L${pts[0][0] + 1},${pts[0][1]}`;
    let s = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      s += `C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    return s;
  };
  const area = `${path("visitors")}L${x(data.length - 1)},${H - pad.b}L${x(0)},${H - pad.b}Z`;
  const h = hover != null ? data[hover] : null;
  const label = (d: string) => new Date(d + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <div className="g-trend">
      <div className="g-legend">
        <span><i style={{ background: "#ffd6c7" }} />Visitors</span>
        <span><i style={{ background: "#ff7a5c" }} />Follow clicks</span>
        <span><i style={{ background: "#a78bfa" }} />Unlocks</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
        onTouchStart={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.touches[0].clientX - r.left) / r.width) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
        role="img"
        aria-label="Daily visitors, follow clicks and unlocks"
      >
        <defs>
          <linearGradient id="g-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd6c7" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#ffd6c7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} className="g-grid" />
        ))}
        <path d={area} fill="url(#g-area)" />
        <path d={path("visitors")} className="g-line" stroke="#ffd6c7" />
        <path d={path("clicks")} className="g-line" stroke="#ff7a5c" />
        <path d={path("leads")} className="g-line dashed" stroke="#a78bfa" />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="g-guide" />}
      </svg>
      <div className="g-axis">
        <span>{label(data[0].day)}</span>
        {data.length > 2 && <span>{label(data[Math.floor(data.length / 2)].day)}</span>}
        <span>{label(data[data.length - 1].day)}</span>
      </div>
      {h && hover != null && (
        <div className="g-pop" style={{ left: `clamp(70px, ${(x(hover) / W) * 100}%, calc(100% - 70px))` }}>
          <b>{label(h.day)}</b>
          <span>{fmt(h.visitors)} visitors</span>
          <span>{fmt(h.clicks)} follow clicks</span>
          <span>{fmt(h.leads)} unlocks</span>
          {h.bots ? <span className="dim">{fmt(h.bots)} bots blocked</span> : null}
        </div>
      )}
    </div>
  );
}

export function Bars({ rows, value, label, sub, onPick }: {
  rows: Record<string, unknown>[]; value: string; label: (r: Record<string, unknown>) => React.ReactNode; sub?: (r: Record<string, unknown>) => React.ReactNode; onPick?: (r: Record<string, unknown>) => void;
}) {
  const total = rows.reduce((a, r) => a + (Number(r[value]) || 0), 0);
  const max = Math.max(1, ...rows.map((r) => Number(r[value]) || 0));
  if (!rows.length) return <Empty />;
  return (
    <div className="g-bars">
      {rows.map((r, i) => {
        const v = Number(r[value]) || 0;
        const inner = (
          <>
            <i style={{ width: `${(v / max) * 100}%` }} />
            <span className="g-bars-l">{label(r)}{sub && <small>{sub(r)}</small>}</span>
            <b>{fmt(v)}<small>{total ? `${Math.round((v / total) * 100)}%` : ""}</small></b>
          </>
        );
        return onPick ? (
          <button key={i} className="g-bar" onClick={() => onPick(r)}>{inner}</button>
        ) : (
          <div key={i} className="g-bar">{inner}</div>
        );
      })}
    </div>
  );
}

export function ChannelTag({ channel }: { channel: string }) {
  const c = CHANNELS[channel] || CHANNELS.direct;
  return (
    <span className="g-tag">
      <i style={{ background: c.tint }} />
      {c.name}
    </span>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="g-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} role="radio" aria-checked={value === v} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}
