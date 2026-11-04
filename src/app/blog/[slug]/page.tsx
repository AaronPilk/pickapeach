import Link from "next/link";
import { notFound } from "next/navigation";
import CreatorCard from "@/components/CreatorCard";
import { Footer, JsonLd } from "@/components/Static";
import { ChevronRight } from "@/components/Icons";
import { getPost, posts } from "@/lib/blog";
import { toCard } from "@/lib/creators";
import { breadcrumbs, faqGraph, pageMeta } from "@/lib/seo";
import { absUrl, site } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) return {};
  const m = pageMeta({ title: p.title, description: p.description, path: `/blog/${p.slug}`, image: p.picks?.[0]?.photos[0]?.src, type: "article" });
  return { ...m, keywords: p.keywords, openGraph: { ...m.openGraph, type: "article", publishedTime: p.published, modifiedTime: p.updated } };
}

function fmtDate(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) notFound();
  const url = absUrl(`/blog/${p.slug}`);
  const more = posts.filter((x) => x.slug !== p.slug && x.kind === p.kind).slice(0, 4);
  const wordCount = [p.tldr, ...p.sections.flatMap((s) => s.body), ...p.faqs.map((f) => f.a)].join(" ").split(/\s+/).length;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "@id": `${url}#article`,
          mainEntityOfPage: url,
          headline: p.title,
          description: p.description,
          abstract: p.tldr,
          datePublished: p.published,
          dateModified: p.updated,
          inLanguage: "en-US",
          wordCount,
          keywords: p.keywords.join(", "),
          author: { "@type": "Organization", name: `${site.name} editorial team`, url: absUrl("/about") },
          publisher: { "@id": absUrl("/#org") },
          image: absUrl(p.picks?.[0]?.photos[0]?.src && !p.picks[0].photos[0].src.endsWith(".svg") ? p.picks[0].photos[0].src : "/og.jpg"),
          isPartOf: { "@id": absUrl("/blog") },
          speakable: { "@type": "SpeakableSpecification", cssSelector: [".tldr", "h1"] },
          ...(p.picks
            ? {
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: p.picks.length,
                  itemListElement: p.picks.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: absUrl(`/${c.slug}`), name: c.name })),
                },
              }
            : {}),
        }}
      />
      <JsonLd data={faqGraph(p.faqs)} />
      <JsonLd data={breadcrumbs([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: p.title, path: `/blog/${p.slug}` }])} />
      <div className="wrap">
        <article className="article">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> <span>/</span> <Link href="/blog">Blog</Link>
          </nav>
          <h1 className="t-large">{p.title}</h1>
          <p className="article-dek">{p.dek}</p>
          <p className="article-meta">
            By the {site.name} team · Updated <time dateTime={p.updated}>{fmtDate(p.updated)}</time> · {p.readMins} min read
          </p>

          <aside className="tldr" aria-label="Quick answer">
            <b>Quick answer</b>
            <p>{p.tldr}</p>
          </aside>

          {p.sections.length > 2 && (
            <nav className="toc" aria-label="On this page">
              <b>On this page</b>
              <ol>
                {p.sections.map((s) => (
                  <li key={s.id}><a href={`#${s.id}`}>{s.h}</a></li>
                ))}
                {p.picks && <li><a href="#picks">The list</a></li>}
                <li><a href="#faq">FAQ</a></li>
              </ol>
            </nav>
          )}

          {p.sections.map((s) => (
            <section key={s.id} id={s.id}>
              <h2>{s.h}</h2>
              {renderBody(s.body)}
            </section>
          ))}

          {p.picks && (
            <section id="picks">
              <h2>The list</h2>
              <ol className="picks">
                {p.picks.map((c, i) => (
                  <li key={c.slug}>
                    <h3>
                      {i + 1}. <Link href={`/${c.slug}`}>{c.name}</Link>
                      {c.age ? <span className="c3" style={{ fontWeight: 400 }}> · {c.age}</span> : null}
                    </h3>
                    <p className="c2">{[c.location, c.free ? "Free page" : "Subscription page", c.clips.length ? `${c.clips.length} clips` : ""].filter(Boolean).join(" · ")}</p>
                    <p>{c.bio}</p>
                  </li>
                ))}
              </ol>
              <div className="grid" style={{ marginTop: 18 }}>
                {p.picks.slice(0, 8).map((c, i) => (
                  <CreatorCard key={c.slug} c={toCard(c)} index={i} list={`blog:${p.slug}`} />
                ))}
              </div>
            </section>
          )}

          <section id="faq">
            <h2>FAQ</h2>
            <div className="faq" style={{ marginTop: 12 }}>
              {p.faqs.map((f) => (
                <details key={f.q} open>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="article-cta cell">
            <div>
              <b className="t-headline">Find your new favorite</b>
              <p className="t-foot c2">Hand-picked creators, most pages free to follow.</p>
            </div>
            <Link href="/" className="btn btn-primary btn-sm">Browse creators</Link>
          </div>
        </article>

        {more.length > 0 && (
          <section className="section" style={{ maxWidth: 720 }}>
            <h2 className="group-label" style={{ padding: "0 4px 8px" }}>Keep reading</h2>
            <div className="post-list">
              {more.map((x) => (
                <Link key={x.slug} href={`/blog/${x.slug}`} className="post-row">
                  <span className="t-headline">{x.title}</span>
                  <ChevronRight />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer />
      <div className="dock-spacer" />
    </>
  );
}

function renderBody(body: string[]) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(<ul key={`ul-${out.length}`}>{list.map((li) => <li key={li}>{li}</li>)}</ul>);
      list = [];
    }
  };
  body.forEach((b, i) => {
    if (b.startsWith("- ")) list.push(b.slice(2));
    else {
      flush();
      out.push(<p key={i}>{b}</p>);
    }
  });
  flush();
  return out;
}
