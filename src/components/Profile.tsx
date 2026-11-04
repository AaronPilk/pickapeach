"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Clip, Creator, Photo, VipItem } from "@/lib/types";
import { track } from "@/lib/track";
import { openGate, useVip } from "@/lib/vip";
import { Arrow, ChevronLeft, ChevronRight, Close, Lock, Play, Share, Sparkle, SocialMark } from "./Icons";

export function Gallery({ photos, name }: { photos: Photo[]; name: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const seen = useRef(new Set([0]));
  const onScroll = () => {
    const s = strip.current!;
    const n = Math.round(s.scrollLeft / s.clientWidth);
    if (n !== i) {
      setI(n);
      if (!seen.current.has(n)) {
        seen.current.add(n);
        track("photo_view", { c: slugFromPath(), m: { i: n } });
      }
    }
  };
  const go = (n: number) => {
    const s = strip.current!;
    s.scrollTo({ left: Math.max(0, Math.min(photos.length - 1, n)) * s.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <div className="gallery">
      <div className="gallery-strip" ref={strip} onScroll={onScroll} aria-roledescription="carousel" aria-label={`${name}'s photos`}>
        {photos.map((p, n) => (
          <div key={p.src} aria-roledescription="slide" aria-label={`${n + 1} of ${photos.length}`}>
            <img src={p.src} alt={p.alt || `${name}, photo ${n + 1}`} width={p.w} height={p.h} loading={n === 0 ? "eager" : "lazy"} fetchPriority={n === 0 ? "high" : "auto"} decoding="async" draggable={false} />
          </div>
        ))}
      </div>
      <div className="gallery-top">
        <button className="icon-btn btn-glass" aria-label="Back" onClick={() => (history.length > 1 ? history.back() : (location.href = "/"))}>
          <ChevronLeft />
        </button>
        <ShareButton name={name} />
      </div>
      {photos.length > 1 && (
        <>
          <button className="icon-btn btn-glass gallery-arrow prev" onClick={() => go(i - 1)} aria-label="Previous photo" disabled={i === 0}><ChevronLeft /></button>
          <button className="icon-btn btn-glass gallery-arrow next" onClick={() => go(i + 1)} aria-label="Next photo" disabled={i === photos.length - 1}><ChevronRight /></button>
          <span className="gallery-count badge-glass">{i + 1} / {photos.length}</span>
          <div className="gallery-dots only-desktop">
            {photos.map((p, n) => (
              <button key={p.src} aria-label={`Show photo ${n + 1}`} aria-current={n === i} onClick={() => go(n)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <button
        className="icon-btn btn-glass"
        aria-label={`Share ${name}'s profile`}
        onClick={async () => {
          const url = location.href.split("?")[0];
          track("share", { c: slugFromPath() });
          try {
            if (navigator.share) await navigator.share({ title: `${name} on Pick a Peach`, url });
            else {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }
          } catch {}
        }}
      >
        <Share />
      </button>
      {mounted &&
        createPortal(<div className="toast glass-thick" data-show={copied} role="status">Link copied</div>, document.body)}
    </>
  );
}

export function FollowButton({ c, where, className = "btn btn-coral", children }: { c: Pick<Creator, "slug" | "name" | "free">; where: string; className?: string; children?: React.ReactNode }) {
  return (
    <a
      href={`/go/${c.slug}?s=${where}&from=${encodeURIComponent(`/${c.slug}`)}`}
      className={className}
      target="_blank"
      rel="nofollow noopener sponsored"
      data-track="follow_click"
      data-creator={c.slug}
      data-m-s={where}
    >
      {children || (
        <>
          Follow {c.name} {c.free ? "free" : ""}
          <Arrow />
        </>
      )}
    </a>
  );
}

export function SocialLinks({ c, links }: { c: Pick<Creator, "slug">; links: { key: string; label: string; url: string }[] }) {
  if (!links.length) return null;
  return (
    <div className="socials">
      {links.map((l) => (
        <a key={l.key} className="social" href={l.url} target="_blank" rel="nofollow noopener me" data-track="social_click" data-creator={c.slug} data-m-n={l.key}>
          <SocialMark k={l.key} />
          {l.label}
        </a>
      ))}
    </div>
  );
}

export function ProfileView({ slug }: { slug: string }) {
  useEffect(() => {
    track("profile_view", { c: slug, m: { ref: document.referrer ? new URL(document.referrer).pathname.slice(0, 80) : "" } });
  }, [slug]);
  return null;
}

export function ClipGrid({ c, clips }: { c: Pick<Creator, "slug" | "name" | "free">; clips: Clip[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!clips.length) return null;
  return (
    <>
      <div className="clip-grid">
        {clips.map((clip, i) => (
          <button
            key={`${clip.src}-${i}`}
            className="clip-tile reveal"
            style={{ ["--i" as string]: i }}
            onClick={() => {
              setOpen(i);
              track("clip_open", { c: c.slug, m: { i } });
            }}
            aria-label={`Play clip ${i + 1}`}
          >
            <img src={clip.poster} alt="" loading="lazy" decoding="async" />
            <span className="play-pill"><Play /> {clip.duration ? fmt(clip.duration) : "Play"}</span>
          </button>
        ))}
      </div>
      {open !== null && <Lightbox c={c} clip={clips[open]} onClose={() => setOpen(null)} />}
    </>
  );
}

function Lightbox({ c, clip, onClose }: { c: Pick<Creator, "slug" | "name" | "free">; clip: { src: string; poster?: string; kind?: string }; onClose: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const reported = useRef(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [onClose]);
  const isPhoto = clip.kind === "photo";
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${c.name} clip`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      {isPhoto ? (
        <img src={clip.src} alt={`${c.name} VIP photo`} />
      ) : (
        <video
          ref={v}
          src={clip.src}
          poster={clip.poster}
          autoPlay
          playsInline
          loop
          controls
          onPlay={() => {
            if (!reported.current) {
              reported.current = true;
              track("video_play", { c: c.slug, m: { src: clip.src.split("/").pop() || "" } });
            }
          }}
        />
      )}
      <button className="icon-btn btn-glass close" onClick={onClose} aria-label="Close">
        <Close />
      </button>
      <div className="lb-cta">
        <FollowButton c={c} where="lightbox" />
      </div>
    </div>,
    document.body,
  );
}

export function VipSection({ c }: { c: Pick<Creator, "slug" | "name" | "free"> }) {
  const vip = useVip();
  const [open, setOpen] = useState<VipItem | null>(null);
  const counts = vip.summary?.perCreator?.[c.slug];
  const items = vip.content?.items?.[c.slug] || [];
  if (!vip.unlocked && !counts) return null;
  if (vip.unlocked && !items.length) return null;

  const photos = counts?.photos ?? 0;
  const clips = counts?.clips ?? 0;
  const teaser = Array.from({ length: Math.min(6, Math.max(3, photos + clips)) });

  return (
    <section className="vip-box" aria-labelledby="vip-h">
      <h2 id="vip-h">
        <Sparkle /> {vip.unlocked ? `${c.name}'s VIP drops` : "VIP drops"}
      </h2>
      <p>
        {vip.unlocked
          ? "Members only. Thanks for being here."
          : `${[photos ? `${photos} photo${photos > 1 ? "s" : ""}` : "", clips ? `${clips} clip${clips > 1 ? "s" : ""}` : ""].filter(Boolean).join(" and ")} you won't see on the public page.`}
      </p>
      {vip.unlocked ? (
        <div className="clip-grid">
          {items.map((it, i) => (
            <button key={`${it.src}-${i}`} className={`clip-tile ${it.kind === "photo" ? "photo-tile" : ""} unlocked-in`} style={{ animationDelay: `${i * 60}ms` }} onClick={() => { setOpen(it); track("vip_open", { c: c.slug, m: { kind: it.kind, i } }); }}>
              <img src={it.kind === "clip" ? it.poster || "" : it.src} alt="" loading="lazy" />
              {it.kind === "clip" && <span className="play-pill"><Play /> {it.duration ? fmt(it.duration) : "Play"}</span>}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="clip-grid">
            {teaser.map((_, i) => (
              <button key={i} className="clip-tile photo-tile locked" onClick={() => openGate("profile_vip_tile", c.slug)} aria-label="Unlock VIP">
                <img src={`/media/ui/vip-blur-${(i % 3) + 1}.svg`} alt="" loading="lazy" />
                <span className="lock-overlay"><Lock /></span>
              </button>
            ))}
          </div>
          <button className="btn btn-coral btn-block" style={{ marginTop: 14 }} onClick={() => openGate("profile_vip", c.slug)}>
            <Lock /> Unlock free
          </button>
        </>
      )}
      {open && <Lightbox c={c} clip={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

export function StickyCta({ c, avatar, sentinelId }: { c: Pick<Creator, "slug" | "name" | "free" | "tagline">; avatar: string; sentinelId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(sentinelId);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [sentinelId]);
  return (
    <div className="sticky-cta glass-thick" data-show={show} aria-hidden={!show}>
      <img src={avatar} alt="" />
      <div className="who">
        <b>{c.name}</b>
        <span>{c.tagline}</span>
      </div>
      <FollowButton c={c} where="sticky">
        Follow <Arrow />
      </FollowButton>
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}
function slugFromPath() {
  return location.pathname.split("/").filter(Boolean)[0] || "";
}
