"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clips, Home, Lock, Moon, Peach, Search, Sparkle, Sun, Users } from "./Icons";
import { bootVip, openGate, useVip } from "@/lib/vip";
import { track } from "@/lib/track";

export function Ambient() {
  return (
    <div className="ambient" aria-hidden>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
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

const THEME_COLORS = { light: "#fbf7f0", dark: "#070c1d" };

function currentTheme(): "light" | "dark" {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle({ className = "icon-btn gray" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    setTheme(currentTheme());
    const mq = matchMedia("(prefers-color-scheme: light)");
    const on = () => !document.documentElement.getAttribute("data-theme") && setTheme(currentTheme());
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const flip = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("pp_theme", next);
    } catch {}
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLORS[next]));
    setTheme(next);
    track("theme", { m: { to: next } });
  };
  return (
    <button className={className} onClick={flip} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      {theme === "light" ? <Moon /> : <Sun />}
    </button>
  );
}

const NAV = [
  { href: "/", label: "Discover" },
  { href: "/new", label: "New" },
  { href: "/trending", label: "Trending" },
  { href: "/clips", label: "Clips" },
  { href: "/blog", label: "Blog" },
];

const PAGES = new Set(["/", "/new", "/trending", "/faq", "/about", "/privacy", "/terms", "/apply", "/vip", "/more", "/admin", "/clips", "/blog"]);
export function isProfilePath(path: string) {
  return !PAGES.has(path) && !path.startsWith("/browse") && !path.startsWith("/from") && !path.startsWith("/blog") && path.split("/").filter(Boolean).length === 1;
}

export function Header() {
  const path = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const vip = useVip();
  const q = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bootVip();
    const on = () => setScrolled(scrollY > 4);
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
  const profile = isProfilePath(path) || path === "/more";

  return (
    <header className="header" data-scrolled={scrolled} data-profile={profile}>
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
            className="search header-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const v = q.current?.value.trim() || "";
              track("search", { m: { q: v.slice(0, 60), where: "header" } });
              router.push(v ? `/?q=${encodeURIComponent(v)}#creators` : "/#creators");
            }}
          >
            <Search />
            <input ref={q} type="search" name="q" placeholder="Search" aria-label="Search creators" />
            <kbd>/</kbd>
          </form>
          <ThemeToggle />
          {vip.unlocked ? (
            <Link href="/vip" className="btn btn-sm btn-tinted only-desktop">
              <Sparkle /> Members
            </Link>
          ) : (
            <button className="btn btn-sm btn-primary only-desktop" onClick={() => openGate("header")}>
              <Lock /> See everyone
            </button>
          )}
          <Link href="/?focus=search#creators" className="icon-btn gray only-mobile" aria-label="Search">
            <Search />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Dock() {
  const path = usePathname();
  const vip = useVip();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = scrollY;
    const on = () => {
      const y = scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 300);
      last = y;
    };
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  if (path === "/clips" || path.startsWith("/admin") || path === "/more" || isProfilePath(path)) return null;

  return (
    <nav className="dock glass-thick" data-hidden={hidden} aria-label="Tabs">
      <Link href="/" aria-current={path === "/" ? "page" : undefined}>
        <Home />
        Discover
      </Link>
      <Link href="/clips">
        <Clips />
        Clips
      </Link>
      <Link href="/new" aria-current={path === "/new" ? "page" : undefined}>
        <Sparkle />
        New
      </Link>
      {vip.unlocked ? (
        <Link href="/vip" aria-current={path === "/vip" ? "page" : undefined}>
          <Users />
          Members
        </Link>
      ) : (
        <button onClick={() => openGate("dock")}>
          <Lock />
          Unlock
        </button>
      )}
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
