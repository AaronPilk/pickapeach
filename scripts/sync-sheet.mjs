// Pulls the creator roster from the Google Sheet and writes data/creators.json.
//
// Usage:
//   SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=0" npm run sync:sheet
//   npm run sync:sheet -- ./roster.csv          (a downloaded CSV works too)
//
// Sheet columns (header row, any order, case-insensitive). Only name + fans_url are required.
//   name | slug | handle | tagline | bio | age | location | height | hair | eyes | tags
//   fans_url | free | badge | featured | added | active | tier
// tier: "agency" (default, shown to everyone) or "locked" (members-only, unlocked with email + phone).
// Locked girls never go in the public repo: they're pushed to Supabase. That needs the dashboard
// password:  ADMIN_PASSWORD=... SHEET_CSV_URL=... npm run sync:sheet
//   instagram | tiktok | x | snapchat | reddit | threads | youtube | telegram
//   photos | clips | clip_posters
// Lists (tags, photos, clips, clip_posters) can be separated by commas, pipes or new lines.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const src = process.argv[2] || process.env.SHEET_CSV_URL;
if (!src) {
  console.error("Set SHEET_CSV_URL or pass a CSV path.");
  process.exit(1);
}

const csv = /^https?:/.test(src) ? await (await fetch(src)).text() : readFileSync(src, "utf8");
const rows = parseCsv(csv).filter((r) => r.some((c) => c.trim() !== ""));
if (rows.length < 2) {
  console.error("Sheet is empty.");
  process.exit(1);
}

const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
const alias = {
  fans: "fans_url", fanslink: "fans_url", fans_link: "fans_url", onlyfans: "fans_url", of_link: "fans_url", link: "fans_url",
  ig: "instagram", insta: "instagram", twitter: "x", snap: "snapchat", tt: "tiktok",
  pics: "photos", images: "photos", videos: "clips", posters: "clip_posters", date_added: "added",
};
const cols = header.map((h) => alias[h] || h);

const RESERVED = new Set(["clips", "browse", "from", "new", "trending", "faq", "about", "privacy", "terms", "admin", "vip", "apply", "api", "go", "media", "llms", "sitemap", "robots", "more", "members", "blog", "creator", "m"]);
const STATES = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado", CT: "connecticut", DE: "delaware",
  FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa", KS: "kansas", KY: "kentucky",
  LA: "louisiana", ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi",
  MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada", NH: "new-hampshire", NJ: "new-jersey", NM: "new-mexico",
  NY: "new-york", NC: "north-carolina", ND: "north-dakota", OH: "ohio", OK: "oklahoma", OR: "oregon", PA: "pennsylvania",
  RI: "rhode-island", SC: "south-carolina", SD: "south-dakota", TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont",
  VA: "virginia", WA: "washington", WV: "west-virginia", WI: "wisconsin", WY: "wyoming", DC: "washington-dc",
};

const today = new Date().toISOString().slice(0, 10);
const seen = new Set();
const creators = [];
const locked = [];

