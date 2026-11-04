"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clips, Home, Lock, Peach, Search, Sparkle, Unlock } from "./Icons";
import { bootVip, openGate, useVip } from "@/lib/vip";
import { track } from "@/lib/track";

export function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="grain" />
    </div>
  );
}

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Pick a Peach home">
      <Peach />
      <span>
        pick a <b>peach</b>
      </span>
    </Link>
  );
}

const NAV = [
  { href: "/", label: "Discover" },
  { href: "/new", label: "New" },
  { href: "/trending", label: "Trending" },
  { href: "/clips", label: "Clips" },
];

export function Header() {
  const path = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const vip = useVip();
  const q = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bootVip();
    const on = () => setScrolled(scrollY > 8);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement).closest("input,textarea")) {
        e.preventDefault();
        q.current?.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  if (path === "/clips" || path.startsWith("/admin")) return null;
  const isProfile = !PAGES.has(path) && !path.startsWith("/browse") && !path.startsWith("/from") && path.split("/").filter(Boolean).length === 1;

  return (
    <header className="header" data-scrolled={scrolled} data-profile={isProfile}>
      <div className="header-surface" />
      <div className="wrap header-bar">
        <Logo />
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <form
            className="search glass header-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const v = q.current?.value.trim() || "";
              track("search", { m: { q: v.slice(0, 60), where: "header" } });
              router.push(v ? `/?q=${encodeURIComponent(v)}#creators` : "/#creators");
            }}
          >
            <Search />
            <input ref={q} type="search" name="q" placeholder="Search creators" aria-label="Search creators" />
            <kbd>/</kbd>
          </form>
          <button
            className="btn btn-sm btn-glass only-desktop"
            onClick={() => openGate("header")}
            style={vip.unlocked ? { color: "var(--coral-300)" } : undefined}
          >
            {vip.unlocked ? <Sparkle /> : <Lock />}
            {vip.unlocked ? "VIP unlocked" : "Unlock VIP"}
          </button>
          <Link href="/?focus=search#creators" className="icon-btn btn-glass only-mobile" aria-label="Search">
            <Search />
          </Link>
        </div>
      </div>
    </header>
  );
}

const PAGES = new Set(["/", "/new", "/trending", "/faq", "/about", "/privacy", "/terms", "/apply", "/vip"]);

export function Dock() {
  const path = usePathname();
  const vip = useVip();
  const [hidden, setHidden] = useState(false);
  const isProfile = !PAGES.has(path) && !path.startsWith("/browse") && !path.startsWith("/from") && path.split("/").filter(Boolean).length === 1;

  useEffect(() => {
    let last = scrollY;
    const on = () => {
      const y = scrollY;
      if (Math.abs(y - last) < 6) return;
      setHidden(y > last && y > 240);
      last = y;
    };
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  if (path === "/clips" || path.startsWith("/admin") || isProfile) return null;

  return (
    <nav className="dock glass-thick" data-hidden={hidden} aria-label="Quick">
      <Link href="/" aria-current={path === "/" ? "page" : undefined}>
        <Home />
        Discover
      </Link>
      <Link href="/clips" aria-current={path === "/clips" ? "page" : undefined}>
        <Clips />
        Clips
      </Link>
      <Link href="/new" aria-current={path === "/new" ? "page" : undefined}>
        <Sparkle />
        New
      </Link>
      <button className="dock-vip" data-unlocked={vip.unlocked} onClick={() => openGate("dock")}>
        {vip.unlocked ? <Unlock /> : <Lock />}
        VIP
      </button>
    </nav>
  );
}

// Adds `.in` to `.reveal` elements as they scroll into view (staggered via --i).
export function Reveal() {
  const path = usePathname();
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -4% 0px", threshold: 0 },
    );
    const scan = () => document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [path]);
  return null;
}
