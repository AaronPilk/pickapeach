import Link from "next/link";
import PrivacyChoices from "@/components/PrivacyChoices";
import RequestForm from "@/components/RequestForm";
import { H2, LegalPage } from "@/components/Legal";
import { legal } from "@/lib/legal";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Your Privacy Choices",
  description: "Opt out of ad sharing, change cookie settings, stop marketing messages, or ask Pick a Peach for a copy or deletion of your data.",
  path: "/privacy-choices",
});

export default function PrivacyChoicesPage() {
  return (
    <LegalPage title="Your Privacy Choices" intro={<p>Change how we use your information. Most of this takes effect right away.</p>}>
      <H2 id="browser">On this browser</H2>
      <p>These settings are saved in this browser. If you use another browser or device, set them there too (or turn on Global Privacy Control).</p>
      <PrivacyChoices />

      <H2 id="requests">Messages and your data</H2>
      <p>
        Stop marketing emails and texts, or ask for a copy, correction or deletion of what we hold about you. Opt-outs work immediately. We&rsquo;ll check
        it&rsquo;s you before sending or deleting data, usually by matching your email and number, and reply within 45 days.
      </p>
      <RequestForm kinds={["optout", "delete", "access", "correct"]} />
      <p className="faint" style={{ marginTop: 14 }}>
        You can also email <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>. An authorized agent can make a request for you with your signed
        permission. To appeal a decision, reply to our answer with &ldquo;Appeal.&rdquo; Creators can delete their account themselves in{" "}
        <Link href="/creator">Creator Studio</Link>. Full details are in the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
