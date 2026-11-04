import Link from "next/link";
import { Footer, JsonLd } from "@/components/Static";
import { breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Get listed",
  description: "Creators: build your free Pick a Peach profile with photos, clips and your links. Every profile is reviewed before it goes live.",
  path: "/apply",
});

export default function ApplyPage() {
  return (
    <>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Get listed", path: "/apply" }])} />
      <div className="wrap">
        <div className="prose">
          <h1 className="t-large">Get listed on Pick a Peach</h1>
          <p className="lede">We send real, tracked traffic to the creators we feature. Build your profile yourself in a few minutes: photos, clips, bio and your links. We review every profile before it goes live.</p>
          <h2>How it works</h2>
          <ul>
            <li>Create a free account and fill in your profile.</li>
            <li>Upload at least 2 photos (we crop them to 4:5) and up to 6 short clips.</li>
            <li>Submit it. We check every profile by hand, usually within a day.</li>
            <li>Once approved, your profile goes live with a button straight to your page.</li>
          </ul>
          <Link href="/creator" className="btn btn-primary" style={{ marginTop: 22 }}>Create your profile</Link>
          <p className="t-foot c3" style={{ marginTop: 14 }}>You must be 18 or older. Everyone in your photos and clips must be 18+ and agree to be shown.</p>
        </div>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
