import Link from "next/link";
import { Contact, H2, LegalPage } from "@/components/Legal";
import { legal } from "@/lib/legal";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({ title: "Creator Terms", description: "The terms for creators who list themselves on Pick a Peach: who can join, what you can post, and how removal works.", path: "/creator-terms" });

const toc: [string, string][] = [
  ["who", "Who can list"],
  ["account", "Your account"],
  ["rules", "What you can post"],
  ["promises", "Your promises"],
  ["license", "Permission to show your content"],
  ["review", "Review and removal"],
  ["delete", "Editing and deleting"],
  ["money", "Fees and results"],
  ["responsibility", "Responsibility"],
  ["other", "Everything else"],
];

export default function CreatorTermsPage() {
  return (
    <LegalPage
      title="Creator Terms"
      toc={toc}
      intro={
        <p>
          These terms apply when you create a profile in <Link href="/creator">Creator Studio</Link>. They sit alongside our{" "}
          <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>. By ticking &ldquo;I agree to the Creator Terms&rdquo;
          and submitting your profile, you accept them.
        </p>
      }
    >
      <H2 id="who">1. Who can list</H2>
      <ul>
        <li>You must be at least 18, and the age of majority where you live.</li>
        <li>You must be the person in the profile, or her manager or agency with her written permission to list her.</li>
        <li>Your page link must go to your own account on a platform that verifies creators&rsquo; age and identity (such as OnlyFans or Fansly).</li>
      </ul>

      <H2 id="account">2. Your account</H2>
      <p>
        Give us accurate information and keep it up to date. We use your date of birth only to confirm you&rsquo;re 18+, and we never show it. Keep your
        password private; you&rsquo;re responsible for anything done with your account. Tell us right away if you think someone else has access.
      </p>

      <H2 id="rules">3. What you can post</H2>
      <p>{site.name} is a non-explicit directory. Photos and clips must be teasers that would be fine on mainstream social media. Specifically:</p>
      <ul>
        <li>No nudity: no exposed genitals, no exposed nipples, no fully exposed buttocks. No sexual acts, real or simulated.</li>
        <li>Only you (and other adults who agreed to be shown) may appear. Everyone shown must be 18 or older.</li>
        <li>Nothing that suggests anyone is under 18, in any way.</li>
        <li>No offers of in-person meetings, escorting or sexual services, and no prices for them. Your page link and socials are the only contact details allowed.</li>
        <li>No content you don&rsquo;t own or have permission to use, and no one else&rsquo;s personal information.</li>
        <li>No hate, threats, violence, drugs, weapons, or anything illegal where you or we are.</li>
        <li>No impersonating anyone, and no fake or misleading profile information.</li>
      </ul>

      <H2 id="promises">4. Your promises</H2>
      <p>When you submit a profile, you confirm that:</p>
      <ul>
        <li>you&rsquo;re 18 or older, and so is everyone in your photos and clips, and each of them agreed to be shown;</li>
        <li>you own your content or have every right and permission needed to post it;</li>
        <li>your content follows the rules above and doesn&rsquo;t break any law or anyone else&rsquo;s rights;</li>
        <li>everything in your profile is true.</li>
      </ul>
      <p>We may ask for proof, such as confirmation from your platform account. If you can&rsquo;t provide it, we can decline or remove your profile.</p>

      <H2 id="license">5. Permission to show your content</H2>
      <p>
        You keep ownership of everything you upload. You give {legal.entity} a non-exclusive, worldwide, royalty-free permission to store, copy, crop,
        resize, compress and display your photos, clips, name and profile on {site.name}, including in link previews when someone shares your profile, for
        as long as your profile is listed. When you remove something or delete your account, this permission ends, except for copies that take a short time
        to clear from caches. We won&rsquo;t use your content in paid ads without asking you first.
      </p>

      <H2 id="review">6. Review and removal</H2>
      <p>
        Every profile and every edit is reviewed before it goes live. We can approve, ask for changes, decline or remove any profile at any time, at our
        discretion, including to protect creators or visitors or to follow the law. We can choose whether your profile is shown to everyone or only to
        visitors who unlock hidden creators. If we receive a valid report about your content (for example a copyright notice or a non-consent report), we
        may take it down first and ask you about it after.
      </p>

      <H2 id="delete">7. Editing and deleting</H2>
      <p>
        You can edit your profile whenever you like in Creator Studio; your current live version stays up until we approve the edits. You can delete your
        account at any time in Creator Studio. That removes your profile from the site within minutes and deletes your account details and every file you
        uploaded.
      </p>

      <H2 id="money">8. Fees and results</H2>
      <p>
        Listing is free. We don&rsquo;t take a cut of your earnings. We can&rsquo;t promise any amount of traffic, followers or income, and we may change or
        stop features at any time.
      </p>

      <H2 id="responsibility">9. Responsibility</H2>
      <p>
        You&rsquo;re responsible for your content and your page. If your content or a broken promise above leads to a claim against us, you agree to cover our
        reasonable costs, including legal fees. Our liability to you is limited as described in the <Link href="/terms#liability">Terms of Service</Link>.
      </p>

      <H2 id="other">10. Everything else</H2>
      <p>
        These terms are governed by {legal.state} law, and disputes are handled as described in the <Link href="/terms#disputes">Terms of Service</Link>. We
        may update them; we&rsquo;ll change the date above, and if a change matters to you we&rsquo;ll let you know before it applies to your profile.
        Questions: <Contact />
      </p>
    </LegalPage>
  );
}
