import Link from "next/link";
import { Contact, H2, LegalPage } from "@/components/Legal";
import { legal } from "@/lib/legal";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description: "What Pick a Peach collects, why, who we share it with, how long we keep it, and how to opt out, delete or get a copy of your data.",
  path: "/privacy",
});

const toc: [string, string][] = [
  ["short", "The short version"],
  ["collect", "What we collect"],
  ["use", "How we use it"],
  ["bases", "Legal bases (EU, UK)"],
  ["share", "Who we share it with"],
  ["sell", "Selling, sharing and targeted ads"],
  ["cookies", "Cookies and opt-out signals"],
  ["keep", "How long we keep it"],
  ["security", "How we protect it"],
  ["rights", "Your rights"],
  ["how", "How to make a request"],
  ["creators", "Creators"],
  ["adults", "Adults only"],
  ["international", "International visitors"],
  ["changes", "Changes"],
  ["contact", "Contact"],
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      toc={toc}
      intro={
        <p>
          This policy explains how {legal.entity} (&ldquo;{site.name},&rdquo; &ldquo;we&rdquo;) handles personal information when you use our site,
          unlock hidden creators, join our messages, send us a request or list yourself as a creator.
        </p>
      }
    >
      <H2 id="short">The short version</H2>
      <ul>
        <li>We measure how the site is used so we can improve it and see which ads work.</li>
        <li>If you unlock hidden creators, we keep your email and number to contact you, but only if you agreed, and you can stop any time.</li>
        <li>Only our team sees your details. Other visitors can never see who has unlocked, and creators don&rsquo;t get your details.</li>
        <li>We don&rsquo;t sell your information for money. We never share your number or opt-in with anyone for their own marketing.</li>
        <li>We store a scrambled, daily-changing version of your IP address, never the address itself.</li>
        <li>You can opt out, get a copy or ask us to delete your data on <Link href="/privacy-choices">Your Privacy Choices</Link>.</li>
      </ul>

      <H2 id="collect">1. What we collect</H2>
      <h3>Information you give us</h3>
      <ul>
        <li><b>When you unlock hidden creators:</b> your email, mobile number, whether you agreed to messages, the exact consent wording you saw and when you agreed, and the page you unlocked from.</li>
        <li><b>When you send us a request or report:</b> your email, and anything else you choose to include (name, phone, links, details, signature).</li>
        <li><b>When you create a creator account:</b> your email and password (stored only as a one-way hash), your profile details, date of birth (used only to confirm you&rsquo;re 18+, never shown publicly), photos and clips you upload, your page link and social handles, and the confirmations you tick.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li><b>Activity on the site:</b> pages you view, profiles and clips you open, buttons you tap (including Follow), searches and filters, how far you scroll and how long you stay.</li>
        <li><b>How you found us:</b> the referring website and any campaign tags in the link you clicked (for example UTM tags or an ad network&rsquo;s campaign, site or click ID).</li>
        <li><b>Device information:</b> device type, operating system, browser, screen size, language and connection type.</li>
        <li><b>Approximate location:</b> country, region, city, postal code, time zone and network provider, worked out by our hosting provider from your IP address. We pass your IP to our database only so it can be hashed with a secret key that changes daily; the raw address is never stored.</li>
        <li><b>Cookies and similar technology:</b> see <Link href="/cookies">our Cookie Policy</Link>. Where the law requires it (for example in the EU and UK), we only use analytics and advertising cookies with your permission. Without it, we count visits anonymously with nothing stored on your device.</li>
      </ul>
      <p>We don&rsquo;t buy personal information about you from data brokers.</p>

      <H2 id="use">2. How we use it</H2>
      <ul>
        <li>To run the site, remember your choices and keep hidden creators unlocked on your device.</li>
        <li>To keep the site secure: rate limits, spam and fraud prevention, and protecting accounts.</li>
        <li>To understand what&rsquo;s popular and which traffic sources and ads bring people here.</li>
        <li>To send marketing emails and texts, only if you agreed. Every text tells you how to stop.</li>
        <li>To review creator profiles before they go live, including checking that creators are 18+.</li>
        <li>To answer your requests and reports, and to meet legal obligations (for example removing illegal content and keeping records of opt-outs).</li>
      </ul>

      <H2 id="bases">3. Legal bases (EU, EEA, UK and Switzerland)</H2>
      <p>
        We rely on <b>consent</b> for analytics and advertising cookies and for marketing messages; on <b>contract</b> to provide creator accounts and the
        unlock you asked for; on <b>legitimate interests</b> for security, preventing abuse, anonymous measurement and improving the site; and on{" "}
        <b>legal obligation</b> where the law requires us to keep or disclose information. You can withdraw consent at any time without affecting earlier use.
      </p>

      <H2 id="share">4. Who we share it with</H2>
      <ul>
        <li><b>Service providers</b> that run parts of the site for us under contract and may only use your data to do that: hosting and content delivery (Cloudflare), our database (Supabase), the service we use to send emails and texts, and Google Analytics if we turn it on.</li>
        <li><b>Ad networks</b> (for example Traffic Junky), but only if advertising cookies are allowed: a conversion pixel tells the network that someone it sent tapped Follow or unlocked, so we can measure our ads. It never includes your email or number.</li>
        <li><b>Legal and safety:</b> when the law requires it, to protect people or the site, or to report suspected child sexual exploitation to the National Center for Missing &amp; Exploited Children (NCMEC).</li>
        <li><b>Business transfer:</b> if the site is sold or merged, information may transfer to the new owner under this policy.</li>
      </ul>
      <p>
        Creators never receive your details, and no visitor can see another visitor&rsquo;s information. <b>We don&rsquo;t share mobile numbers or text
        message opt-in data with third parties or affiliates for their marketing.</b>
      </p>

      <H2 id="sell">5. Selling, sharing and targeted ads</H2>
      <p>
        We don&rsquo;t sell personal information for money. When ad conversion pixels are on, some US state laws (including California&rsquo;s) may treat that
        as &ldquo;sharing&rdquo; personal information for cross-context behavioral advertising, or as &ldquo;targeted advertising.&rdquo; You can opt out
        any time on <Link href="/privacy-choices">Your Privacy Choices</Link>, and we automatically treat a Global Privacy Control signal from your browser as an
        opt-out. We don&rsquo;t knowingly sell or share information about anyone under 18.
      </p>
      <p>
        In the past 12 months we may have shared, for advertising measurement, these categories: internet activity (pages and taps on our site), device
        identifiers and approximate location. We haven&rsquo;t sold any category of personal information.
      </p>

      <H2 id="cookies">6. Cookies and opt-out signals</H2>
      <p>
        Our <Link href="/cookies">Cookie Policy</Link> lists every cookie we use. You can change your choices any time with &ldquo;Cookie settings&rdquo; in
        the footer. We honor Global Privacy Control (GPC). Browser &ldquo;Do Not Track&rdquo; signals have no agreed standard, so we don&rsquo;t respond to
        them; use GPC or our settings instead.
      </p>

      <H2 id="keep">7. How long we keep it</H2>
      <ul>
        <li><b>Site activity and visit records:</b> up to 25 months, then deleted.</li>
        <li><b>Unlock and marketing contacts:</b> until you opt out or ask us to delete them. After an opt-out we keep a minimal record so we never message you again.</li>
        <li><b>Requests and reports:</b> up to 3 years, as a record that we handled them.</li>
        <li><b>Creator accounts:</b> until you delete your account. Deleting it removes your profile and every file you uploaded right away.</li>
        <li><b>Security logs</b> (login attempts, upload counts): 30 days.</li>
      </ul>

      <H2 id="security">8. How we protect it</H2>
      <p>
        The site runs over HTTPS. Our database can&rsquo;t be read directly from the internet; it only answers a small set of checked requests from our own
        server. Passwords are stored as one-way hashes, IP addresses are hashed with a secret key, and only our team can see contact details. No system is
        perfectly secure, but we work to protect your information and will tell you if a breach affects you when the law requires it.
      </p>

      <H2 id="rights">9. Your rights</H2>
      <p>Depending on where you live, you may have the right to:</p>
      <ul>
        <li>know what personal information we have about you and get a copy of it, in a portable format;</li>
        <li>have it corrected or deleted;</li>
        <li>opt out of the sale or sharing of your information and of targeted advertising;</li>
        <li>withdraw consent, or object to or restrict how we use it (EU, UK and Switzerland);</li>
        <li>appeal if we turn down your request;</li>
        <li>complain to your data protection authority or state attorney general.</li>
      </ul>
      <p>
        We give these rights to everyone, wherever you live, and we won&rsquo;t treat you differently for using them. We don&rsquo;t use sensitive
        information to make inferences about you; a creator&rsquo;s date of birth is used only to confirm age.
      </p>

      <H2 id="how">10. How to make a request</H2>
      <p>
        Use the form on <Link href="/privacy-choices">Your Privacy Choices</Link> or email <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>.
        Opt-outs take effect right away. For copies, corrections and deletions we&rsquo;ll check it&rsquo;s really you, usually by matching your email and
        number or emailing you to confirm, and reply within 45 days (we&rsquo;ll tell you if we need up to 45 more). An authorized agent can make a request
        for you with your signed permission. To appeal a decision, reply to our answer with &ldquo;Appeal&rdquo; and we&rsquo;ll respond within 60 days,
        or sooner if your state&rsquo;s law requires.
      </p>
      <p>To stop texts, reply STOP to any text. To stop emails, use the unsubscribe link in any email.</p>

      <H2 id="creators">11. Creators</H2>
      <p>
        If you list yourself, your approved profile (name, photos, clips, bio, location you chose, page link and socials) is public. Your email and date of
        birth are not; only our team sees them. You can edit your profile any time (edits are reviewed before they go live) or delete your account in
        Creator Studio, which removes your profile and files. See the <Link href="/creator-terms">Creator Terms</Link>.
      </p>

      <H2 id="adults">12. Adults only</H2>
      <p>
        The site is for adults 18 and over. We don&rsquo;t knowingly collect information from anyone younger, and we delete it if we find out. If you think a
        minor has used the site or appears on it, <Link href="/content-removal">tell us right away</Link>.
      </p>

      <H2 id="international">13. International visitors</H2>
      <p>
        We&rsquo;re based in the United States and your information is processed there and wherever our providers operate. Where the law requires, we rely
        on safeguards such as the European Commission&rsquo;s Standard Contractual Clauses for these transfers.
      </p>

      <H2 id="changes">14. Changes</H2>
      <p>We&rsquo;ll post any changes here and update the date at the top. If a change is significant we&rsquo;ll say so on the site.</p>

      <H2 id="contact">15. Contact</H2>
      <p>
        Privacy questions: <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>. Anything else: <Contact />
      </p>
    </LegalPage>
  );
}
