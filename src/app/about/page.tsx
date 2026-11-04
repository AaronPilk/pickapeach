import Link from "next/link";
import { Footer, JsonLd } from "@/components/Static";
import { breadcrumbs, pageMeta } from "@/lib/seo";
import { creators } from "@/lib/creators";
import { site } from "@/lib/site";

export const metadata = pageMeta({
  title: "About",
  description: "Pick a Peach is a small, hand-picked directory of independent adult creators. Here's how we choose who gets listed and how the site works.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])} />
      <div className="wrap">
        <div className="prose">
          <h1 className="t-large">About Pick a Peach</h1>
          <p className="lede">A short list of creators worth following, picked by people, not an algorithm.</p>
          <h2>What this is</h2>
          <p>
            Pick a Peach is an independent directory of {creators.length} creators. Each profile shows a handful of photos and short clips, the creator&apos;s social accounts, and one button that takes you straight to her official page. We don&apos;t sell subscriptions and we never ask for payment details.
          </p>
          <h2>How creators are chosen</h2>
          <p>
            Every creator here is a real adult, 18 or older, who agreed to be featured. We review each profile by hand, keep the photos current, and link only to accounts the creator controls.
          </p>
          <h2>VIP</h2>
          <p>
            VIP is our free members area. Add your email and mobile number once and you get extra photos and clips on every profile. You can opt out of messages any time. See the <Link href="/privacy">Privacy Policy</Link> for exactly what we collect.
          </p>
          <h2>Creators</h2>
          <p>
            Want to be listed? <Link href="/apply">Apply here</Link>. Need something changed or removed? Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and we&apos;ll handle it within one business day.
          </p>
        </div>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
