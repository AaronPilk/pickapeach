import Directory from "@/components/Directory";
import { Footer, JsonLd } from "@/components/Static";
import { allRegions, toCard, trending } from "@/lib/creators";
import { breadcrumbs, itemList, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Trending creators",
  description: "Who everyone is looking at on Pick a Peach right now. Updated as new creators heat up.",
  path: "/trending",
});

export default function TrendingPage() {
  const list = trending();
  return (
    <>
      <JsonLd data={itemList("Trending creators", "/trending", list)} />
      <JsonLd data={breadcrumbs([{ name: "Creators", path: "/" }, { name: "Trending", path: "/trending" }])} />
      <div className="wrap">
        <header className="page-head">
          <h1>Trending now</h1>
          <p className="lede">The profiles getting the most attention this week.</p>
        </header>
        <Directory cards={list.map(toCard)} regions={allRegions()} initialSort="trending" list="trending" />
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
