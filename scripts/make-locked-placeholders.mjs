// Invented members-only girls so the gate can be demoed before real ones are added.
// Writes SVG art to public/media/ph/ and prints JSON rows for admin_upsert_locked().
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const out = join(root, "public/media/ph");
const people = [
  ["aspen", "Aspen", "mountain girl, city habits", 24, "Boulder, CO", "colorado", "Blonde", ["blonde", "outdoors"]],
  ["bianca", "Bianca", "espresso and late nights", 23, "Miami, FL", "florida", "Brunette", ["brunette", "latina"]],
  ["celeste", "Celeste", "soft girl era, permanently", 22, "San Jose, CA", "california", "Black", ["petite", "girl next door"]],
  ["daisy", "Daisy", "farm raised, beach obsessed", 25, "Savannah, GA", "georgia", "Blonde", ["blonde", "country"]],
  ["eden", "Eden", "pilates princess", 24, "Austin, TX", "texas", "Brunette", ["fitness", "yoga"]],
  ["frankie", "Frankie", "tattoos and a terrible sense of humor", 26, "Portland, OR", "oregon", "Redhead", ["redhead", "alt", "tattoos"]],
  ["hazel", "Hazel", "freckles and good vibes only", 21, "Columbus, OH", "ohio", "Redhead", ["redhead", "college"]],
  ["indie", "Indie", "vinyl collector, vintage everything", 23, "Brooklyn, NY", "new-york", "Brunette", ["alt", "girl next door"]],
  ["jade", "Jade", "gym, glam, repeat", 25, "Las Vegas, NV", "nevada", "Black", ["fitness", "curvy"]],
  ["kira", "Kira", "anime nights, cosplay weekends", 22, "Seattle, WA", "washington", "Black", ["cosplay", "gamer"]],
  ["leah", "Leah", "your sunny Sunday", 24, "San Diego, CA", "california", "Blonde", ["blonde", "beach"]],
  ["mila", "Mila", "tiny, loud, and proud of it", 21, "Tampa, FL", "florida", "Brunette", ["petite", "college"]],
  ["noelle", "Noelle", "snow bunny turned beach bum", 26, "Denver, CO", "colorado", "Blonde", ["blonde", "tall"]],
  ["piper", "Piper", "cheer, coffee, chaos", 22, "Nashville, TN", "tennessee", "Blonde", ["blonde", "country"]],
  ["rosie", "Rosie", "curves and confidence", 25, "Chicago, IL", "illinois", "Brunette", ["curvy", "brunette"]],
  ["sage", "Sage", "plant mom, moon child", 23, "Phoenix, AZ", "arizona", "Brunette", ["alt", "yoga"]],
];
const pal = [["#0E1A3A", "#FF7A66", "#FFE3C7"], ["#122046", "#F04E3E", "#F7EEDC"], ["#0B1530", "#FF9E7A", "#EADFC8"], ["#13234D", "#FF6B57", "#FFF1DD"]];
function svg(seed, idx, initial) {
  const [n, c, k] = pal[(seed + idx) % pal.length];
  const a = 25 + ((seed * 41 + idx * 23) % 50), b = 30 + ((seed * 13 + idx * 59) % 45);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350"><defs><radialGradient id="a" cx="${a}%" cy="${b}%" r="75%"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient><radialGradient id="b" cx="${100 - a}%" cy="${100 - b}%" r="60%"><stop offset="0" stop-color="${k}" stop-opacity=".8"/><stop offset="1" stop-color="${k}" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1350" fill="${n}"/><rect width="1080" height="1350" fill="url(#a)"/><rect width="1080" height="1350" fill="url(#b)"/><text x="540" y="760" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="320" font-weight="700" fill="${k}" fill-opacity=".2">${initial}</text></svg>`;
}
const rows = people.map(([slug, name, tagline, age, location, region, hair, tags], i) => {
  const photos = [1, 2, 3].map((j) => {
    const f = `m-${slug}-${j}.svg`;
    writeFileSync(join(out, f), svg(i, j, name[0]));
    return { src: `/media/ph/${f}`, w: 1080, h: 1350 };
  });
  return {
    slug: `m-${slug}`, name, tagline, bio: `${name} here. ${tagline.charAt(0).toUpperCase() + tagline.slice(1)}. Members get to see me first.`,
    age, location, region, hair, tags, fansUrl: "https://onlyfans.com/", free: i % 3 !== 2, featured: i,
    photos, clips: [{ src: `/media/ph/clip-${(i % 4) + 1}.mp4`, poster: `/media/ph/clip-${(i % 4) + 1}.jpg`, w: 720, h: 1280, duration: 6 }],
    socials: { instagram: `${slug}.members`, tiktok: `${slug}.members` },
  };
});
console.log(JSON.stringify(rows));
