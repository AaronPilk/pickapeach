import Link from "next/link";
import Directory from "@/components/Directory";
import { Footer, JsonLd, cap } from "@/components/Static";
import { allRegions, allTags, byTagSlug, toCard } from "@/lib/creators";
import { breadcrumbs, itemList, pageMeta } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return allTags().map((t) => ({ tag: t.slug }));
}

function label(tag: string) {
  return cap(allTags().find((t) => t.slug === tag)?.tag || tag.replace(/-/g, " "));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const n = byTagSlug(tag).length;
  return pageMeta({
    title: `${label(tag)} creators`,
    description: `${n} hand-picked ${label(tag).toLowerCase()} creators on Pick a Peach. Browse photos and clips, then follow your favorites on their own pages.`,
    path: `/browse/${tag}`,
  });
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const list = byTagSlug(tag);
  const name = label(tag);
  const others = allTags().filter((t) => t.slug !== tag).slice(0, 10);
  return (
    <>
      <JsonLd data={itemList(`${name} creators`, `/browse/${tag}`, list)} />
      <JsonLd data={breadcrumbs([{ name: "Creators", path: "/" }, { name, path: `/browse/${tag}` }])} />
      <div className="wrap">
        <header className="page-head">
          <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Creators</Link> <span>/</span> <span>{name}</span></nav>
          <h1 className="t-large">{name} creators</h1>
          <p className="lede">
            {list.length} {name.toLowerCase()} {list.length === 1 ? "creator" : "creators"} we think you&apos;ll like. Every profile has photos, clips and a direct link to her page.
          </p>
        </header>
        <Directory cards={list.map(toCard)} regions={allRegions()} list={`tag:${tag}`} showToolbar={false} showSearch={false} lockedAt={4} />
        <section className="section">
          <div className="section-head"><h2 className="t-title2">More vibes</h2></div>
          <div className="filter-opts">
            {others.map((t) => <Link key={t.slug} href={`/browse/${t.slug}`} className="chip">{cap(t.tag)} <span className="count">{t.count}</span></Link>)}
          </div>
        </section>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
