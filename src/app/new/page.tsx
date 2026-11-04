import Directory from "@/components/Directory";
import { Footer, JsonLd } from "@/components/Static";
import { allRegions, newest, toCard } from "@/lib/creators";
import { breadcrumbs, itemList, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "New creators",
  description: "The newest creators on Pick a Peach, freshest first. Photos, clips and a direct link to follow each one.",
  path: "/new",
});

export default function NewPage() {
  const list = newest();
  return (
    <>
      <JsonLd data={itemList("New creators", "/new", list)} />
      <JsonLd data={breadcrumbs([{ name: "Creators", path: "/" }, { name: "New", path: "/new" }])} />
      <div className="wrap">
        <header className="page-head">
          <h1>New this week</h1>
          <p className="lede">Fresh faces, newest first. Get in early.</p>
        </header>
        <Directory cards={list.map(toCard)} regions={allRegions()} initialSort="new" list="new" />
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
