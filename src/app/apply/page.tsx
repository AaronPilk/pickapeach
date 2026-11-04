import ApplyForm from "@/components/ApplyForm";
import { Footer, JsonLd } from "@/components/Static";
import { breadcrumbs, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Get listed",
  description: "Creators: apply to be featured on Pick a Peach. Free listing, real traffic, and a team that helps you grow.",
  path: "/apply",
});

export default function ApplyPage() {
  return (
    <>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Get listed", path: "/apply" }])} />
      <div className="wrap">
        <div className="prose" style={{ paddingBottom: 0 }}>
          <h1 className="t-large">Get listed on Pick a Peach</h1>
          <p className="lede">We send real, tracked traffic to the creators we feature, and our management team works with the ones who want to grow faster. Tell us about you.</p>
        </div>
        <div className="panel cell" style={{ maxWidth: 560, marginTop: 18 }}>
          <ApplyForm />
        </div>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
