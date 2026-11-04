import type { MetadataRoute } from "next";
import { absUrl, indexable } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: [{ userAgent: "*", disallow: "/" }] };
  const blocked = ["/admin", "/api/", "/go/"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: blocked },
      // AI search + assistant crawlers are welcome: they send referral traffic.
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Perplexity-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "Google-Extended", "Applebot-Extended", "Bingbot"], allow: "/", disallow: blocked },
    ],
    sitemap: absUrl("/sitemap.xml"),
    host: absUrl("/"),
  };
}
