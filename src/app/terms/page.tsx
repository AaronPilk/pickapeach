import { Footer } from "@/components/Static";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({ title: "Terms of Use", description: "The rules for using Pick a Peach.", path: "/terms" });

export default function TermsPage() {
  return (
    <>
      <div className="wrap">
        <div className="prose">
          <h1 className="t-large">Terms of Use</h1>
          <p className="faint">Last updated November 4, 2026</p>
          <h2>Who can use this site</h2>
          <p>You must be 18 or older, or the age of majority where you live if that is higher, and it must be legal for you to view adult-oriented material where you are.</p>
          <h2>What we are</h2>
          <p>{site.name} is a directory. We link to creators&apos; own pages on third-party platforms. We don&apos;t host or sell their subscriptions, and we aren&apos;t responsible for those platforms or their content.</p>
          <h2>Content</h2>
          <p>All photos, clips and names belong to the creators and are shown with their permission. Don&apos;t copy, download, scrape or redistribute anything from this site.</p>
          <h2>VIP and messages</h2>
          <p>VIP is free. By unlocking it you confirm the details you enter are yours. If you opted in to messages, message frequency varies and msg &amp; data rates may apply. Reply STOP to cancel or HELP for help.</p>
          <h2>Removal requests</h2>
          <p>Creators or rights holders can request a change or removal by emailing <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. We act on valid requests promptly.</p>
          <h2>No warranty</h2>
          <p>The site is provided as is. To the fullest extent the law allows, we aren&apos;t liable for any loss from using it or the sites it links to.</p>
          <h2>Changes</h2>
          <p>We may update these terms. If you keep using the site after an update, you accept the new terms.</p>
        </div>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
