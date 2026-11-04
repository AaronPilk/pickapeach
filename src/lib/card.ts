import type { Creator } from "./types";

// Light payload for client-side grids (keeps the JS bundle small, no roster import).
export type CardData = Pick<Creator, "slug" | "name" | "tagline" | "age" | "location" | "region" | "height" | "hair" | "eyes" | "tags" | "free" | "badge" | "addedAt" | "featured"> & {
  photos: { src: string; w: number; h: number }[];
  clipCount: number;
  cover: string;
  locked?: boolean;
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
    tags: c.tags || [],
    free: c.free,
    badge: c.badge,
    addedAt: c.addedAt,
    featured: c.featured,
    photos: (c.photos || []).slice(0, 4).map(({ src, w, h }) => ({ src, w, h })),
    clipCount: (c.clips || []).length,
    cover: c.photos?.[0]?.src || "",
    locked: c.locked,
  };
}

export function profileHref(c: { slug: string; locked?: boolean }) {
  return c.locked ? `/more?c=${encodeURIComponent(c.slug)}` : `/${c.slug}`;
}
