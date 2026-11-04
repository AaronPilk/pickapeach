import Link from "next/link";
import { Contact, H2, LegalPage } from "@/components/Legal";
import { legal, SMS_CONSENT_TEXT } from "@/lib/legal";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({ title: "Terms of Service", description: "The rules for using Pick a Peach, including our text message program.", path: "/terms" });

const toc: [string, string][] = [
  ["agreement", "Agreeing to these terms"],
  ["eligibility", "Who can use the site"],
  ["what-we-are", "What Pick a Peach is"],
  ["unlock", "Unlocking hidden creators"],
  ["messages", "Text and email messages"],
  ["creators", "Creator accounts"],
  ["rules", "Rules for using the site"],
  ["content", "Content and ownership"],
  ["reports", "Reporting content"],
  ["privacy", "Privacy"],
  ["third-party", "Other websites"],
  ["disclaimers", "Disclaimers"],
  ["liability", "Limits on our liability"],
  ["indemnity", "Your responsibility to us"],
  ["ending", "Ending access"],
  ["disputes", "Disputes and governing law"],
  ["changes", "Changes"],
  ["general", "The fine print"],
  ["contact", "Contact"],
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      toc={toc}
      intro={
        <p>
          These terms are an agreement between you and {legal.entity} (&ldquo;{site.name},&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). They cover your use of{" "}
          {site.url.replace(/^https?:\/\//, "")} and everything on it.
        </p>
      }
    >
      <H2 id="agreement">1. Agreeing to these terms</H2>
      <p>
        By using the site you agree to these terms, our <Link href="/privacy">Privacy Policy</Link> and our <Link href="/cookies">Cookie Policy</Link>. If you
        create a creator account, our <Link href="/creator-terms">Creator Terms</Link> apply too. If you don&rsquo;t agree, please don&rsquo;t use the site.
      </p>

      <H2 id="eligibility">2. Who can use the site</H2>
      <p>
        You must be at least 18, or the age of majority where you live if that&rsquo;s older. Viewing adult-oriented material must be legal where you are. If
        any of that isn&rsquo;t true, leave now. We don&rsquo;t knowingly allow anyone under 18 to use the site.
      </p>

      <H2 id="what-we-are">3. What Pick a Peach is</H2>
      <p>
        {site.name} is a directory of independent adult creators. Profiles show a few non-explicit photos and short clips, and the Follow button sends you to
        the creator&rsquo;s own page on a third-party platform (such as OnlyFans). We don&rsquo;t sell subscriptions, we don&rsquo;t process payments, and
        we aren&rsquo;t affiliated with, endorsed by or responsible for any of those platforms. Anything you buy or subscribe to there is between you, the
        creator and that platform, under their terms.
      </p>
      <p>Creators decide what they post. We can&rsquo;t promise that any creator is available, active or will reply to you.</p>

      <H2 id="unlock">4. Unlocking hidden creators</H2>
      <p>
        Some creators are hidden until you add your email and mobile number. Unlocking is free. You must enter your own details, not someone else&rsquo;s.
        Only our team sees what you enter. We never show it to creators or other visitors, and no visitor can see who else has unlocked. We may remove access
        if we think details are fake or the feature is being abused.
      </p>

      <H2 id="messages">5. Text and email messages</H2>
      <p>If you tick the consent box when you unlock, you&rsquo;re joining our marketing program. Here&rsquo;s exactly what you agreed to:</p>
      <p className="callout">&ldquo;{SMS_CONSENT_TEXT}&rdquo;</p>
      <ul>
        <li><b>Program:</b> {site.name} alerts about new creators, drops and site news.</li>
        <li><b>How often:</b> it varies.</li>
        <li><b>Cost:</b> the program is free, but message and data rates from your carrier may apply.</li>
        <li><b>Stopping:</b> reply STOP to any text, tap unsubscribe in any email, or use <Link href="/privacy-choices">Your Privacy Choices</Link>. We stop as soon as we can, and always within 10 business days. After you reply STOP we may send one last text confirming you&rsquo;re out.</li>
        <li><b>Help:</b> reply HELP to any text or email <a href={`mailto:${legal.email}`}>{legal.email}</a>.</li>
        <li><b>No purchase needed:</b> agreeing isn&rsquo;t a condition of buying anything.</li>
        <li>Carriers aren&rsquo;t liable for delayed or undelivered messages. We don&rsquo;t share your mobile number or opt-in with anyone else for their marketing.</li>
      </ul>

      <H2 id="creators">6. Creator accounts</H2>
      <p>
        Creators can build a profile in Creator Studio. Every profile is reviewed by our team before it goes live, and our <Link href="/creator-terms">Creator Terms</Link>{" "}
        apply. Keep your password private. You&rsquo;re responsible for what happens under your account.
      </p>

      <H2 id="rules">7. Rules for using the site</H2>
      <p>Don&rsquo;t:</p>
      <ul>
        <li>copy, download, scrape, crawl or republish photos, clips or profiles, or use them to train AI models, without the creator&rsquo;s written permission;</li>
        <li>use bots or automated tools, or try to get around the unlock, rate limits or any other access control;</li>
        <li>probe, scan or attack the site&rsquo;s security, or interfere with how it runs;</li>
        <li>harass, threaten, stalk or try to identify or locate any creator offline;</li>
        <li>enter someone else&rsquo;s email or phone number, or impersonate anyone;</li>
        <li>upload or link to anything illegal, including any content involving a minor;</li>
        <li>frame the site or present it as your own.</li>
      </ul>

      <H2 id="content">8. Content and ownership</H2>
      <p>
        Creators own their photos, clips, names and likenesses, and they&rsquo;re shown here with permission. The site&rsquo;s design, code, text and the{" "}
        {site.name} name and logo belong to us. You may view the site for your own personal, non-commercial use. Nothing here gives you any other right to use
        our content or a creator&rsquo;s. If you send us feedback, we can use it without owing you anything.
      </p>

      <H2 id="reports">9. Reporting content</H2>
      <p>
        If something on the site is yours and shouldn&rsquo;t be here, shows someone who may be under 18, shows someone without their consent or is
        impersonating someone, <Link href="/content-removal">report it here</Link>. We remove non-consensual intimate images within 48 hours of a valid
        request, respond to copyright notices under the DMCA, and end the accounts of repeat infringers.
      </p>

      <H2 id="privacy">10. Privacy</H2>
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains what we collect and why. You can change cookie settings or opt out of ad sharing any time on{" "}
        <Link href="/privacy-choices">Your Privacy Choices</Link>.
      </p>

      <H2 id="third-party">11. Other websites</H2>
      <p>
        Links to creators&rsquo; pages and social accounts take you to sites we don&rsquo;t run. We aren&rsquo;t responsible for their content, prices,
        privacy practices or anything that happens there.
      </p>

      <H2 id="disclaimers">12. Disclaimers</H2>
      <p>
        The site is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest extent the law allows, we make no warranties of any kind,
        express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy and non-infringement. We don&rsquo;t promise
        the site will be uninterrupted, error-free or secure, or that any profile is accurate.
      </p>

      <H2 id="liability">13. Limits on our liability</H2>
      <p>
        To the fullest extent the law allows, {site.name} and its owners, employees and partners won&rsquo;t be liable for any indirect, incidental, special,
        consequential or punitive damages, or for lost profits, data or goodwill, arising from your use of the site or any site it links to. Our total
        liability for any claim about the site is limited to US$100. Some places don&rsquo;t allow these limits, so they may not all apply to you.
      </p>

      <H2 id="indemnity">14. Your responsibility to us</H2>
      <p>
        If you break these terms or the law while using the site, and that leads to a claim against us, you agree to cover our reasonable costs, including
        legal fees.
      </p>

      <H2 id="ending">15. Ending access</H2>
      <p>
        We can suspend or end your access, remove content or close an account at any time if we believe you&rsquo;ve broken these terms, or to protect
        creators, visitors or the site. You can stop using the site whenever you like.
      </p>

      <H2 id="disputes">16. Disputes and governing law</H2>
      <p>
        If you have a problem, email us first and give us 30 days to try to fix it. These terms are governed by the laws of the State of {legal.state} and
        applicable US federal law, without regard to conflict-of-law rules. Any dispute that isn&rsquo;t resolved informally will be handled only in the state
        or federal courts located in {legal.venue}, and you and we agree to those courts&rsquo; jurisdiction. Either of us may bring a qualifying claim in
        small claims court instead.
      </p>

      <H2 id="changes">17. Changes</H2>
      <p>
        We may update these terms. We&rsquo;ll change the date at the top, and for important changes we&rsquo;ll give notice on the site. If you keep using
        the site after an update, the new terms apply.
      </p>

      <H2 id="general">18. The fine print</H2>
      <p>
        These terms, together with the policies linked here, are the whole agreement between you and us about the site. If any part is found unenforceable,
        the rest still applies. If we don&rsquo;t enforce something right away, we haven&rsquo;t given up the right to. You can&rsquo;t transfer these terms;
        we can, for example if the site is sold.
      </p>

      <H2 id="contact">19. Contact</H2>
      <p>
        <Contact />
      </p>
    </LegalPage>
  );
}
