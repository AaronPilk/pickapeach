import type { Metadata } from "next";
import { absUrl, indexable, site } from "./site";
import type { Creator } from "./types";
import { socialLinks } from "./creators";

export function pageMeta({ title, description, path, image, type = "website" }: { title: string; description: string; path: string; image?: string; type?: "website" | "profile" | "article" }): Metadata {
  const img = image && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(image) ? absUrl(image) : absUrl("/og.jpg");
  return {
    title,
    description,
    alternates: { canonical: absUrl(path) },
    openGraph: { title, description, url: absUrl(path), siteName: site.name, type, locale: site.locale, images: [{ url: img, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [img] },
    robots: indexable ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } : { index: false, follow: true },
  };
}

export const orgId = absUrl("/#org");
export const siteId = absUrl("/#website");

export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: site.name,
        url: absUrl("/"),
        logo: { "@type": "ImageObject", url: absUrl("/icon-512.png"), width: 512, height: 512 },
        description: site.description,
        email: site.contactEmail,
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        name: site.name,
        url: absUrl("/"),
        description: site.description,
        publisher: { "@id": orgId },
        inLanguage: "en-US",
        potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: absUrl("/?q={search_term_string}") }, "query-input": "required name=search_term_string" },
      },
    ],
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absUrl(it.path) })),
  };
}

export function itemList(name: string, path: string, list: Creator[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absUrl(path),
    name,
    url: absUrl(path),
    isPartOf: { "@id": siteId },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: list.length,
      itemListElement: list.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: absUrl(`/${c.slug}`), name: c.name })),
    },
  };
}

export function profileGraph(c: Creator) {
  const url = absUrl(`/${c.slug}`);
  const sameAs = [...socialLinks(c).map((s) => s.url), c.fansUrl].filter((u) => /^https?:/.test(u) && !/^https?:\/\/onlyfans\.com\/?$/.test(u));
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": url,
    url,
    name: `${c.name} — ${c.tagline}`,
    dateCreated: c.addedAt,
    dateModified: c.updatedAt,
    isPartOf: { "@id": siteId },
    primaryImageOfPage: c.photos[0] ? absUrl(c.photos[0].src) : undefined,
    mainEntity: {
      "@type": "Person",
      "@id": `${url}#person`,
      name: c.name,
      alternateName: c.handle,
      description: c.bio,
      image: c.photos.slice(0, 5).map((p) => absUrl(p.src)),
      url,
      sameAs: sameAs.length ? sameAs : undefined,
      homeLocation: c.location ? { "@type": "Place", name: c.location } : undefined,
      knowsAbout: c.tags.length ? c.tags : undefined,
      subjectOf: c.clips.length
        ? c.clips.slice(0, 6).map((v, i) => ({
            "@type": "VideoObject",
            name: `${c.name} clip ${i + 1}`,
            description: v.caption || `${c.name}: ${c.tagline}`,
            thumbnailUrl: absUrl(v.poster),
            contentUrl: absUrl(v.src),
            uploadDate: c.updatedAt,
            duration: v.duration ? `PT${Math.round(v.duration)}S` : undefined,
          }))
        : undefined,
    },
  };
}

export function faqGraph(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export const FAQS = [
  {
    q: "What is Pick a Peach?",
    a: "Pick a Peach is a hand-picked directory of independent creators. Every profile has a few photos, short clips, the creator's social accounts, and a button that takes you straight to her own page.",
  },
  {
    q: "Is it free to use?",
    a: "Yes. Browsing Pick a Peach is free, and many of the creators listed here have free pages you can follow at no cost. Pages marked Free cost nothing to follow.",
  },
  {
    q: "How do I follow a creator?",
    a: "Open her profile and tap the Follow button. It takes you directly to her official page, where you can follow her. Pick a Peach never asks for payment details.",
  },
  {
    q: "What is VIP?",
    a: "VIP is a free members area. Enter your email and mobile number once and you get extra photos and clips on every profile, plus creators we only show to members.",
  },
  {
    q: "What do you do with my email and phone number?",
    a: "We use them to unlock VIP on your device and, if you agree, to send occasional updates about new creators. You can reply STOP to any text or unsubscribe from any email. We never sell your details.",
  },
  {
    q: "Are the creators real and over 18?",
    a: "Every creator listed is a real, independent adult who is 18 or older and has agreed to be featured. Profiles link to their official accounts.",
  },
  {
    q: "I'm a creator. How do I get listed?",
    a: "Apply on our Get listed page with your socials and your page link. We review every application and reach out if it's a fit.",
  },
];
