"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bars, Empty, Glass, Seg } from "./parts";
import { fmt } from "./meta";

// [x share of width, px from centre, y px, pinned (1/0), not a button (1/0), screen height]
type Tap = [number, number, number, number, number, number];
export type HeatData = {
  path: string;
  device: string;
  pages: { path: string; views: number; taps: number }[];
  views: number;
  visitors: number;
  tap_count: number;
  tappers: number;
  taps: Tap[];
  top: { el: string; dead: boolean; taps: number; people: number }[];
  reach: [number, number, number][]; // [depth %, lowest px seen, screen height] per visit
  avg_ms: number | null;
};
type Device = "mobile" | "desktop";
const DEVICES: [Device, string][] = [["mobile", "Phones"], ["desktop", "Computers"]];

const FRAME: Record<Device, { w: number; h: number; r: number }> = {
  mobile: { w: 390, h: 760, r: 22 },
  desktop: { w: 1280, h: 800, r: 26 },
};

const NAMES: Record<string, string> = {
  "/": "Home",
  "/clips": "Clips feed",
  "/vip": "Members-only",
  "/new": "New creators",
  "/trending": "Trending",
  "/blog": "Blog",
  "/apply": "Apply",
  "/terms": "Terms",
  "/privacy": "Privacy",
  "/cookies": "Cookie Policy",
};
export function pageName(path: string) {
  if (NAMES[path]) return NAMES[path];
  if (path.startsWith("/blog/")) return `Blog: ${path.slice(6).replace(/-/g, " ")}`;
  const seg = path.split("/").filter(Boolean);
  if (seg.length === 1) return `Profile: ${seg[0]}`;
  return path;
}

