import Link from "next/link";
import type { Creator } from "@/lib/types";
import { Play } from "./Icons";

export default function ClipRail({ creators }: { creators: Creator[] }) {
  const items = creators.filter((c) => c.clips.length).slice(0, 12);
  if (!items.length) return null;
  return (
    <div className="rail" aria-label="Latest clips">
      {items.map((c) => (
        <Link key={c.slug} href={`/clips?c=${c.slug}`} className="rail-item" data-track="rail_click" data-creator={c.slug}>
          <img src={c.clips[0].poster} alt={`${c.name} clip`} loading="lazy" decoding="async" />
          <span className="play-pill"><Play /> {c.clips.length}</span>
          <span className="rail-name">
            <img src={c.photos[0]?.src} alt="" />
            {c.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
