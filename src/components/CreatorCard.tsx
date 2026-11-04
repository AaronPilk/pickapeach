"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CardData } from "@/lib/creators";
import { track } from "@/lib/track";
import { Lock, Play, Sparkle } from "./Icons";
import { openGate, useVip } from "@/lib/vip";

export default function CreatorCard({ c, index = 0, list = "grid", eager = false }: { c: CardData; index?: number; list?: string; eager?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const swiped = useRef(false);
  const vip = useVip();
  const vipCount = vip.summary?.perCreator?.[c.slug];

  // Impression: at least half the card visible for 800ms, once per page view.
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          t = setTimeout(() => {
            track("impression", { c: c.slug, m: { l: list, i: index } });
            io.disconnect();
          }, 800);
        } else if (t) {
          clearTimeout(t);
          t = null;
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (t) clearTimeout(t);
    };
  }, [c.slug, list, index]);

  const onScroll = () => {
    const s = strip.current;
    if (!s) return;
    const i = Math.round(s.scrollLeft / s.clientWidth);
    if (i !== active) {
      setActive(i);
      if (!swiped.current) {
        swiped.current = true;
        track("card_swipe", { c: c.slug, m: { l: list } });
      }
    }
  };

  const meta = [c.age ? `${c.age}` : "", c.location?.split(",")[0] || "", c.hair || ""].filter(Boolean);

  return (
    <article ref={ref} className="card reveal" style={{ ["--i" as string]: index % 8 }}>
      <div className="card-media">
        <div className="card-strip" ref={strip} onScroll={onScroll}>
          {c.photos.map((p, i) => (
            <div className="card-photo" key={p.src}>
              <img
                src={p.src}
                alt={i === 0 ? `${c.name}, ${c.tagline}` : ""}
                width={p.w}
                height={p.h}
                loading={eager && i === 0 ? "eager" : "lazy"}
                fetchPriority={eager && i === 0 ? "high" : "auto"}
                decoding="async"
                draggable={false}
              />
            </div>
          ))}
        </div>
        {c.photos.length > 1 && (
          <div className="card-dots" aria-hidden>
            {c.photos.map((p, i) => (
              <i key={p.src} data-on={i === active} />
            ))}
          </div>
        )}
        {c.free ? (
          <span className="card-badge badge-free">Free</span>
        ) : c.badge === "new" ? (
          <span className="card-badge badge-new">New</span>
        ) : c.badge ? (
          <span className="card-badge badge-glass">{c.badge === "hot" ? "Hot" : "Trending"}</span>
        ) : null}
        <div className="card-scrim" />
        <Link
          href={`/${c.slug}`}
          className="card-link"
          aria-label={`View ${c.name}'s profile`}
          data-track="card_click"
          data-creator={c.slug}
          data-m-l={list}
          data-m-i={String(index)}
        />
        <div className="card-info">
          <div className="card-name">
            {c.name}
            {c.age ? <span className="age">{c.age}</span> : null}
            {vip.unlocked && vipCount ? <Sparkle style={{ width: 14, height: 14, color: "var(--coral-400)" }} aria-label="VIP content" /> : null}
          </div>
          <div className="card-tag">{c.tagline}</div>
          <div className="card-meta">
            {c.clipCount > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Play style={{ width: 9, height: 9 }} /> {c.clipCount}
              </span>
            )}
            {meta.slice(1).map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function LockedCard({ index = 0, count }: { index?: number; count: number }) {
  return (
    <button className="card-lock reveal" style={{ ["--i" as string]: index % 8 }} onClick={() => openGate("grid_card")} aria-label="Unlock VIP creators">
      <div>
        <div className="lock-ico">
          <Lock />
        </div>
        <h3>{count > 0 ? `+${count} VIP creators` : "VIP drops"}</h3>
        <p>{count > 0 ? "Members-only girls and extra sets. Free with email + phone." : "Extra photos and clips from every girl. Free to unlock."}</p>
        <span className="btn btn-sm btn-coral lock-cta">Unlock free</span>
      </div>
    </button>
  );
}
