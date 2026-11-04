"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { initTracking, track } from "@/lib/track";
import { getConsent, onConsent } from "@/lib/consent";
import { site } from "@/lib/config";

// Page views, engaged time + scroll depth per page, outbound/social clicks via data attributes.
export default function Tracker() {
  const path = usePathname();
  const state = useRef({ start: 0, active: 0, lastTick: 0, depth: 0, path: "" });

  // Google Analytics (if configured) only loads with analytics consent.
  useEffect(() => {
    if (!site.gaId) return;
    const load = () => {
      if (!getConsent().analytics || document.getElementById("ga-src")) return;
      const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void };
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer.push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", site.gaId, { send_page_view: false, allow_google_signals: getConsent().ads, allow_ad_personalization_signals: getConsent().ads });
      const sc = document.createElement("script");
      sc.id = "ga-src";
      sc.async = true;
      sc.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(site.gaId)}`;
      document.head.appendChild(sc);
    };
    load();
    return onConsent(load);
  }, []);

  useEffect(() => {
    initTracking();
    // Delegated click tracking: any element with data-track="event" (+ data-creator, data-meta-*)
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-track]");
      if (!el) return;
      const m: Record<string, string> = {};
      for (const [k, v] of Object.entries(el.dataset)) if (k.startsWith("m") && k.length > 1 && k !== "track") m[k.slice(1).toLowerCase()] = v || "";
      track(el.dataset.track!, { c: el.dataset.creator, m });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  useEffect(() => {
    const s = state.current;
    const leave = () => {
      if (!s.path) return;
      tick();
      track("page_leave", { m: { ms: Math.round(s.active), depth: s.depth, path: s.path } });
    };
    const tick = () => {
      const now = performance.now();
      if (document.visibilityState === "visible" && now - s.lastTick < 30_000) s.active += now - s.lastTick;
      s.lastTick = now;
    };
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      const d = h > 0 ? Math.min(100, Math.round((scrollY / h) * 100)) : 100;
      if (d > s.depth) s.depth = d;
      tick();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") leave();
      else {
        s.lastTick = performance.now();
      }
    };

    s.start = performance.now();
    s.lastTick = s.start;
    s.active = 0;
    s.depth = 0;
    s.path = path;
    track("page_view", { m: { title: document.title.slice(0, 120) } });
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    if (gtag && site.gaId) gtag("event", "page_view", { page_path: path });

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("pointerdown", tick, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      leave();
      s.path = "";
      removeEventListener("scroll", onScroll);
      removeEventListener("pointerdown", tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [path]);

  return null;
}
