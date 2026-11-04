import { creators } from "./site";
import type { Creator, Socials } from "./types";

export { creators };

export function getCreator(slug: string) {
  return creators.find((c) => c.slug === slug);
}

export function titleCase(s: string) {
  return s.replace(/(^|[\s-])(\w)/g, (_, a, b) => `${a === "-" ? " " : a}${b.toUpperCase()}`);
}

export function regionLabel(region: string) {
  const special: Record<string, string> = { "washington-dc": "Washington, D.C." };
  return special[region] || titleCase(region);
}

// Tag pages need at least this many creators so they aren't thin.
const MIN_PER_PAGE = 1;

export function allTags() {
  const counts = new Map<string, number>();
  for (const c of creators) for (const t of c.tags) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n >= MIN_PER_PAGE)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, slug: tagSlug(tag), count }));
}

export function tagSlug(tag: string) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function byTagSlug(slug: string) {
  return creators.filter((c) => c.tags.some((t) => tagSlug(t) === slug));
}

export function allRegions() {
  const counts = new Map<string, number>();
  for (const c of creators) if (c.region) counts.set(c.region, (counts.get(c.region) || 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n >= MIN_PER_PAGE)
    .sort((a, b) => b[1] - a[1])
    .map(([region, count]) => ({ region, label: regionLabel(region), count }));
}

export function byRegion(region: string) {
  return creators.filter((c) => c.region === region);
}

export function newest(list: Creator[] = creators) {
  return list.slice().sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function trending(list: Creator[] = creators) {
  const score = (c: Creator) => (c.badge === "trending" ? 3 : c.badge === "hot" ? 2 : 0) + (c.clips.length > 0 ? 1 : 0) - (c.featured ?? 0) / 100;
  return list.slice().sort((a, b) => score(b) - score(a));
}

export function related(c: Creator, n = 8) {
  return creators
    .filter((o) => o.slug !== c.slug)
    .map((o) => ({ o, s: o.tags.filter((t) => c.tags.includes(t)).length + (o.region === c.region ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.o);
}

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

export function socialLinks(c: Creator) {
  return (Object.keys(socialMeta) as (keyof Socials)[])
    .filter((k) => c.socials[k])
    .map((k) => {
      const v = c.socials[k]!;
      return { key: k, label: socialMeta[k].label, url: /^https?:/.test(v) ? v : socialMeta[k].url(v) };
    });
}

// Light payload for client-side grids (keeps the JS bundle small).
export type CardData = Pick<Creator, "slug" | "name" | "tagline" | "age" | "location" | "region" | "height" | "hair" | "eyes" | "tags" | "free" | "badge" | "addedAt" | "featured"> & {
  photos: { src: string; w: number; h: number }[];
  clipCount: number;
  cover: string;
};

export function toCard(c: Creator): CardData {
  return {
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    age: c.age,
    location: c.location,
    region: c.region,
    height: c.height,
    hair: c.hair,
    eyes: c.eyes,
    tags: c.tags,
    free: c.free,
    badge: c.badge,
    addedAt: c.addedAt,
    featured: c.featured,
    photos: c.photos.slice(0, 4).map(({ src, w, h }) => ({ src, w, h })),
    clipCount: c.clips.length,
    cover: c.photos[0]?.src || "",
  };
}
