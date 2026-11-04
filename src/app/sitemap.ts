import type { MetadataRoute } from "next";
import { allRegions, allTags, creators } from "@/lib/creators";
import { absUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const latest = creators.reduce((d, c) => (c.updatedAt > d ? c.updatedAt : d), "2026-11-04");
  const page = (path: string, priority: number, freq: "daily" | "weekly" | "monthly" = "weekly") => ({ url: absUrl(path), lastModified: latest, changeFrequency: freq, priority });
  return [
    page("/", 1, "daily"),
    page("/new", 0.8, "daily"),
    page("/trending", 0.8, "daily"),
    page("/clips", 0.7, "daily"),
    ...creators.map((c) => ({
      url: absUrl(`/${c.slug}`),
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      images: c.photos.filter((p) => !p.src.endsWith(".svg")).slice(0, 5).map((p) => absUrl(p.src)),
      videos: c.clips.slice(0, 3).map((v, i) => ({
        title: `${c.name} clip ${i + 1}`,
        thumbnail_loc: absUrl(v.poster),
        description: v.caption || c.tagline,
        content_loc: absUrl(v.src),
        duration: v.duration ? Math.round(v.duration) : undefined,
      })),
    })),
    ...allTags().map((t) => page(`/browse/${t.slug}`, 0.6)),
    ...allRegions().map((r) => page(`/from/${r.region}`, 0.6)),
    page("/faq", 0.5, "monthly"),
    page("/about", 0.4, "monthly"),
    page("/apply", 0.4, "monthly"),
    page("/privacy", 0.2, "monthly"),
    page("/terms", 0.2, "monthly"),
  ];
}
