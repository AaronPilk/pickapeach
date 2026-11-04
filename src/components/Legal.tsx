import Link from "next/link";
import { Footer } from "./Static";
import { legal } from "@/lib/legal";

export function LegalPage({ title, intro, toc, children }: { title: string; intro?: React.ReactNode; toc?: [string, string][]; children: React.ReactNode }) {
  return (
    <>
      <div className="wrap">
        <article className="prose">
          <h1 className="t-large">{title}</h1>
          <p className="faint">Last updated {legal.effective}</p>
          {intro}
          {toc && (
            <nav className="toc" aria-label="On this page">
              <ol>
                {toc.map(([id, label]) => (
                  <li key={id}><a href={`#${id}`}>{label}</a></li>
                ))}
              </ol>
            </nav>
          )}
          {children}
          <p className="faint" style={{ marginTop: 32 }}>
            Related: <Link href="/terms">Terms of Service</Link> · <Link href="/privacy">Privacy Policy</Link> · <Link href="/cookies">Cookie Policy</Link> ·{" "}
            <Link href="/creator-terms">Creator Terms</Link> · <Link href="/content-removal">Report content</Link> · <Link href="/18-plus">18+ statement</Link> ·{" "}
            <Link href="/privacy-choices">Your Privacy Choices</Link>
          </p>
        </article>
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} style={{ scrollMarginTop: 80 }}>{children}</h2>;
}

export function Contact() {
  return (
    <>
      Email <a href={`mailto:${legal.email}`}>{legal.email}</a>
      {legal.address ? <>, or write to {legal.entity}, {legal.address}</> : null}.
    </>
  );
}
