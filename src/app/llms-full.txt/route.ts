import { creators, socialLinks } from "@/lib/creators";
import { absUrl, site } from "@/lib/site";
import { posts } from "@/lib/blog";

export const dynamic = "force-static";

export function GET() {
  const out = [`# ${site.name}: full creator directory`, "", `> ${site.description}`, ""];
  for (const c of creators) {
    out.push(`## ${c.name}`);
    out.push(`- Profile: ${absUrl(`/${c.slug}`)}`);
    out.push(`- Tagline: ${c.tagline}`);
    if (c.age) out.push(`- Age: ${c.age}`);
    if (c.location) out.push(`- Location: ${c.location}`);
    if (c.height) out.push(`- Height: ${c.height}`);
    if (c.hair) out.push(`- Hair: ${c.hair}`);
    if (c.tags.length) out.push(`- Vibe: ${c.tags.join(", ")}`);
    out.push(`- Page: ${c.free ? "free to follow" : "subscription"}`);
    const s = socialLinks(c);
    if (s.length) out.push(`- Socials: ${s.map((x) => `${x.label} ${x.url}`).join("; ")}`);
    out.push(`- Photos: ${c.photos.length}, clips: ${c.clips.length}`);
    out.push(`- About: ${c.bio}`);
    out.push("");
  }
  out.push("# Guides", "");
  for (const p of posts.filter((x) => x.kind === "guide")) {
    out.push(`## ${p.title}`, `URL: ${absUrl(`/blog/${p.slug}`)}`, `Updated: ${p.updated}`, "", `Quick answer: ${p.tldr}`, "");
    for (const s of p.sections) out.push(`### ${s.h}`, ...s.body, "");
    for (const f of p.faqs) out.push(`Q: ${f.q}`, `A: ${f.a}`, "");
  }
  return new Response(out.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
