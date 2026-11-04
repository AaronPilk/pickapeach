import Link from "next/link";
import { H2, LegalPage } from "@/components/Legal";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({ title: "18+ Statement", description: "How Pick a Peach makes sure every creator is 18 or older, and our 18 U.S.C. 2257 statement.", path: "/18-plus" });

export default function AdultStatementPage() {
  return (
    <LegalPage title="18+ statement">
      <p>
        <b>Everyone on {site.name} is 18 or older.</b> There are no exceptions, and anyone who appears to be younger, or is presented in a way that suggests
        it, is removed and reported.
      </p>

      <H2 id="checks">How we check</H2>
      <ul>
        <li>Creators who list themselves give their date of birth, which must show they&rsquo;re 18+, and confirm that everyone in their photos and clips is 18+.</li>
        <li>Every creator links to her own page on a platform that verifies creators&rsquo; age and identity before they can post, and we check that the page matches the profile.</li>
        <li>Our team reviews every profile and every edit by hand before anything goes live.</li>
        <li>Creators we manage directly have their age confirmed by our agency.</li>
        <li>Anyone can <Link href="/content-removal">report a concern</Link>. Reports about age are handled first, and the content is hidden as soon as we see the report while we investigate.</li>
      </ul>

      <H2 id="content">What&rsquo;s on the site</H2>
      <p>
        Photos and clips here are non-explicit teasers. Nudity and sexual activity aren&rsquo;t allowed (see the <Link href="/creator-terms#rules">Creator Terms</Link>).
        The Follow button takes visitors to the creator&rsquo;s own page on a third-party platform, which has its own age checks and rules.
      </p>

      <H2 id="2257">18 U.S.C. &sect; 2257 statement</H2>
      <p>
        No visual content on this site depicts actual sexually explicit conduct as defined in 18 U.S.C. &sect; 2256, so the record-keeping requirements of 18
        U.S.C. &sect; 2257 and 28 C.F.R. Part 75 don&rsquo;t apply to it. The photos and clips were produced by the creators themselves, who are responsible
        for their own content and records. We don&rsquo;t produce content and we&rsquo;re not the primary or secondary producer of any content on the
        platforms we link to.
      </p>

      <H2 id="parents">For parents</H2>
      <p>
        This site is for adults. Parental control tools built into phones, browsers and home routers can block adult sites. If you find that a minor has used
        the site or appears on it, please <Link href="/content-removal">tell us</Link>.
      </p>
    </LegalPage>
  );
}
