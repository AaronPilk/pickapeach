"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Clip, Creator, Photo } from "@/lib/types";
import type { CardData } from "@/lib/card";
import { socialLinks } from "@/lib/social";
import { track } from "@/lib/track";
import CreatorCard from "./CreatorCard";
import { Arrow, ChevronLeft, ChevronRight, Clips as ClipsIcon, Close, Play, Share } from "./Icons";

type Lite = Pick<Creator, "slug" | "name" | "free" | "tagline">;

export function ProfileBody({ c, related, regionHref, preview }: { c: Creator; related: CardData[]; regionHref?: string; preview?: boolean }) {
  const links = socialLinks(c);
  const lite: Lite = { slug: c.slug, name: c.name, free: c.free, tagline: c.tagline };
  const details: [string, string | undefined, string | undefined][] = [
    ["Age", c.age ? String(c.age) : undefined, undefined],
    ["From", c.location, regionHref],
    ["Height", c.height, undefined],
    ["Hair", c.hair, undefined],
    ["Eyes", c.eyes, undefined],
  ];
  const shown = details.filter(([, v]) => v);

  return (
    <>
      {!preview && <ProfileView slug={c.slug} locked={!!c.locked} />}
      <div className="wrap">
        <article className="profile">
          <Gallery photos={c.photos} name={c.name} />
          <div>
            <div className="p-head">
              <nav className="crumbs only-desktop" aria-label="Breadcrumb">
                <Link href="/">Creators</Link> <span>/</span> <span>{c.name}</span>
              </nav>
              <div className="p-name">
                <h1 className="t-large">{c.name}</h1>
                {c.age ? <span className="t-large age">{c.age}</span> : null}
              </div>
              <div className="p-meta">
                {c.free && <span className="free-tag">Free page</span>}
                {c.locked && <span className="free-tag">Unlocked</span>}
                {c.location && <span>{c.location}</span>}
                {c.location && c.handle && <span className="dot" aria-hidden />}
                {c.handle && <span>@{c.handle}</span>}
              </div>
              {c.tagline && <p className="p-tagline">{c.tagline}</p>}
              <div className="p-cta" id="main-cta">
                <FollowButton c={lite} where="profile" className="btn btn-primary" preview={preview} />
                {c.clips.length > 0 && (
                  <Link
                    href={`/clips?c=${c.slug}`}
                    className="icon-btn btn-tinted"
                    aria-label={`Watch ${c.name}'s clips`}
                    data-track="watch_clips"
                    data-creator={c.slug}
                    style={{ background: "var(--tint-soft)", color: "var(--tint-text)" }}
                  >
                    <ClipsIcon />
                  </Link>
                )}
                <span className="only-desktop">
                  <ShareButton name={c.name} className="icon-btn gray" style={{ width: 50, height: 50 }} />
                </span>
              </div>
            </div>

            <section className="group" aria-labelledby="about-h">
              <h2 id="about-h" className="group-label">About</h2>
              <div className="group-card">
                <p className="row-text">{c.bio}</p>
                {c.tags.length > 0 && (
                  <div className="tags">
                    {c.tags.map((t) =>
                      c.locked ? (
                        <span key={t} className="tag">{cap(t)}</span>
                      ) : (
                        <Link key={t} href={`/browse/${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} className="tag">
                          {cap(t)}
                        </Link>
                      ),
                    )}
                  </div>
                )}
              </div>
            </section>

            {shown.length > 0 && (
              <section className="group" aria-labelledby="details-h">
                <h2 id="details-h" className="group-label">Details</h2>
                <div className="group-card">
                  {shown.map(([k, v, href]) =>
                    href ? (
                      <Link key={k} href={href} className="row">
                        <span className="k">{k}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <span className="v">{v}</span>
                          <ChevronRight />
                        </span>
                      </Link>
                    ) : (
                      <div key={k} className="row">
                        <span className="k">{k}</span>
                        <span className="v">{v}</span>
                      </div>
                    ),
                  )}
                </div>
              </section>
            )}

            {links.length > 0 && (
              <section className="group" aria-labelledby="social-h">
                <h2 id="social-h" className="group-label">Find {c.name} on</h2>
                <div className="group-card">
                  {links.map((l) => (
                    <a key={l.key} className="row" href={l.url} target="_blank" rel="nofollow noopener me" data-track="social_click" data-creator={c.slug} data-m-n={l.key}>
                      <span className="k">{l.label}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span className="v">{l.handle}</span>
                        <Arrow />
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        </article>

        {c.clips.length > 0 && (
          <section className="section" aria-labelledby="clips-h">
            <div className="section-head">
              <h2 id="clips-h" className="t-title2">Clips</h2>
              <Link href={`/clips?c=${c.slug}`}>Full screen</Link>
            </div>
            <ClipGrid c={lite} clips={c.clips} />
          </section>
        )}

        {related.length > 0 && (
          <section className="section" aria-labelledby="more-h">
            <div className="section-head">
              <h2 id="more-h" className="t-title2">You might also like</h2>
            </div>
            <div className="grid">
              {related.map((m, i) => (
                <CreatorCard key={m.slug} c={m} index={i} list={`related:${c.slug}`} />
              ))}
            </div>
          </section>
        )}
      </div>
      {!preview && <StickyCta c={lite} avatar={c.photos[0]?.src || ""} sentinelId="main-cta" />}
    </>
  );
}

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
          <div key={`${p.src}-${n}`} aria-roledescription="slide" aria-label={`${n + 1} of ${photos.length}`}>
            <img src={p.src} alt={p.alt || `${name}, photo ${n + 1}`} width={p.w} height={p.h} loading={n === 0 ? "eager" : "lazy"} fetchPriority={n === 0 ? "high" : "auto"} decoding="async" draggable={false} />
          </div>
        ))}
      </div>
      <div className="gallery-fade" aria-hidden />
      <div className="gallery-top">
        <button className="icon-btn float" aria-label="Back" onClick={() => (history.length > 1 ? history.back() : (location.href = "/"))}>
          <ChevronLeft />
        </button>
        <ShareButton name={name} className="icon-btn float" />
      </div>
      {photos.length > 1 && (
        <>
          <button className="icon-btn float gallery-arrow prev" onClick={() => go(i - 1)} aria-label="Previous photo" disabled={i === 0}><ChevronLeft /></button>
          <button className="icon-btn float gallery-arrow next" onClick={() => go(i + 1)} aria-label="Next photo" disabled={i === photos.length - 1}><ChevronRight /></button>
          <div className="pager">
            {photos.map((p, n) => (
              <button key={`${p.src}-${n}`} aria-label={`Show photo ${n + 1}`} aria-current={n === i} onClick={() => go(n)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ShareButton({ name, className = "icon-btn gray", style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <>
      <button
        className={className}
        style={style}
        aria-label={`Share ${name}'s profile`}
        onClick={async () => {
          const url = location.href;
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
      {mounted && createPortal(<div className="toast glass-thick" data-show={copied} role="status">Link copied</div>, document.body)}
    </>
  );
}

export function FollowButton({ c, where, className = "btn btn-primary", children, preview }: { c: Pick<Creator, "slug" | "name" | "free">; where: string; className?: string; children?: React.ReactNode; preview?: boolean }) {
  return (
    <a
      onClick={preview ? (e) => e.preventDefault() : undefined}
      href={preview ? "#" : `/go/${c.slug}?s=${where}`}
      className={className}
      target="_blank"
      rel="nofollow noopener sponsored"
      data-track="follow_click"
      data-creator={c.slug}
      data-m-s={where}
    >
      {children || (
        <>
          {c.free ? `Follow ${c.name} for free` : `Follow ${c.name}`}
          <Arrow />
        </>
      )}
    </a>
  );
}

export function ProfileView({ slug, locked }: { slug: string; locked?: boolean }) {
  useEffect(() => {
    let ref = "";
    try {
      ref = document.referrer ? new URL(document.referrer).pathname.slice(0, 80) : "";
    } catch {}
    track("profile_view", { c: slug, m: { ref, locked: !!locked } });
  }, [slug, locked]);
  return null;
}

export function ClipGrid({ c, clips }: { c: Lite; clips: Clip[] }) {
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

function Lightbox({ c, clip, onClose }: { c: Lite; clip: { src: string; poster?: string }; onClose: () => void }) {
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
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${c.name} clip`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <video
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
      <button className="icon-btn close" onClick={onClose} aria-label="Close">
        <Close />
      </button>
      <div className="lb-cta">
        <FollowButton c={c} where="lightbox" />
      </div>
    </div>,
    document.body,
  );
}

export function StickyCta({ c, avatar, sentinelId }: { c: Lite; avatar: string; sentinelId: string }) {
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
        <span>{c.free ? "Free to follow" : c.tagline}</span>
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
  const q = new URLSearchParams(location.search).get("c");
  return q || location.pathname.split("/").filter(Boolean)[0] || "";
}
function cap(s: string) {
  return s.replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}
