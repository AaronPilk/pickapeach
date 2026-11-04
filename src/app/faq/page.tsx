import Link from "next/link";
import { Footer, JsonLd } from "@/components/Static";
import { FAQS, breadcrumbs, faqGraph, pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "FAQ",
  description: "How Pick a Peach works: following creators, what VIP is, what happens to your email and number, and how creators get listed.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqGraph(FAQS)} />
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }])} />
      <div className="wrap">
        <div className="prose">
          <h1>Questions, answered</h1>
          <p className="lede">The short version: browse free, tap Follow to go to her page, unlock VIP if you want more.</p>
        </div>
        <div className="faq" style={{ maxWidth: 760 }}>
          {FAQS.map((f) => (
            <details key={f.q} className="pane" open>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 22 }}>
          Still stuck? <Link href="/about" style={{ color: "var(--coral-300)" }}>Read about us</Link> or email the team.
        </p>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
