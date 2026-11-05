import Link from "next/link";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import { H2, LegalPage } from "@/components/Legal";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMeta({ title: "Cookie Policy", description: "Every cookie and storage item Pick a Peach uses, what it's for, how long it lasts and how to turn it off.", path: "/cookies" });

type Row = [name: string, kind: string, purpose: string, lasts: string];

const necessary: Row[] = [
  ["pp_age", "Cookie", "Remembers that you confirmed you're 18 or older.", "30 days"],
  ["pp_age_ok", "Local storage", "Backup of the 18+ confirmation.", "30 days"],
  ["pp_consent", "Cookie", "Your cookie choices, so we don't ask again.", "6 months"],
  ["pp_geo", "Cookie", "Your country (nothing more precise), so we show the right cookie choices for where you are.", "1 day"],
  ["pp_vip", "Cookie (secure, not readable by scripts)", "Keeps hidden creators unlocked on this device after you add your details.", "1 year"],
  ["pp_unlocked", "Cookie", "Tells the page you've unlocked, so it shows the right buttons.", "1 year"],
  ["pp_creator", "Cookie (secure, not readable by scripts)", "Keeps creators logged in to Creator Studio.", "30 days"],
  ["pp_admin", "Cookie (secure, not readable by scripts)", "Keeps our team logged in to the dashboard.", "14 days"],
  ["pp_theme", "Local storage", "Your light or dark mode choice.", "Until you clear it"],
  ["pp_likes", "Local storage", "Clips you liked, kept on your device only.", "Until you clear it"],
];

const analytics: Row[] = [
  ["pp_vid", "Cookie + local storage", "A random visitor ID so we can count returning visits and tie a Follow tap to the ad that brought you.", "400 days"],
  ["pp_sid", "Cookie + session storage", "A random ID for this visit.", "30 minutes of inactivity"],
  ["pp_ft", "Local storage", "The first link or ad that brought you to the site.", "Until you clear it"],
  ["pp_lt", "Session storage", "The latest link or ad that brought you, for this visit.", "Until you close the tab"],
  ["_ga, _ga_*", "Cookie (Google Analytics)", "Only if we turn Google Analytics on. Counts visits and pages.", "Up to 2 years"],
];

function Table({ rows }: { rows: Row[] }) {
  return (
    <table>
      <thead>
        <tr><th>Name</th><th>Type</th><th>What it does</th><th>How long</th></tr>
      </thead>
      <tbody>
        {rows.map(([n, k, p, l]) => (
          <tr key={n}><td><code>{n}</code></td><td>{k}</td><td>{p}</td><td>{l}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <p>
          Cookies are small files a website saves in your browser. Local and session storage are similar. This page lists everything {site.name} saves on
          your device, and how to control it.
        </p>
      }
    >
      <p><CookieSettingsButton className="btn btn-primary" /></p>

      <H2 id="choices">How your choices work</H2>
      <ul>
        <li><b>Everyone is asked on the way in</b>, in the same box that checks you&rsquo;re 18+. You can change your mind any time with Cookie settings.</li>
        <li><b>In the EU, EEA, UK and Switzerland</b>, analytics and advertising cookies stay off until you allow them, and &ldquo;necessary cookies only&rdquo; is always one tap.</li>
        <li><b>Everywhere else</b>, entering the site accepts them, and you can turn them off any time.</li>
        <li><b>Global Privacy Control:</b> if your browser sends this signal, we turn off advertising cookies automatically, wherever you are.</li>
        <li>With analytics off, we still count visits anonymously: nothing is saved on your device, and the visit can&rsquo;t be linked to you later.</li>
      </ul>

      <H2 id="necessary">Necessary</H2>
      <p>These keep the site working and can&rsquo;t be turned off here (you can still delete them in your browser).</p>
      <Table rows={necessary} />

      <H2 id="analytics">Analytics</H2>
      <p>These help us understand how people use the site and which links and ads bring them here. They contain random IDs, not your name or contact details.</p>
      <Table rows={analytics} />

      <H2 id="advertising">Advertising</H2>
      <p>
        If we run ads on networks such as Traffic Junky, we may load a small conversion pixel when someone they sent taps Follow or unlocks hidden creators.
        It tells the network that the ad worked. The network may set its own cookies under its own privacy policy. Pixels only load with advertising cookies
        allowed, and never when Global Privacy Control is on.
      </p>

      <H2 id="control">Other ways to control cookies</H2>
      <p>
        Most browsers let you block or delete cookies in their settings. Blocking necessary cookies may mean you&rsquo;re asked if you&rsquo;re 18+ on every
        visit and hidden creators won&rsquo;t stay unlocked. For more about your data, see the <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/privacy-choices">Your Privacy Choices</Link>.
      </p>
    </LegalPage>
  );
}
