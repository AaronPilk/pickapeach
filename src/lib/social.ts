import type { Creator, Socials } from "./types";

export const socialMeta: Record<keyof Socials, { label: string; url: (h: string) => string }> = {
  instagram: { label: "Instagram", url: (h) => `https://instagram.com/${h}` },
  tiktok: { label: "TikTok", url: (h) => `https://www.tiktok.com/@${h}` },
  x: { label: "X", url: (h) => `https://x.com/${h}` },
  snapchat: { label: "Snapchat", url: (h) => `https://www.snapchat.com/add/${h}` },
  reddit: { label: "Reddit", url: (h) => `https://www.reddit.com/${h.startsWith("u/") ? h : `user/${h}`}` },
  threads: { label: "Threads", url: (h) => `https://www.threads.net/@${h}` },
  youtube: { label: "YouTube", url: (h) => `https://www.youtube.com/@${h}` },
  telegram: { label: "Telegram", url: (h) => `https://t.me/${h}` },
};

export function socialLinks(c: Pick<Creator, "socials">) {
  const s = c.socials || {};
  return (Object.keys(socialMeta) as (keyof Socials)[])
    .filter((k) => s[k])
    .map((k) => {
      const v = s[k]!;
      const isUrl = /^https?:/.test(v);
      return { key: k, label: socialMeta[k].label, url: isUrl ? v : socialMeta[k].url(v), handle: isUrl ? "" : v.startsWith("u/") ? v : `@${v}` };
    });
}
