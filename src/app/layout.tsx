import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Ambient, Dock, Header, Reveal } from "@/components/Chrome";
import Tracker from "@/components/Tracker";
import AgeGate from "@/components/AgeGate";
import UnlockSheet from "@/components/UnlockSheet";
import { JsonLd } from "@/components/Static";
import { absUrl, indexable, site } from "@/lib/site";
import { siteGraph } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} · ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: absUrl("/") },
  robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: { siteName: site.name, type: "website", locale: site.locale, images: [{ url: absUrl("/og.jpg"), width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
  other: site.adultRating ? { rating: "adult" } : {},
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: site.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <JsonLd data={siteGraph()} />
        {site.gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${site.gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${site.gaId}',{send_page_view:false});`,
              }}
            />
          </>
        )}
      </head>
      <body>
        <Ambient />
        <Header />
        <main>{children}</main>
        <Dock />
        <UnlockSheet />
        <AgeGate />
        <Tracker />
        <Reveal />
      </body>
    </html>
  );
}
