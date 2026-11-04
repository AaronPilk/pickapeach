import Link from "next/link";
import Directory from "@/components/Directory";
import { Footer, JsonLd } from "@/components/Static";
import { allRegions, byRegion, regionLabel, toCard } from "@/lib/creators";
import { breadcrumbs, itemList, pageMeta } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return allRegions().map((r) => ({ region: r.region }));
}

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const place = regionLabel(region);
  return pageMeta({
    title: `Creators from ${place}`,
    description: `Hand-picked creators from ${place} on Pick a Peach. See photos and clips and follow them on their official pages.`,
    path: `/from/${region}`,
  });
}

export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const list = byRegion(region);
  const place = regionLabel(region);
  const others = allRegions().filter((r) => r.region !== region).slice(0, 12);
  return (
    <>
      <JsonLd data={itemList(`Creators from ${place}`, `/from/${region}`, list)} />
      <JsonLd data={breadcrumbs([{ name: "Creators", path: "/" }, { name: place, path: `/from/${region}` }])} />
      <div className="wrap">
        <header className="page-head">
          <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Creators</Link> <span>/</span> <span>{place}</span></nav>
          <h1>Creators from {place}</h1>
          <p className="lede">{list.length} {list.length === 1 ? "creator" : "creators"} who call {place} home.</p>
        </header>
        <Directory cards={list.map(toCard)} regions={allRegions()} list={`region:${region}`} showToolbar={false} showSearch={false} lockedAt={4} />
        <section className="section">
          <div className="section-head"><h2>Other places</h2></div>
          <div className="filter-opts">
            {others.map((r) => <Link key={r.region} href={`/from/${r.region}`} className="chip">{r.label} <span className="count">{r.count}</span></Link>)}
          </div>
        </section>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
