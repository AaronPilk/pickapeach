import ClipsFeed, { type FeedItem } from "@/components/ClipsFeed";
import { creators } from "@/lib/creators";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Clips",
  description: "Short clips from every creator on Pick a Peach. Swipe through, find someone you like, and follow her in one tap.",
  path: "/clips",
});

export default function ClipsPage() {
  // Interleave creators so the feed doesn't show the same girl three times in a row.
  const items: FeedItem[] = [];
  const max = Math.max(0, ...creators.map((c) => c.clips.length));
  for (let round = 0; round < max; round++) {
    for (const c of creators) {
      const clip = c.clips[round];
      if (clip) items.push({ slug: c.slug, name: c.name, avatar: c.photos[0]?.src || clip.poster, free: c.free, src: clip.src, poster: clip.poster, caption: clip.caption, i: round });
    }
  }
  return (
    <>
      <h1 className="sr-only">Clips from Pick a Peach creators</h1>
      <ClipsFeed items={items} />
    </>
  );
}
