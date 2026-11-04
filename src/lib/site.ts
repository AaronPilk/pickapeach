import creatorsJson from "@data/creators.json";
import selfServeJson from "@data/self-serve.json";
import type { Creator } from "./types";
import { mergeRoster } from "./roster";

import { site } from "./config";
export { site };


// Agency roster (from the sheet) + creator-submitted profiles the owners approved.
export const creators: Creator[] = mergeRoster(creatorsJson as Creator[], selfServeJson as Creator[]).sort(
  (a, b) => (a.featured ?? 999) - (b.featured ?? 999),
);

// While the roster is still placeholder data, keep search engines out.
export const isPlaceholderRoster = creators.some((c) => c.placeholder);
export const indexable = !isPlaceholderRoster && process.env.NEXT_PUBLIC_NOINDEX !== "1";

export function absUrl(path = "/") {
  if (/^https?:/.test(path)) return path;
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
