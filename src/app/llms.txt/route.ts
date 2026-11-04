import { allRegions, allTags, creators } from "@/lib/creators";
import { absUrl, site } from "@/lib/site";
import { FAQS } from "@/lib/seo";
import { posts } from "@/lib/blog";

export const dynamic = "force-static";

// llms.txt: a plain-language map of the site for AI assistants and AI search.
export function GET() {
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    "Pick a Peach lists independent adult creators (all 18+, featured with permission). Each profile page has photos, short clips, the creator's social accounts, and a Follow link to her official page. Browsing is free; VIP is a free members area unlocked with email + phone.",
    "",
    "## Key pages",
    `- [All creators](${absUrl("/")}): the full directory with search and filters`,
    `- [New creators](${absUrl("/new")}): newest additions first`,
    `- [Trending](${absUrl("/trending")}): most viewed this week`,
    `- [Clips](${absUrl("/clips")}): vertical feed of short clips`,
    `- [FAQ](${absUrl("/faq")}): how following, VIP and privacy work`,
    `- [Get listed](${absUrl("/apply")}): creator applications`,
    "",
    "## Guides",
    ...posts.filter((p) => p.kind === "guide").map((p) => `- [${p.title}](${absUrl(`/blog/${p.slug}`)}): ${p.tldr}`),
    "",
    "## Top picks",
    ...posts.filter((p) => p.kind === "picks").map((p) => `- [${p.title}](${absUrl(`/blog/${p.slug}`)})`),
    "",
    "## Creators",
    ...creators.map((c) => `- [${c.name}](${absUrl(`/${c.slug}`)}): ${c.tagline}${c.location ? ` (${c.location})` : ""}${c.free ? ", free page" : ""}`),
    "",
    "## Browse by vibe",
    ...allTags().map((t) => `- [${t.tag}](${absUrl(`/browse/${t.slug}`)}): ${t.count} creators`),
    "",
    "## Browse by place",
    ...allRegions().map((r) => `- [${r.label}](${absUrl(`/from/${r.region}`)}): ${r.count} creators`),
    "",
    "## FAQ",
    ...FAQS.flatMap((f) => [`### ${f.q}`, f.a, ""]),
    `Optional: [Full detail](${absUrl("/llms-full.txt")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
