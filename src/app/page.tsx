import Link from "next/link";
import Directory from "@/components/Directory";
import ClipRail from "@/components/ClipRail";
import MembersTeaser from "@/components/MembersTeaser";
import LiveBar from "@/components/LiveBar";
import { Footer, JsonLd } from "@/components/Static";
import { allRegions, creators, toCard, allTags } from "@/lib/creators";
import { FAQS, faqGraph, itemList, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { posts } from "@/lib/blog";

export const metadata = pageMeta({
  title: `${site.name} · Hand-picked creators, free to follow`,
  description: site.description,
  path: "/",
});

export default function Home() {
  const cards = creators.map(toCard);
  const regions = allRegions().map(({ region, label }) => ({ region, label }));
  const tags = allTags().slice(0, 12);
  // Stand-in art for the members teaser: blurred, generic, never a member's real photo.
  const art = ["/media/ui/vip-blur-1.svg", "/media/ui/vip-blur-2.svg", "/media/ui/vip-blur-3.svg", "/media/ui/vip-blur-1.svg"];
  return (
    <>
      <JsonLd data={itemList(`${site.name} creators`, "/", creators)} />
      <JsonLd data={faqGraph(FAQS.slice(0, 4))} />
      <div className="wrap">
        <section className="hero">
          <LiveBar creatorCount={creators.length} />
          <h1 className="t-large">
            Find your new <em>favorite</em>
          </h1>
          <p className="c2">Hand-picked creators with photos, clips and a direct link to follow. Most pages are free.</p>
        </section>

        <section aria-label="Creators">
          <Directory cards={cards} regions={regions} list="home" />
        </section>

        <MembersTeaser art={art} />

        <section className="section">
          <div className="section-head">
            <h2 className="t-title2">Latest clips</h2>
            <Link href="/clips">See all</Link>
          </div>
          <ClipRail creators={creators} />
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="t-title2">Browse by vibe</h2>
          </div>
          <div className="filter-opts">
            {tags.map((t) => (
              <Link key={t.slug} href={`/browse/${t.slug}`} className="chip">
                {t.tag.replace(/(^|\s)\w/g, (m) => m.toUpperCase())} <span className="count">{t.count}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="faq-h">
          <div className="section-head">
            <h2 id="faq-h" className="t-title2">Good to know</h2>
            <Link href="/faq">All questions</Link>
          </div>
          <div className="faq">
            {FAQS.slice(0, 4).map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="t-title2">From the blog</h2>
            <Link href="/blog">All guides</Link>
          </div>
          <BlogTeaser />
        </section>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}

function BlogTeaser() {
  return (
    <div className="post-list">
      {posts.slice(0, 3).map((p) => (
        <Link key={p.slug} href={`/blog/${p.slug}`} className="post-row">
          <span className="t-headline">{p.title}</span>
          <span className="t-foot c2">{p.readMins} min read</span>
        </Link>
      ))}
    </div>
  );
}
