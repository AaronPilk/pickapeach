"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { currentSessionId, initTracking, inPreview, track } from "@/lib/track";
import { getConsent, onConsent } from "@/lib/consent";
import { site } from "@/lib/config";

// Page views, engaged time + scroll depth per page, outbound/social clicks via data attributes.
export default function Tracker() {
  const path = usePathname();
  const state = useRef({ start: 0, active: 0, lastTick: 0, depth: 0, my: 0, path: "", taps: 0, lastTap: 0 });

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
      // Without analytics cookies, hand the in-memory visit id to /go so the follow click joins the right visit.
      const go = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="/go/"]');
      if (go && !getConsent().analytics && !go.href.includes("_s=")) {
        go.href += (go.href.includes("?") ? "&" : "?") + "_s=" + encodeURIComponent(currentSessionId());
      }
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
      track("page_leave", { m: { ms: Math.round(s.active), depth: s.depth, path: s.path, my: Math.round(s.my), vh: innerHeight } });
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
      if (scrollY + innerHeight > s.my) s.my = scrollY + innerHeight;
      tick();
    };
    // Heatmap: where on the page people tap, and what they tapped. Positions only, never anything typed.
    const onTap = (e: PointerEvent) => {
      if (!e.isPrimary || inPreview()) return;
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest || t.closest(".gate, .cookie-card, .cookie-pill, .cookie-layer, [data-no-heat]")) return;
      const now = performance.now();
      if (now - s.lastTap < 250 || s.taps >= 80) return;
      s.lastTap = now;
      s.taps++;
      const hit = t.closest<HTMLElement>('a, button, [role="button"], input, select, textarea, label, summary, video, [data-track]');
      const fixed = pinned(hit || t);
      track("tap", {
        m: {
          x: Math.round((e.clientX / innerWidth) * 10000) / 10000,
          cx: Math.round(e.clientX - innerWidth / 2),
          y: Math.round(fixed ? e.clientY : e.clientY + scrollY),
          fx: fixed,
          vw: innerWidth,
          vh: innerHeight,
          el: hit ? tapLabel(hit) : "",
          dead: !hit,
        },
      });
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
    s.my = innerHeight;
    s.taps = 0;
    s.path = path;
    track("page_view", { m: { title: document.title.slice(0, 120) } });
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    if (gtag && site.gaId) gtag("event", "page_view", { page_path: path });

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("pointerdown", tick, { passive: true });
    addEventListener("pointerdown", onTap, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      leave();
      s.path = "";
      removeEventListener("scroll", onScroll);
      removeEventListener("pointerdown", tick);
      removeEventListener("pointerdown", onTap, { capture: true });
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [path]);

  return null;
}

// Pinned to the screen (header, bottom bar, sticky buttons)? Those taps are drawn where they sit on screen.
function pinned(el: HTMLElement) {
  for (let n: HTMLElement | null = el, i = 0; n && n !== document.body && i < 10; n = n.parentElement, i++) {
    const pos = getComputedStyle(n).position;
    if (pos === "fixed" || pos === "sticky") return true;
  }
  return false;
}

// A short, readable name for what was tapped: "Follow · ari", "Unlock", "Search".
function tapLabel(el: HTMLElement) {
  if (el.matches("input, textarea, select")) {
    const f = el as HTMLInputElement;
    return ("Field: " + (f.getAttribute("aria-label") || f.placeholder || f.name || f.type || "input")).slice(0, 60);
  }
  let text = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || el.querySelector("img")?.getAttribute("alt") || "").replace(/\s+/g, " ").trim();
  if (text.length > 40) text = text.slice(0, 40).trim() + "…";
  const creator = el.dataset.creator || el.closest<HTMLElement>("[data-creator]")?.dataset.creator;
  const href = el.getAttribute("href") || "";
  const go = href.startsWith("/go/") ? href.slice(4).split(/[?#]/)[0] : "";
  if (!text) text = el.tagName === "VIDEO" ? "Video" : href ? href.split(/[?#]/)[0] : "Button";
  const who = creator || go;
  return (who && !text.toLowerCase().includes(who.toLowerCase()) ? `${text} · ${who}` : text).slice(0, 60);
}
