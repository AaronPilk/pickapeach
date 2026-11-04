import { notFound } from "next/navigation";
import { ProfileBody } from "@/components/Profile";
import { Footer, JsonLd } from "@/components/Static";
import { creators, getCreator, related, toCard } from "@/lib/creators";
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
    title: `${c.name}${bits ? ` (${bits})` : ""}: photos, clips & socials`,
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
  return (
    <>
      <JsonLd data={profileGraph(c)} />
      <JsonLd data={breadcrumbs([{ name: "Creators", path: "/" }, { name: c.name, path: `/${c.slug}` }])} />
      <ProfileBody c={c} related={related(c, 8).map(toCard)} regionHref={c.region ? `/from/${c.region}` : undefined} />
      <Footer />
      <div style={{ height: 88 }} />
    </>
  );
}
