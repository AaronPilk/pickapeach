import Link from "next/link";
import Directory from "@/components/Directory";
import ClipRail from "@/components/ClipRail";
import { Footer, JsonLd } from "@/components/Static";
import { allRegions, creators, toCard, allTags } from "@/lib/creators";
import { FAQS, faqGraph, itemList, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({
  title: `${site.name} · Hand-picked creators, free to follow`,
  description: site.description,
  path: "/",
});

export default function Home() {
  const cards = creators.map(toCard);
  const regions = allRegions().map(({ region, label }) => ({ region, label }));
  const tags = allTags().slice(0, 12);
  return (
    <>
      <JsonLd data={itemList(`${site.name} creators`, "/", creators)} />
      <JsonLd data={faqGraph(FAQS.slice(0, 4))} />
      <div className="wrap">
        <section className="hero">
          <h1>
            Find your new <em>favorite.</em>
          </h1>
          <p>Hand-picked creators with photos, clips and a direct link to follow. Most pages are free.</p>
        </section>

        <section className="section" style={{ paddingTop: 10 }} aria-label="Creators">
          <Directory cards={cards} regions={regions} list="home" />
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Latest clips</h2>
            <Link href="/clips">Watch all</Link>
          </div>
          <ClipRail creators={creators} />
        </section>

        <section className="section">
          <div className="section-head">
            <h2>Browse by vibe</h2>
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
            <h2 id="faq-h">Good to know</h2>
            <Link href="/faq">All questions</Link>
          </div>
          <div className="faq">
            {FAQS.slice(0, 4).map((f) => (
              <details key={f.q} className="pane">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
