import { creators, socialLinks } from "@/lib/creators";
import { absUrl, site } from "@/lib/site";

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
  return new Response(out.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
