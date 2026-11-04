// Plain-English names for everything the dashboard shows.

export const CHANNELS: Record<string, { name: string; blurb: string; tint: string }> = {
  paid: { name: "Paid ads", blurb: "Clicks from ads you paid for: Traffic Junky, ExoClick, Google Ads and others.", tint: "linear-gradient(135deg,#ff8a6b,#ff5f6d)" },
  ai: { name: "AI assistants", blurb: "ChatGPT, Perplexity, Claude, Gemini, Copilot and other AI tools that sent people here.", tint: "linear-gradient(135deg,#a78bfa,#6d5dfc)" },
  search: { name: "Google & search", blurb: "Free visits from Google, Bing, DuckDuckGo and other search engines.", tint: "linear-gradient(135deg,#60a5fa,#3b6cf6)" },
  social: { name: "Social media", blurb: "Instagram, TikTok, X, Reddit, Snapchat, Telegram and their apps.", tint: "linear-gradient(135deg,#f472b6,#db2777)" },
  adult: { name: "Adult sites", blurb: "Tube and cam sites that linked here without an ad tag on the link.", tint: "linear-gradient(135deg,#fb7185,#be123c)" },
  creator: { name: "Creator pages", blurb: "OnlyFans, Fansly and similar pages linking back to the site.", tint: "linear-gradient(135deg,#2dd4bf,#0d9488)" },
  email: { name: "Email & texts", blurb: "Links in emails and text messages.", tint: "linear-gradient(135deg,#4ade80,#16a34a)" },
  referral: { name: "Other websites", blurb: "Any other website that linked here. The site's name is shown.", tint: "linear-gradient(135deg,#fbbf24,#d97706)" },
  direct: { name: "Direct / unknown", blurb: "Typed the address, used a bookmark, or came from an app that hides where it came from.", tint: "linear-gradient(135deg,#94a3b8,#64748b)" },
};

export const BOT_REASONS: Record<string, string> = {
  "known crawler": "Known crawlers (Google, Bing and other indexers)",
  "crawler or script": "Scripts, scrapers and link checkers",
  "automated browser": "Automated or headless browsers",
  "datacenter / VPN": "Cloud servers and VPNs (where most ad-fraud bots live)",
  honeypot: "Caught by our hidden bot trap",
  "no browser": "Requests with no browser at all",
  crawler: "Crawlers (from before labels existed)",
};

export const EVENTS: Record<string, string> = {
  page_view: "Viewed a page",
  go: "Tapped Follow → went to her page",
  follow_click: "Tapped Follow",
  profile_view: "Opened a profile",
  clip_view: "Watched a clip",
  video_play: "Played a video",
  social_click: "Tapped a social link",
  lead_submit: "Sent the unlock form",
  lead_success: "Unlocked hidden girls",
  lead_error: "Unlock form error",
  gate_open: "Opened the unlock screen",
  gate_close: "Closed the unlock screen",
  search: "Searched",
  filter: "Used a filter",
  sort: "Changed the sort",
  engage: "Started browsing",
  consent: "Made a cookie choice",
  age_gate_view: "Saw the 18+ check",
  age_gate_pass: "Confirmed 18+",
  age_gate_leave: "Left at the 18+ check",
  photo_view: "Swiped photos",
  card_swipe: "Swiped a card",
  like: "Liked a clip",
  share: "Shared",
  creator_signup: "Creator signed up",
  creator_login: "Creator logged in",
  theme: "Switched light/dark",
};

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
export const fmt = (n: number | null | undefined) => (Number(n) || 0).toLocaleString();
export const fmtPct = (a: number, b: number) => (b > 0 ? `${pct(a, b)}%` : "—");

export function greeting(name?: string) {
  const h = new Date().getHours();
  const part = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name.split(" ")[0]}` : part;
}
