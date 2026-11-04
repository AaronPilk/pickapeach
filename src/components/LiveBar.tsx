"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/config";

// Live activity from real tracking data. Refreshes every 60s; parts below the floor stay hidden.
export default function LiveBar({ creatorCount }: { creatorCount: number }) {
  const [d, setD] = useState<{ now: number; today: number; members: number } | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/live")
        .then((r) => (r.ok ? r.json() : null))
        .then((x) => alive && x && setD(x))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const total = creatorCount + (d?.members || 0);
  const parts: string[] = [];
  if (d && d.now >= site.live.nowMin) parts.push(`${d.now.toLocaleString()} browsing now`);
  if (d && d.today >= site.live.todayMin) parts.push(`${d.today.toLocaleString()} visitors today`);
  parts.push(`${total} creators`);

  return (
    <div className="live" aria-live="polite">
      <span className="live-dot" aria-hidden />
      <span>{parts.join(" · ")}</span>
    </div>
  );
}
