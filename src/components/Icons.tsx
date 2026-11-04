import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };

export const Peach = (p: P) => (
  <svg viewBox="0 0 32 32" aria-hidden {...p}>
    <defs>
      <radialGradient id="pk" cx="38%" cy="38%" r="70%">
        <stop offset="0" stopColor="#FFC2A8" />
        <stop offset=".55" stopColor="#FF7A63" />
        <stop offset="1" stopColor="#E8473A" />
      </radialGradient>
      <linearGradient id="lf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F7EEDC" />
        <stop offset="1" stopColor="#D9CAA9" />
      </linearGradient>
    </defs>
    <path d="M16 9.2c-5.6-2.4-11.2 1.4-11.2 8 0 6 5 10.6 11.2 10.6S27.2 23.2 27.2 17.2c0-6.6-5.6-10.4-11.2-8z" fill="url(#pk)" />
    <path d="M16 9.6c-.9 3.2-.9 9.6.4 17.6" stroke="#C93A2E" strokeOpacity=".45" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M16.4 9.4c.6-3.4 3.6-5.8 7.6-5.6-.6 3.6-3.6 5.8-7.6 5.6z" fill="url(#lf)" />
    <ellipse cx="10.6" cy="14.6" rx="2.6" ry="1.6" fill="#fff" fillOpacity=".35" transform="rotate(-30 10.6 14.6)" />
  </svg>
);

export const Search = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const Sliders = (p: P) => (<svg {...base} {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>);
export const Home = (p: P) => (<svg {...base} {...p}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>);
export const Play = (p: P) => (<svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...p}><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>);
export const Pause = (p: P) => (<svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...p}><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></svg>);
export const Clips = (p: P) => (<svg {...base} {...p}><rect x="5" y="3" width="14" height="18" rx="4" /><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor" stroke="none" /></svg>);
export const Lock = (p: P) => (<svg {...base} {...p}><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>);
export const Unlock = (p: P) => (<svg {...base} {...p}><rect x="5" y="10.5" width="14" height="10" rx="3" /><path d="M8 10.5V8a4 4 0 0 1 7.6-1.7" /></svg>);
export const Sparkle = (p: P) => (<svg viewBox="0 0 24 24" aria-hidden fill="currentColor" {...p}><path d="M12 2.5c.5 4.6 2.4 6.9 7 7.5-4.6.6-6.5 2.9-7 7.5-.5-4.6-2.4-6.9-7-7.5 4.6-.6 6.5-2.9 7-7.5zM19 15c.25 1.9 1 2.8 2.9 3-1.9.25-2.65 1.1-2.9 3-.25-1.9-1-2.75-2.9-3 1.9-.2 2.65-1.1 2.9-3z" /></svg>);
export const Arrow = (p: P) => (<svg {...base} {...p}><path d="M7 17 17 7M9 7h8v8" /></svg>);
export const ChevronLeft = (p: P) => (<svg {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>);
export const ChevronRight = (p: P) => (<svg {...base} {...p}><path d="m9 18 6-6-6-6" /></svg>);
export const Close = (p: P) => (<svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const Heart = (p: P) => (<svg {...base} {...p}><path d="M12 20s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20z" /></svg>);
export const Share = (p: P) => (<svg {...base} {...p}><path d="M12 15V4M8 8l4-4 4 4" /><path d="M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12" /></svg>);
export const Sound = (p: P) => (<svg {...base} {...p}><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></svg>);
export const Muted = (p: P) => (<svg {...base} {...p}><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></svg>);
export const Check = (p: P) => (<svg {...base} strokeWidth={2.6} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);
export const Pin = (p: P) => (<svg {...base} {...p}><path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>);
export const Camera = (p: P) => (<svg {...base} {...p}><rect x="3.5" y="6.5" width="17" height="13" rx="4" /><circle cx="12" cy="13" r="3.4" /><path d="M8.5 6.5 10 4h4l1.5 2.5" /></svg>);
export const Grid = (p: P) => (<svg {...base} {...p}><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>);
export const Flame = (p: P) => (<svg {...base} {...p}><path d="M12 21c-3.6 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.6-8.3.4 1.8 1.4 2.9 2.4 3.4 0-2.8 1.3-5.6 3.4-7.4.1 3.5 3.6 5.6 3.6 10.6 0 4.6-3 7.9-6.5 7.9z" /></svg>);
export const Bolt = (p: P) => (<svg {...base} {...p}><path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" /></svg>);

// Neutral platform badges: a monogram tile + the platform's name as text.
const mono: Record<string, string> = { instagram: "IG", tiktok: "TT", x: "X", snapchat: "SC", reddit: "R", threads: "TH", youtube: "YT", telegram: "TG" };
export function SocialMark({ k }: { k: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden width="20" height="20">
      <rect x="1" y="1" width="22" height="22" rx="7" fill="rgba(255,250,241,0.12)" stroke="rgba(255,250,241,0.25)" />
      <text x="12" y="15.6" textAnchor="middle" fontSize={mono[k]?.length > 1 ? 9 : 11} fontWeight={750} fill="currentColor" fontFamily="-apple-system,Helvetica,Arial,sans-serif">
        {mono[k] || "•"}
      </text>
    </svg>
  );
}
