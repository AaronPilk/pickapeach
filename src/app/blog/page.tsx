import Link from "next/link";
import { Footer, JsonLd } from "@/components/Static";
import { ChevronRight } from "@/components/Icons";
import { posts } from "@/lib/blog";
import { breadcrumbs, pageMeta } from "@/lib/seo";
import { absUrl, site } from "@/lib/site";

export const metadata = pageMeta({
  title: "Blog: guides and top picks",
  description: "Straight answers about finding creators, free vs paid pages, privacy, spotting fakes and staying on budget, plus our top picks by vibe and city.",
  path: "/blog",
});

export default function BlogIndex() {
  const guides = posts.filter((p) => p.kind === "guide");
  const picks = posts.filter((p) => p.kind === "picks");
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": absUrl("/blog"),
          name: `${site.name} Blog`,
          url: absUrl("/blog"),
          publisher: { "@id": absUrl("/#org") },
          blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: absUrl(`/blog/${p.slug}`), datePublished: p.published, dateModified: p.updated })),
        }}
      />
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])} />
      <div className="wrap">
        <header className="page-head">
          <h1 className="t-large">Blog</h1>
          <p className="lede">Straight answers for fans, plus our top picks by vibe and city.</p>
        </header>

        <section className="section" aria-labelledby="guides-h">
          <h2 id="guides-h" className="group-label" style={{ padding: "0 4px 8px" }}>Guides</h2>
          <div className="post-list">
            {guides.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="post-row">
                <span style={{ minWidth: 0 }}>
                  <span className="t-headline" style={{ display: "block" }}>{p.title}</span>
                  <span className="t-foot c2" style={{ display: "block", marginTop: 2 }}>{p.dek}</span>
                </span>
                <ChevronRight />
              </Link>
            ))}
          </div>
        </section>

        {picks.length > 0 && (
          <section className="section" aria-labelledby="picks-h">
            <h2 id="picks-h" className="group-label" style={{ padding: "0 4px 8px" }}>Top picks</h2>
            <div className="post-list">
              {picks.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="post-row">
                  <span style={{ minWidth: 0 }}>
                    <span className="t-headline" style={{ display: "block" }}>{p.title}</span>
                    <span className="t-foot c2" style={{ display: "block", marginTop: 2 }}>{p.picks?.length} creators · updated {fmtDate(p.updated)}</span>
                  </span>
                  <ChevronRight />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
