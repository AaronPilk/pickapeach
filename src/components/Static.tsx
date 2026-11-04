import Link from "next/link";
import { allRegions, allTags } from "@/lib/creators";
import { site } from "@/lib/site";
import { Peach } from "./Icons";
import CookieSettingsButton from "./CookieSettingsButton";

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Footer() {
  const tags = allTags().slice(0, 8);
  const regions = allRegions().slice(0, 8);
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="brand">
            <Link href="/" className="logo" aria-label="Pick a Peach home">
              <Peach />
              <span>
                pick a <b>peach</b>
              </span>
            </Link>
            <p>{site.description}</p>
          </div>
          <div>
            <h4>Browse</h4>
            <ul>
              <li><Link href="/new">New creators</Link></li>
              <li><Link href="/trending">Trending</Link></li>
              <li><Link href="/clips">Clips</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              {tags.slice(0, 5).map((t) => (
                <li key={t.slug}><Link href={`/browse/${t.slug}`}>{cap(t.tag)}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Places</h4>
            <ul>
              {regions.map((r) => (
                <li key={r.region}><Link href={`/from/${r.region}`}>{r.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Pick a Peach</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/creator">Creators: get listed</Link></li>
              <li><Link href="/content-removal">Report content</Link></li>
              <li><a href={`mailto:${site.contactEmail}`}>Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/cookies">Cookie Policy</Link></li>
              <li><Link href="/creator-terms">Creator Terms</Link></li>
              <li><Link href="/18-plus">18+ statement</Link></li>
              <li><Link href="/privacy-choices">Your Privacy Choices</Link></li>
              <li><CookieSettingsButton className="footer-link-btn" /></li>
            </ul>
          </div>
        </div>
        <div className="legal">
          © {new Date().getFullYear()} {site.name}. All creators are 18+ and listed with their permission. Pick a Peach is an independent directory and isn&apos;t affiliated with any platform it links to. To report content or request removal, <Link href="/content-removal">use this form</Link>.
        </div>
      </div>
    </footer>
  );
}

export function cap(s: string) {
  return s.replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}
