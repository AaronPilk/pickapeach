// Fails the build on bad roster data so a typo in the sheet never ships a broken page.
import { readFileSync } from "node:fs";

const creators = JSON.parse(readFileSync(new URL("../data/creators.json", import.meta.url), "utf8"));
const RESERVED = new Set(["clips", "browse", "from", "new", "trending", "faq", "about", "privacy", "terms", "admin", "vip", "apply", "api", "go", "media", "llms", "sitemap", "robots", "more", "members", "blog"]);
const errors = [];
const slugs = new Set();

for (const c of creators) {
  const at = `creator "${c.name || c.slug}"`;
  if (!c.slug || !/^[a-z0-9-]+$/.test(c.slug)) errors.push(`${at}: bad slug "${c.slug}"`);
  if (slugs.has(c.slug)) errors.push(`${at}: duplicate slug`);
  if (RESERVED.has(c.slug)) errors.push(`${at}: slug "${c.slug}" clashes with a site page`);
  slugs.add(c.slug);
  if (!c.name) errors.push(`${at}: missing name`);
  if (!/^https?:\/\//.test(c.fansUrl || "")) errors.push(`${at}: fans link must start with http(s)://`);
  if (typeof c.age === "number" && c.age < 18) errors.push(`${at}: age under 18 is not allowed`);
  if (!Array.isArray(c.photos)) errors.push(`${at}: photos must be a list`);
}

if (errors.length) {
  console.error("Roster check failed:\n  " + errors.join("\n  "));
  process.exit(1);
}
console.log(`roster ok: ${creators.length} creators`);
