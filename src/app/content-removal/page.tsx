import Link from "next/link";
import RequestForm from "@/components/RequestForm";
import { H2, LegalPage } from "@/components/Legal";
import { legal } from "@/lib/legal";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({
  title: "Report Content",
  description: "Report non-consensual images, anyone who may be under 18, impersonation or copyright infringement on Pick a Peach. Urgent reports are handled within 48 hours.",
  path: "/content-removal",
});

export default function ContentRemovalPage() {
  return (
    <LegalPage
      title="Report content"
      intro={
        <p>
          If something on {site.name} shows you without your consent, shows someone who may be under 18, impersonates you or uses your work without permission,
          tell us here. You don&rsquo;t need an account.
        </p>
      }
    >
      <div className="callout">
        <b>Urgent reports come first.</b> We take down reported intimate images shared without consent, and anything involving someone who may be under 18,
        within 48 hours of a valid request (usually much sooner), and look for identical copies. We report suspected child sexual exploitation to the
        National Center for Missing &amp; Exploited Children.
      </div>

      <RequestForm kinds={["ncii", "underage", "impersonation", "copyright", "other"]} />

      <H2 id="ncii">Intimate images shared without consent</H2>
      <p>
        Under the federal TAKE IT DOWN Act, you (or someone authorized to act for you) can ask us to remove an intimate image or video of you that was
        published without your consent, including AI-generated or edited images. A valid request includes:
      </p>
      <ul>
        <li>your physical or electronic signature (typing your full name in the form counts);</li>
        <li>a link or description so we can find the content;</li>
        <li>a short statement that you believe in good faith the image was published without your consent;</li>
        <li>a way to contact you.</li>
      </ul>
      <p>We remove it within 48 hours of receiving a valid request, make reasonable efforts to remove identical copies, and let you know when it&rsquo;s done.</p>

      <H2 id="minors">Someone who may be under 18</H2>
      <p>
        Every creator on {site.name} must be 18 or older, and we review each profile before it goes live (see our <Link href="/18-plus">18+ statement</Link>).
        If you have any reason to think someone shown is under 18, report it. Age reports go to the top of our queue, and we hide the content as soon as we see the report while we investigate.
      </p>

      <H2 id="impersonation">Impersonation and other problems</H2>
      <p>If a profile uses your name or photos, or anything else here worries you, report it with a link and we&rsquo;ll look into it quickly.</p>

      <H2 id="dmca">Copyright (DMCA)</H2>
      <p>
        We respond to notices of alleged copyright infringement under the Digital Millennium Copyright Act. A notice must include (17 U.S.C. &sect; 512(c)(3)):
      </p>
      <ol>
        <li>your physical or electronic signature;</li>
        <li>identification of the copyrighted work you say is infringed;</li>
        <li>identification of the material on our site, with enough detail (such as a link) for us to find it;</li>
        <li>your name, address, phone number and email;</li>
        <li>a statement that you have a good-faith belief the use isn&rsquo;t authorized by the copyright owner, its agent or the law;</li>
        <li>a statement that the information in the notice is accurate and, under penalty of perjury, that you&rsquo;re the owner or authorized to act for the owner.</li>
      </ol>
      <p>
        Send notices with the form above or to our designated agent: {legal.entity}, Attn: Copyright Agent,{" "}
        {legal.address ? <>{legal.address}, </> : null}
        <a href={`mailto:${legal.dmcaEmail}`}>{legal.dmcaEmail}</a>.
      </p>
      <p>
        <b>Counter-notice.</b> If your content was removed and you believe that was a mistake, you can send a counter-notice with your signature, the
        removed material and where it appeared, a statement under penalty of perjury that you believe in good faith it was removed by mistake or
        misidentification, and your name, address and phone number with consent to the jurisdiction of the federal court for your district (or, outside
        the US, any district where we can be found). We&rsquo;ll restore it in 10 to 14 business days unless the original sender tells us they&rsquo;ve
        filed a court action.
      </p>
      <p>
        Knowingly misrepresenting that material is infringing, or that it was removed by mistake, can make you liable for damages (17 U.S.C. &sect; 512(f)). We
        end the accounts of repeat infringers.
      </p>
    </LegalPage>
  );
}