export default function Heatmaps({ days }: { days: number }) {
  const [device, setDevice] = useState<Device>("mobile");
  const [path, setPath] = useState("/");
  const [src, setSrc] = useState("/");
  const [data, setData] = useState<HeatData | null>(null);
  const [show, setShow] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetch(`/api/admin/heatmap?path=${encodeURIComponent(path)}&device=${device}&days=${days}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setData(d))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [path, device, days]);

  const pick = (p: string) => {
    setPath(p);
    setSrc(p);
  };

  const pages = useMemo(() => {
    const list = data?.pages || [];
    return list.some((p) => p.path === path) ? list : [{ path, views: 0, taps: 0 }, ...list];
  }, [data, path]);

  const reach = useMemo(() => reachRows(data?.reach || []), [data]);
  const time = data?.avg_ms ? (data.avg_ms >= 60000 ? `${Math.floor(data.avg_ms / 60000)}m ${Math.round((data.avg_ms % 60000) / 1000)}s` : `${Math.round(data.avg_ms / 1000)}s`) : "—";

  return (
    <div className="g-stack">
      <div className="g-heat-bar g-card">
        <label className="g-select">
          <span>Page</span>
          <select value={path} onChange={(e) => pick(e.target.value)}>
            {pages.map((p) => (
              <option key={p.path} value={p.path}>
                {pageName(p.path)} · {fmt(p.views)} views
              </option>
            ))}
          </select>
        </label>
        <Seg label="Device" value={device} options={DEVICES} onChange={(d) => setDevice(d)} />
        <button className="g-btn" onClick={() => setShow((v) => !v)} aria-pressed={show}>
          {show ? "Hide taps" : "Show taps"}
        </button>
      </div>

      <div className="g-heat">
        <Glass
          className="g-heat-stage"
          title={pageName(path)}
          note={`Red is where people tap the most. Scroll inside the ${device === "mobile" ? "phone" : "screen"} to see the whole page, or tap a link in it to switch pages.`}
        >
          <Preview
            device={device}
            src={src}
            taps={data?.path === path ? data.taps : []}
            reach={data?.path === path ? data.reach : []}
            show={show}
            onNavigate={(p) => p !== path && setPath(p)}
          />
          {loading && <p className="g-heat-loading">Loading taps…</p>}
        </Glass>

        <div className="g-stack">
          <Glass title="This page" note={device === "mobile" ? "Phones only." : "Computers only."}>
            <div className="g-minis">
              <div><b>{fmt(data?.views)}</b><span>Page views</span></div>
              <div><b>{fmt(data?.visitors)}</b><span>Visits</span></div>
              <div><b>{fmt(data?.tap_count)}</b><span>Taps</span></div>
              <div><b>{time}</b><span>Avg time here</span></div>
            </div>
          </Glass>

          <Glass title="Most tapped" note="What people tapped on this page. “Not a button” means people tapped something that does nothing, a sign they expected it to.">
            {data?.top.length ? (
              <Bars
                rows={data.top as unknown as Record<string, unknown>[]}
                value="taps"
                label={(r) => String(r.el)}
                sub={(r) => `${fmt(Number(r.people))} ${Number(r.people) === 1 ? "person" : "people"}${r.dead ? " · not a button" : ""}`}
              />
            ) : (
              <Empty>No taps on this page yet. Tap tracking started Nov 5, so this fills in as visitors use the site.</Empty>
            )}
          </Glass>

          <Glass title="How far people scroll" note="Share of visits that got at least this far down the page.">
            {reach.length ? (
              <div className="g-reach">
                {reach.map((r) => (
                  <div key={r.label}>
                    <span>{r.label}</span>
                    <i><em style={{ width: `${r.pct}%` }} /></i>
                    <b>{r.pct}%</b>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No scroll data for this page yet.</Empty>
            )}
          </Glass>
        </div>
      </div>
    </div>
  );
}

function reachRows(rows: [number, number, number][]) {
  if (!rows.length) return [];
  const withPx = rows.filter((r) => r[1] > 0 && r[2] > 0);
  if (withPx.length >= Math.max(1, rows.length / 2)) {
    const n = withPx.length;
    const at = (k: number) => Math.round((withPx.filter(([, my, vh]) => my >= vh * k).length / n) * 100);
    return [
      { label: "First screen", pct: 100 },
      { label: "Scrolled 1 screen down", pct: at(2) },
      { label: "2 screens down", pct: at(3) },
      { label: "4 screens down", pct: at(5) },
      { label: "8+ screens down", pct: at(9) },
    ];
  }
  const n = rows.length;
  const at = (d: number) => Math.round((rows.filter(([depth]) => depth >= d).length / n) * 100);
  return [
    { label: "A quarter of the page", pct: at(25) },
    { label: "Halfway", pct: at(50) },
    { label: "Three quarters", pct: at(75) },
    { label: "The bottom", pct: at(95) },
  ];
}

// The real page in a frame, with the heat drawn on top. The overlay follows the frame's scrolling.
function Preview({ device, src, taps, reach, show, onNavigate }: {
  device: Device; src: string; taps: Tap[]; reach: [number, number, number][]; show: boolean; onNavigate: (p: string) => void;
}) {
  const { w: W, h: H, r: R } = FRAME[device];
  const outer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scrollY = useRef(0);
  const raf = useRef(0);
  const navigate = useRef(onNavigate);
  navigate.current = onNavigate;
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);

  const blob = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = R * 2;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(R, R, 0, R, R, R);
    grd.addColorStop(0, "rgba(0,0,0,1)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, R * 2, R * 2);
    return c;
  }, [R]);

  const palette = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 1;
    const g = c.getContext("2d")!;
    const grd = g.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0.15, "#3b82f6");
    grd.addColorStop(0.4, "#22d3ee");
    grd.addColorStop(0.6, "#a3e635");
    grd.addColorStop(0.8, "#facc15");
    grd.addColorStop(1, "#ef4444");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 1);
    return g.getImageData(0, 0, 256, 1).data;
  }, []);

  // Typical screen height from the visits, used to place the "x% got here" lines.
  const fold = useMemo(() => {
    const v = reach.map((r) => r[2]).filter((x) => x > 0).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : 0;
  }, [reach]);

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c || !blob || !palette) return;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.clearRect(0, 0, W, H);
    if (!show) return;
    const sy = scrollY.current;
    const pts: [number, number][] = [];
    for (const [x, cx, y, fx, , vh] of taps) {
      const px = device === "mobile" ? x * W : W / 2 + cx;
      // Pinned taps sit where they were on screen; bottom bars are measured from the bottom edge.
      const py = fx ? (vh && y > vh / 2 ? H - (vh - y) : y) : y - sy;
      if (py < -R || py > H + R || px < -R || px > W + R) continue;
      pts.push([px, py]);
    }
    if (pts.length) {
      ctx.globalAlpha = Math.min(0.65, Math.max(0.1, 3 / Math.sqrt(pts.length)));
      for (const [px, py] of pts) ctx.drawImage(blob, px - R, py - R);
      ctx.globalAlpha = 1;
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3];
        if (!a) continue;
        const j = a * 4;
        d[i] = palette[j];
        d[i + 1] = palette[j + 1];
        d[i + 2] = palette[j + 2];
        d[i + 3] = Math.min(235, 60 + a);
      }
      ctx.putImageData(img, 0, 0);
    }
    // Scroll lines: how many visits made it this far down.
    const withPx = reach.filter((r) => r[1] > 0);
    if (fold && withPx.length) {
      ctx.font = "600 12px -apple-system, system-ui, sans-serif";
      for (let k = 1; k <= 12; k++) {
        const docY = fold * k;
        const y = docY - sy;
        if (y < 10 || y > H - 4) continue;
        const pct = Math.round((withPx.filter((r) => r[1] >= docY).length / withPx.length) * 100);
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.setLineDash([]);
        const label = `${pct}% scrolled this far`;
        const tw = ctx.measureText(label).width + 14;
        ctx.fillStyle = "rgba(20,14,40,0.88)";
        ctx.beginPath();
        ctx.roundRect(8, y - 24, tw, 20, 10);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(label, 15, y - 10);
      }
    }
  }, [W, H, R, blob, palette, taps, reach, fold, show, device]);

  const schedule = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(schedule, [schedule]);

  useEffect(() => {
    const f = frame.current;
    if (!f) return;
    let win: Window | null = null;
    let last = "";
    const onScroll = () => {
      scrollY.current = win?.scrollY || 0;
      schedule();
    };
    const attach = () => {
      try {
        win?.removeEventListener("scroll", onScroll);
        win = f.contentWindow;
        win?.addEventListener("scroll", onScroll, { passive: true });
        scrollY.current = win?.scrollY || 0;
        last = win?.location.pathname || "";
        schedule();
      } catch {
        win = null;
      }
    };
    f.addEventListener("load", attach);
    attach();
    // Follow page changes inside the frame so the heat always matches what's on screen.
    const t = setInterval(() => {
      try {
        const p = f.contentWindow?.location.pathname || "";
        if (p && p !== last) {
          last = p;
          scrollY.current = f.contentWindow?.scrollY || 0;
          navigate.current(p);
        }
      } catch {}
    }, 600);
    return () => {
      clearInterval(t);
      f.removeEventListener("load", attach);
      try {
        win?.removeEventListener("scroll", onScroll);
      } catch {}
    };
  }, [schedule, src, device]);

  return (
    <div ref={outer} className={`g-heat-outer ${device}`} style={{ height: H * scale }}>
      <div className="g-heat-device" style={{ width: W, height: H, transform: `scale(${scale})` }}>
        <iframe key={`${device}${src}`} ref={frame} src={src} title="Page preview" width={W} height={H} />
        <canvas ref={canvas} width={W} height={H} aria-hidden />
      </div>
    </div>
  );
}
