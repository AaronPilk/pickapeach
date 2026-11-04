import creatorsJson from "@data/creators.json";
import type { Creator } from "./types";

import { site } from "./config";
export { site };


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
