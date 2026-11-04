// Client-safe site config (no roster import, so it never bloats the browser bundle).
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
  // Live bar shows real numbers only once they clear these floors (otherwise that part stays hidden).
  live: { nowMin: 20, todayMin: 250 },
};
