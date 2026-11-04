import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipGrid, FollowButton, Gallery, ProfileView, ShareButton, SocialLinks, StickyCta, VipSection } from "@/components/Profile";
import CreatorCard from "@/components/CreatorCard";
import { Footer, JsonLd } from "@/components/Static";
import { Clips as ClipsIcon, Pin } from "@/components/Icons";
import { creators, getCreator, related, socialLinks, tagSlug, toCard, regionLabel } from "@/lib/creators";
import { breadcrumbs, pageMeta, profileGraph } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return creators.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCreator(slug);
  if (!c) return {};
  const bits = [c.age ? `${c.age}` : "", c.location || ""].filter(Boolean).join(", ");
  return pageMeta({
    title: `${c.name}${bits ? ` (${bits})` : ""} — photos, clips & socials`,
    description: `${c.name}: ${c.tagline}. See her photos and clips, find her socials, and follow her ${c.free ? "free " : ""}on her official page.`,
    path: `/${c.slug}`,
    image: c.photos[0]?.src,
    type: "profile",
  });
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCreator(slug);
  if (!c) notFound();
  const links = socialLinks(c);
  const more = related(c, 8).map(toCard);
  const lite = { slug: c.slug, name: c.name, free: c.free, tagline: c.tagline };

  return (
    <>
      <JsonLd data={profileGraph(c)} />
      <JsonLd data={breadcrumbs([{ name: "Creators", path: "/" }, { name: c.name, path: `/${c.slug}` }])} />
      <ProfileView slug={c.slug} />
      <div className="wrap">
        <article className="profile">
          <Gallery photos={c.photos} name={c.name} />
          <div>
            <div className="info glass">
              <nav className="crumbs only-desktop" aria-label="Breadcrumb">
                <Link href="/">Creators</Link> <span>/</span> <span>{c.name}</span>
              </nav>
              <div className="info-head">
                <div className="avatar">
                  <img src={c.photos[0]?.src} alt="" width={68} height={68} />
                  <span className="live" aria-hidden />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {c.free ? <span className="card-badge badge-free" style={{ position: "static", marginBottom: 6 }}>Free page</span> : null}
                  <h1>{c.name}</h1>
                  {c.handle && <div className="handle">@{c.handle}</div>}
                </div>
                <span className="only-desktop">
                  <ShareButton name={c.name} />
                </span>
              </div>
              <p className="tagline">{c.tagline}</p>
              <div className="stats">
                {c.age ? <span className="stat"><span>Age</span><b>{c.age}</b></span> : null}
                {c.location ? (
                  c.region ? (
                    <Link href={`/from/${c.region}`} className="stat"><Pin style={{ width: 13, height: 13, alignSelf: "center" }} /><b>{c.location}</b></Link>
                  ) : (
                    <span className="stat"><span>From</span><b>{c.location}</b></span>
                  )
                ) : null}
                {c.height ? <span className="stat"><span>Height</span><b>{c.height}</b></span> : null}
                {c.hair ? <span className="stat"><span>Hair</span><b>{c.hair}</b></span> : null}
                {c.eyes ? <span className="stat"><span>Eyes</span><b>{c.eyes}</b></span> : null}
              </div>
              <div className="cta-row" id="main-cta">
                <FollowButton c={lite} where="profile" />
                {c.clips.length > 0 && (
                  <Link href={`/clips?c=${c.slug}`} className="btn btn-glass" aria-label={`Watch ${c.name}'s clips`} data-track="watch_clips" data-creator={c.slug}>
                    <ClipsIcon /> Clips
                  </Link>
                )}
              </div>
              <SocialLinks c={c} links={links} />
              <div className="about">
                <h2>About {c.name}</h2>
                <p>{c.bio}</p>
                {c.tags.length > 0 && (
                  <div className="filter-opts" style={{ marginTop: 12 }}>
                    {c.tags.map((t) => (
                      <Link key={t} href={`/browse/${tagSlug(t)}`} className="chip" style={{ height: 32, fontSize: "0.8rem" }}>
                        #{t.replace(/\s+/g, "")}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <VipSection c={lite} />
          </div>
        </article>

        {c.clips.length > 0 && (
          <section className="section" aria-labelledby="clips-h">
            <div className="section-head">
              <h2 id="clips-h">{c.name}&apos;s clips</h2>
              <Link href={`/clips?c=${c.slug}`}>Full screen</Link>
            </div>
            <ClipGrid c={lite} clips={c.clips} />
          </section>
        )}

        <section className="section" aria-labelledby="more-h">
          <div className="section-head">
            <h2 id="more-h">You might also like</h2>
            {c.region && <Link href={`/from/${c.region}`}>More from {regionLabel(c.region)}</Link>}
          </div>
          <div className="grid">
            {more.map((m, i) => (
              <CreatorCard key={m.slug} c={m} index={i} list={`related:${c.slug}`} />
            ))}
          </div>
        </section>
      </div>
      <Footer />
      <div style={{ height: 96 }} />
      <StickyCta c={lite} avatar={c.photos[0]?.src || ""} sentinelId="main-cta" />
    </>
  );
}
