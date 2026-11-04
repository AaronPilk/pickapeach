import creatorsJson from "@data/creators.json";
import type { Creator } from "./types";

export const site = {
  name: "Pick a Peach",
  shortName: "Peach",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://pickapeach.com").replace(/\/$/, ""),
  tagline: "Hand-picked creators, free to follow",
  description:
    "Pick a Peach is a hand-picked directory of independent creators. Browse photos and short clips, find your favorites, and follow them free on their own pages.",
  locale: "en_US",
  themeColor: "#0B1530",
  // Google SafeSearch label. Keep on-site photos and clips non-explicit and leave this off.
  // If explicit media ever goes on the site, set this to true (and talk to a lawyer about state age-verification laws).
  adultRating: false,
  contactEmail: "hello@pickapeach.com",
  // Fire-and-forget conversion pixels (Traffic Junky, etc). {event} and {creator} get replaced.
  // Example: "https://ads.trafficjunky.net/ct?a=XXXX&member_id=YYYY&cb={ts}"
  pixels: {
    follow_click: (process.env.NEXT_PUBLIC_PIXEL_FOLLOW || "").split(" ").filter(Boolean),
    lead_success: (process.env.NEXT_PUBLIC_PIXEL_LEAD || "").split(" ").filter(Boolean),
  },
  gaId: process.env.NEXT_PUBLIC_GA_ID || "",
};

export const creators: Creator[] = (creatorsJson as Creator[])
  .slice()
  .sort((a, b) => (a.featured ?? 999) - (b.featured ?? 999));

// While the roster is still placeholder data, keep search engines out.
export const isPlaceholderRoster = creators.some((c) => c.placeholder);
export const indexable = !isPlaceholderRoster && process.env.NEXT_PUBLIC_NOINDEX !== "1";

export function absUrl(path = "/") {
  if (/^https?:/.test(path)) return path;
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
