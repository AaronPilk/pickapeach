import { Footer } from "@/components/Static";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({ title: "Privacy Policy", description: "What Pick a Peach collects, why, and how to opt out.", path: "/privacy" });

export default function PrivacyPage() {
  return (
    <>
      <div className="wrap">
        <div className="prose">
          <h1>Privacy Policy</h1>
          <p className="faint">Last updated November 4, 2026</p>
          <p>This policy explains what {site.name} (&quot;we&quot;) collects when you use this site and what we do with it.</p>
          <h2>What we collect</h2>
          <ul>
            <li><b>Usage data.</b> Pages you view, profiles and clips you open, buttons you tap, how far you scroll and how long you stay. We tie this to a random ID stored in a cookie on your device.</li>
            <li><b>Traffic source.</b> The link or ad that brought you here (for example campaign tags in the URL) and the referring site.</li>
            <li><b>Device and location.</b> Device type, browser, operating system, screen size, language, and approximate location (country, region, city) based on your IP address. We store a one-way, daily-rotating hash of your IP, not the IP itself.</li>
            <li><b>Details you give us.</b> If you unlock VIP or apply as a creator, the email, phone number and any other details you enter, plus your consent choice.</li>
          </ul>
          <h2>Why</h2>
          <ul>
            <li>To run the site, unlock VIP on your device, and keep it secure and free of spam.</li>
            <li>To measure which pages, creators and traffic sources perform best.</li>
            <li>If you agreed, to email or text you about new creators and drops. Reply STOP to any text or use the unsubscribe link in any email to opt out.</li>
          </ul>
          <h2>Sharing</h2>
          <p>We don&apos;t sell your personal information. We share it only with service providers that help us run the site (hosting, database, messaging) and when the law requires it. When you tap Follow you leave this site; the creator&apos;s platform has its own privacy policy.</p>
          <h2>Cookies</h2>
          <p>We use first-party cookies for your visitor and session IDs, your age confirmation, and your VIP unlock. You can clear them in your browser at any time.</p>
          <h2>Your choices</h2>
          <p>Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> to access, correct or delete your information. Residents of some US states (including California) and other countries have additional rights, which we honor.</p>
          <h2>Adults only</h2>
          <p>This site is for adults 18 and older. We don&apos;t knowingly collect information from anyone under 18.</p>
        </div>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}
