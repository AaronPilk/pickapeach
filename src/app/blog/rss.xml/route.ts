import { posts } from "@/lib/blog";
import { absUrl, site } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const items = posts
    .map((p) => `<item><title>${esc(p.title)}</title><link>${absUrl(`/blog/${p.slug}`)}</link><guid>${absUrl(`/blog/${p.slug}`)}</guid><pubDate>${new Date(p.updated + "T12:00:00Z").toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`)
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.name)} Blog</title><link>${absUrl("/blog")}</link><description>${esc(site.description)}</description><language>en-us</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
