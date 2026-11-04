"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { profileHref, type CardData } from "@/lib/card";
import { track } from "@/lib/track";
import { Lock, Play, Sparkle } from "./Icons";
import { openGate } from "@/lib/vip";

export default function CreatorCard({ c, index = 0, list = "grid", eager = false }: { c: CardData; index?: number; list?: string; eager?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const swiped = useRef(false);

  // Impression: at least half the card on screen for 800ms, once per page view.
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          t = setTimeout(() => {
            track("impression", { c: c.slug, m: { l: list, i: index, locked: !!c.locked } });
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
  }, [c.slug, c.locked, list, index]);

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

  const sub = [c.location?.split(",")[0], c.hair].filter(Boolean).join(" · ") || c.tagline;

  return (
    <article ref={ref} className="card reveal" style={{ ["--i" as string]: index % 8 }}>
      <div className="card-media">
        <div className="card-strip" ref={strip} onScroll={onScroll}>
          {c.photos.map((p, i) => (
            <div className="card-photo" key={`${p.src}-${i}`}>
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
              <i key={`${p.src}-${i}`} data-on={i === active} />
            ))}
          </div>
        )}
        {c.free && <span className="card-flag">Free</span>}
        {c.clipCount > 0 && (
          <span className="card-flag" style={c.free ? undefined : { left: 8 }}>
            <Play /> {c.clipCount}
          </span>
        )}
        <Link
          href={profileHref(c)}
          className="card-link"
          aria-label={`View ${c.name}'s profile`}
          data-track="card_click"
          data-creator={c.slug}
          data-m-l={list}
          data-m-i={String(index)}
        />
      </div>
      <div className="card-body">
        <div className="card-title">
          {c.name}
          {c.age ? <span className="age">{c.age}</span> : null}
          {c.locked ? <Sparkle aria-label="Unlocked" /> : null}
        </div>
        <div className="card-sub">{sub}</div>
      </div>
    </article>
  );
}

// Same footprint as a creator card, so it sits naturally in the grid.
export function LockedCard({ index = 0, count, art }: { index?: number; count: number; art?: string }) {
  return (
    <button className="card card-lock reveal" style={{ ["--i" as string]: index % 8 }} onClick={() => openGate("grid_card")} aria-label="Unlock the hidden creators">
      <div className="card-media">
        <div className="blur-art" style={{ backgroundImage: `url(${art || "/media/ui/vip-blur-1.svg"})` }} />
        <div className="lock-badge">
          <span className="ico">
            <Lock />
          </span>
          <b>{count > 0 ? `+${count}` : "More"}</b>
          <span>{count > 0 ? "more girls, hidden" : "hidden girls"}</span>
        </div>
      </div>
      <div className="card-body">
        <div className="card-title ct">Unlock free</div>
        <div className="card-sub">Email + phone, takes 10 seconds</div>
      </div>
    </button>
  );
}
