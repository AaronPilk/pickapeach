// Who runs the site, for the Terms, Privacy Policy and copyright notices.
import { site } from "./config";

export { SMS_CONSENT_TEXT } from "./sms";

export const legal = {
  // Set these at build time (Cloudflare Pages → Settings → Variables) before launch. See README → Legal.
  entity: process.env.NEXT_PUBLIC_LEGAL_ENTITY || site.name,
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || "",
  state: "Florida",
  venue: "Pinellas County, Florida",
  effective: "November 4, 2026",
  email: site.contactEmail,
  privacyEmail: process.env.NEXT_PUBLIC_PRIVACY_EMAIL || site.contactEmail,
  dmcaEmail: process.env.NEXT_PUBLIC_DMCA_EMAIL || site.contactEmail,
};