rows.slice(1).forEach((r, i) => {
  const row = Object.fromEntries(cols.map((c, j) => [c, (r[j] ?? "").trim()]));
  if (!row.name || !row.fans_url) return;
  if (row.active && /^(no|n|false|0|off)$/i.test(row.active)) return;

  let slug = slugify(row.slug || row.handle || row.name);
  if (RESERVED.has(slug)) slug = `${slug}-${i + 1}`;
  while (seen.has(slug)) slug = `${slug}-${i + 1}`;
  seen.add(slug);

  const photos = list(row.photos).map((u, k) => ({ src: driveFix(u), w: 1080, h: 1350, alt: `${row.name}, photo ${k + 1}` }));
  const posters = list(row.clip_posters).map(driveFix);
  const clips = list(row.clips).map((u, k) => ({ src: driveFix(u), poster: posters[k] || photos[k % Math.max(photos.length, 1)]?.src || "", w: 720, h: 1280, duration: 0 }));

  const isLocked = /^(locked|members?|gated|vip|other|non-?agency)$/i.test(row.tier || "") || /^(yes|y|true|1)$/i.test(row.locked || "");
  (isLocked ? locked : creators).push({
    slug: isLocked && !slug.startsWith("m-") ? `m-${slug}` : slug,
    name: row.name,
    handle: clean(row.handle) || undefined,
    tagline: row.tagline || "",
    bio: row.bio || row.tagline || `${row.name} posts new content every week.`,
    age: row.age ? Number(row.age) || undefined : undefined,
    location: row.location || undefined,
    region: regionOf(row.location),
    height: row.height || undefined,
    hair: row.hair ? title(row.hair) : undefined,
    eyes: row.eyes ? title(row.eyes) : undefined,
    tags: list(row.tags).map((t) => t.toLowerCase()),
    fansUrl: row.fans_url,
    free: row.free ? !/^(no|n|false|0|paid)$/i.test(row.free) : true,
    badge: ["new", "hot", "trending"].includes((row.badge || "").toLowerCase()) ? row.badge.toLowerCase() : null,
    featured: row.featured ? Number(row.featured) : i,
    addedAt: normDate(row.added) || today,
    updatedAt: today,
    socials: prune({
      instagram: clean(row.instagram), tiktok: clean(row.tiktok), x: clean(row.x), snapchat: clean(row.snapchat),
      reddit: clean(row.reddit), threads: clean(row.threads), youtube: clean(row.youtube), telegram: clean(row.telegram),
    }),
    photos,
    clips,
  });
});

writeFileSync(join(root, "data/creators.json"), JSON.stringify(creators, null, 2) + "\n");
console.log(`synced ${creators.length} agency creators from the sheet`);

if (locked.length) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    writeFileSync(join(root, "data/locked.local.json"), JSON.stringify(locked, null, 2));
    console.log(`${locked.length} members-only girls saved to data/locked.local.json (not committed). Re-run with ADMIN_PASSWORD set to push them live.`);
  } else {
    const base = process.env.SUPABASE_URL || "https://qcuzrmceswanetrmimzn.supabase.co";
    const key = process.env.SUPABASE_KEY || "sb_publishable_zG7RWc6SzzTIVBRMPXSJ0w_K0tLxwfD";
    const call = async (fn, body) => {
      const r = await fetch(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: key, "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
      return r.json();
    };
    const token = await call("admin_login", { p_password: password });
    if (!token) throw new Error("Wrong dashboard password.");
    const n = await call("admin_upsert_locked", { p_token: token, p_rows: locked, p_replace: true });
    console.log(`pushed ${n} members-only girls to Supabase (live within 5 minutes, no redeploy needed)`);
  }
}

function list(v) { return (v || "").split(/[\n|,]+/).map((s) => s.trim()).filter(Boolean); }
function slugify(s) { return s.toLowerCase().replace(/^@/, "").normalize("NFKD").replace(/[^\w\s-]/g, "").replace(/[\s_.]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }
function clean(v) { return (v || "").trim().replace(/^@/, "") || undefined; }
function title(s) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
function prune(o) { return Object.fromEntries(Object.entries(o).filter(([, v]) => v)); }
function normDate(v) { if (!v) return ""; const d = new Date(v); return isNaN(d) ? "" : d.toISOString().slice(0, 10); }
function regionOf(loc) {
  if (!loc) return undefined;
  const m = loc.match(/,\s*([A-Za-z]{2})\b/);
  if (m && STATES[m[1].toUpperCase()]) return STATES[m[1].toUpperCase()];
  const full = Object.values(STATES).find((s) => loc.toLowerCase().includes(s.replace(/-/g, " ")));
  return full || slugify(loc.split(",").pop() || loc);
}
// Turns a Google Drive share link into a direct image link.
function driveFix(u) {
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : u;
}
function parseCsv(text) {
  const out = []; let row = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); out.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}
