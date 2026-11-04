"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/track";
import { ChevronLeft, Heart, Muted, Pause, Play, Share, Sound, Arrow } from "./Icons";

export type FeedItem = { slug: string; name: string; avatar: string; free: boolean; src: string; poster: string; caption?: string; i: number };

// Full-screen vertical clip feed. One clip plays at a time; the rest stay paused.
export default function ClipsFeed({ items }: { items: FeedItem[] }) {
  const [only, setOnly] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [current, setCurrent] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const feed = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setOnly(p.get("c"));
    try {
      setLiked(JSON.parse(localStorage.getItem("pp_likes") || "{}"));
    } catch {}
  }, []);

  const list = useMemo(() => {
    if (!only) return items;
    const mine = items.filter((x) => x.slug === only);
    return [...mine, ...items.filter((x) => x.slug !== only)];
  }, [items, only]);

  useEffect(() => {
    const root = feed.current;
    if (!root) return;
    const vids = [...root.querySelectorAll<HTMLVideoElement>("video")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (e.intersectionRatio > 0.6) {
            v.play().catch(() => {});
            const idx = Number(v.dataset.idx);
            setCurrent(idx);
            const it = list[idx];
            if (it) track("clip_view", { c: it.slug, m: { i: idx, src: it.src.split("/").pop() || "" } });
          } else {
            v.pause();
          }
        }
      },
      { root, threshold: [0, 0.6, 1] },
    );
    vids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [list]);

  useEffect(() => {
    feed.current?.querySelectorAll("video").forEach((v) => (v.muted = muted));
  }, [muted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const root = feed.current!;
      root.scrollBy({ top: (e.key === "ArrowDown" ? 1 : -1) * root.clientHeight, behavior: "smooth" });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const like = (key: string, slug: string) => {
    const next = { ...liked, [key]: !liked[key] };
    setLiked(next);
    try {
      localStorage.setItem("pp_likes", JSON.stringify(next));
    } catch {}
    if (next[key]) track("like", { c: slug });
  };

  return (
    <>
      <div className="feed-top">
        <Link href="/" className="icon-btn" aria-label="Back to creators">
          <ChevronLeft />
        </Link>
        <span className="feed-title">Clips</span>
        <button className="icon-btn" onClick={() => { setMuted(!muted); track(muted ? "unmute" : "mute"); }} aria-label={muted ? "Turn sound on" : "Mute"}>
          {muted ? <Muted /> : <Sound />}
        </button>
      </div>
      <div className="feed" ref={feed}>
        {list.map((it, idx) => (
          <Slide key={`${it.slug}-${it.i}`} it={it} idx={idx} near={Math.abs(idx - current) <= 2} muted={muted} liked={!!liked[`${it.slug}-${it.i}`]} onLike={() => like(`${it.slug}-${it.i}`, it.slug)} />
        ))}
      </div>
    </>
  );
}

function Slide({ it, idx, near, muted, liked, onLike }: { it: FeedItem; idx: number; near: boolean; muted: boolean; liked: boolean; onLike: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const video = v.current;
    if (!video) return;
    let raf = 0;
    const loop = () => {
      if (bar.current && video.duration) bar.current.style.transform = `scaleX(${video.currentTime / video.duration})`;
      raf = requestAnimationFrame(loop);
    };
    const onPlay = () => { setPaused(false); raf = requestAnimationFrame(loop); };
    const onPause = () => { cancelAnimationFrame(raf); };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = () => {
    const video = v.current!;
    if (video.paused) { video.play().catch(() => {}); setPaused(false); }
    else { video.pause(); setPaused(true); }
    setHint(true);
    setTimeout(() => setHint(false), 500);
  };

  return (
    <section className="slide" aria-label={`${it.name}, clip`}>
      <div className="slide-bg" style={{ backgroundImage: `url(${it.poster})` }} />
      <video
        ref={v}
        data-idx={idx}
        src={near ? it.src : undefined}
        poster={it.poster}
        muted={muted}
        playsInline
        loop
        preload={near ? "auto" : "none"}
        onClick={toggle}
      />
      <div className="slide-scrim" />
      {hint && <div className="tap-hint">{paused ? <Pause /> : <Play />}</div>}
      <div className="slide-info">
        <Link href={`/${it.slug}`} className="who" data-track="feed_profile" data-creator={it.slug}>
          {it.name} <small>· view profile</small>
        </Link>
        {it.caption && <p>{it.caption}</p>}
        <a
          href={`/go/${it.slug}?s=feed&from=%2Fclips`}
          className="btn btn-coral"
          target="_blank"
          rel="nofollow noopener sponsored"
          data-track="follow_click"
          data-creator={it.slug}
          data-m-s="feed"
        >
          Follow {it.name} {it.free ? "free" : ""} <Arrow />
        </a>
      </div>
      <div className="slide-rail">
        <Link href={`/${it.slug}`} className="av" aria-label={`${it.name}'s profile`}>
          <img src={it.avatar} alt="" />
        </Link>
        <button className={`icon-btn ${liked ? "liked" : ""}`} onClick={onLike} aria-label="Like" aria-pressed={liked}>
          <Heart />
        </button>
        <button
          className="icon-btn"
          aria-label="Share"
          onClick={async () => {
            const url = `${location.origin}/${it.slug}`;
            track("share", { c: it.slug, m: { where: "feed" } });
            try {
              if (navigator.share) await navigator.share({ title: `${it.name} on Pick a Peach`, url });
              else await navigator.clipboard.writeText(url);
            } catch {}
          }}
        >
          <Share />
        </button>
      </div>
      <div className="feed-progress"><i ref={bar} /></div>
    </section>
  );
}
