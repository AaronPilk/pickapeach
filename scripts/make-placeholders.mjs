// Generates the placeholder roster + media so the site runs end to end before
// the real creator sheet arrives. Every creator here is invented and flagged
// `placeholder: true`, which keeps the whole site noindex until real data lands.
//
//   node scripts/make-placeholders.mjs
//
// Writes: data/creators.json, public/media/ph/*.svg, public/media/ph/clip-*.mp4|jpg
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "public/media/ph");
mkdirSync(outDir, { recursive: true });

const people = [
  ["sienna", "Sienna", "sunset chaser, iced coffee loyalist", 23, "Miami, FL", "florida", "5'4", "Brunette", "Brown", ["brunette", "beach", "fitness"]],
  ["maya", "Maya", "soft voice, loud laugh", 22, "Austin, TX", "texas", "5'3", "Blonde", "Blue", ["blonde", "petite", "girl next door"]],
  ["juliet", "Juliet", "theatre kid who never grew out of it", 24, "New York, NY", "new-york", "5'7", "Redhead", "Green", ["redhead", "tall", "cosplay"]],
  ["ari", "Ari", "gym in the morning, games at night", 25, "San Diego, CA", "california", "5'5", "Black", "Brown", ["fitness", "gamer", "latina"]],
  ["brooke", "Brooke", "country roads and cowboy boots", 23, "Nashville, TN", "tennessee", "5'6", "Blonde", "Hazel", ["blonde", "country", "girl next door"]],
  ["nova", "Nova", "alt girl with a soft side", 22, "Seattle, WA", "washington", "5'2", "Black", "Grey", ["alt", "tattoos", "petite"]],
  ["tessa", "Tessa", "yoga, matcha, repeat", 26, "Tampa, FL", "florida", "5'5", "Brunette", "Hazel", ["brunette", "yoga", "fitness"]],
  ["lila", "Lila", "your favorite study buddy", 21, "Boston, MA", "massachusetts", "5'1", "Brunette", "Brown", ["brunette", "petite", "college"]],
  ["harper", "Harper", "tall, tan and a little bit trouble", 24, "Scottsdale, AZ", "arizona", "5'9", "Blonde", "Blue", ["blonde", "tall", "beach"]],
  ["remi", "Remi", "skater girl, bad jokes included", 22, "Denver, CO", "colorado", "5'4", "Redhead", "Blue", ["redhead", "alt", "girl next door"]],
  ["gia", "Gia", "pasta first, everything else second", 25, "Chicago, IL", "illinois", "5'3", "Black", "Brown", ["brunette", "curvy", "foodie"]],
  ["elle", "Elle", "fashion week every week", 23, "Los Angeles, CA", "california", "5'8", "Blonde", "Green", ["blonde", "tall", "fashion"]],
  ["kenzie", "Kenzie", "cheer captain energy", 21, "Atlanta, GA", "georgia", "5'2", "Brunette", "Blue", ["brunette", "petite", "college"]],
  ["paige", "Paige", "bookworm with a wild streak", 24, "Portland, OR", "oregon", "5'6", "Redhead", "Hazel", ["redhead", "girl next door", "cosplay"]],
  ["zoe", "Zoe", "beach days and golden hour", 22, "Honolulu, HI", "hawaii", "5'4", "Brunette", "Brown", ["brunette", "beach", "latina"]],
  ["ivy", "Ivy", "tattoos, coffee and good playlists", 26, "Las Vegas, NV", "nevada", "5'5", "Black", "Green", ["alt", "tattoos", "curvy"]],
  ["skye", "Skye", "lifts heavy, laughs louder", 25, "Orlando, FL", "florida", "5'7", "Blonde", "Blue", ["blonde", "fitness", "tall"]],
  ["luna", "Luna", "night owl, moon lover", 23, "Phoenix, AZ", "arizona", "5'3", "Black", "Brown", ["latina", "curvy", "petite"]],
  ["callie", "Callie", "small town girl, big city dreams", 22, "Charlotte, NC", "north-carolina", "5'5", "Blonde", "Hazel", ["blonde", "country", "college"]],
  ["sloane", "Sloane", "gamer by night, gym by day", 24, "Dallas, TX", "texas", "5'6", "Brunette", "Green", ["brunette", "gamer", "fitness"]],
];

const bios = [
  (n, t) => `Hey, I'm ${n}. ${cap(t)}. I post every day and I actually read my messages, so say hi.`,
  (n, t) => `${n} here. ${cap(t)}. Come see what I've been up to — new sets every week.`,
  (n, t) => `I'm ${n}, ${t}. Fair warning: I overshare and I love it.`,
  (n, t) => `${cap(t)}. That's me, ${n}. Follow along for the stuff I don't post anywhere else.`,
];
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Palette pairs (navy / coral / cream family) used to make each placeholder unique.
const palettes = [
  ["#0B1530", "#FF6B57", "#F7EEDC"],
  ["#111F44", "#FF8A73", "#FFE3C7"],
  ["#0E1A3A", "#F04E3E", "#F3D9C2"],
  ["#13234D", "#FF9E7A", "#FFF1DD"],
  ["#09122A", "#FF7A66", "#EADFC8"],
];

function photoSvg(seed, idx, initial) {
  const [navy, coral, cream] = palettes[(seed + idx) % palettes.length];
  const a = 20 + ((seed * 37 + idx * 53) % 60);
  const b = 25 + ((seed * 61 + idx * 29) % 55);
  const c = 30 + ((seed * 17 + idx * 71) % 50);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
<defs>
<radialGradient id="g1" cx="${a}%" cy="${b}%" r="70%"><stop offset="0" stop-color="${coral}" stop-opacity=".95"/><stop offset="1" stop-color="${coral}" stop-opacity="0"/></radialGradient>
<radialGradient id="g2" cx="${100 - c}%" cy="${100 - a}%" r="65%"><stop offset="0" stop-color="${cream}" stop-opacity=".75"/><stop offset="1" stop-color="${cream}" stop-opacity="0"/></radialGradient>
<radialGradient id="g3" cx="${c}%" cy="${90 - b / 2}%" r="55%"><stop offset="0" stop-color="#3B5BDB" stop-opacity=".35"/><stop offset="1" stop-color="#3B5BDB" stop-opacity="0"/></radialGradient>
<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .06 0"/></filter>
</defs>
<rect width="1080" height="1350" fill="${navy}"/>
<rect width="1080" height="1350" fill="url(#g1)"/>
<rect width="1080" height="1350" fill="url(#g2)"/>
<rect width="1080" height="1350" fill="url(#g3)"/>
<rect width="1080" height="1350" filter="url(#n)"/>
<text x="540" y="760" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="340" font-weight="700" fill="${cream}" fill-opacity=".18" letter-spacing="-12">${initial}</text>
</svg>`;
}

// Four looping clip variants shared across placeholder creators.
const clipVariants = [
  ["0xFF6B57", "0x0B1530"],
  ["0xFF8A73", "0x111F44"],
  ["0xF04E3E", "0x13234D"],
  ["0xFFB199", "0x0E1A3A"],
];
const clips = clipVariants.map((_, i) => ({
  src: `/media/ph/clip-${i + 1}.mp4`,
  poster: `/media/ph/clip-${i + 1}.jpg`,
  w: 720,
  h: 1280,
  duration: 6,
}));

function makeClips() {
  clipVariants.forEach(([c1, c2], i) => {
    const mp4 = join(outDir, `clip-${i + 1}.mp4`);
    const jpg = join(outDir, `clip-${i + 1}.jpg`);
    if (existsSync(mp4) && existsSync(jpg)) return;
    // Slow drifting gradient blob: a blurred circle moving over a navy field.
    const filter = [
      `color=c=${c2}:s=720x1280:d=6:r=30[bg]`,
      `color=c=${c1}:s=900x900:d=6:r=30,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*max(0,1-hypot(X-450,Y-450)/450)'[blob]`,
      `[bg][blob]overlay=x='-90+120*sin(2*PI*t/6+${i})':y='190+220*cos(2*PI*t/6+${i})'[m]`,
      `[m]gblur=sigma=40,noise=alls=6:allf=t,format=yuv420p[v]`,
    ].join(";");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-filter_complex", filter, "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-movflags", "+faststart", "-t", "6", mp4]);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1", "-i", mp4, "-frames:v", "1", "-q:v", "6", jpg]);
  });
}

makeClips();

const today = new Date();
const creators = people.map(([slug, name, tagline, age, location, region, height, hair, eyes, tags], i) => {
  const photos = Array.from({ length: 5 }, (_, j) => {
    const file = `${slug}-${j + 1}.svg`;
    writeFileSync(join(outDir, file), photoSvg(i, j, name[0]));
    return { src: `/media/ph/${file}`, w: 1080, h: 1350, alt: `${name}, photo ${j + 1}` };
  });
  const added = new Date(today.getTime() - (i * 3 + 1) * 86400000);
  return {
    slug,
    name,
    handle: `${slug}.peach`,
    tagline,
    bio: bios[i % bios.length](name, tagline),
    age,
    location,
    region,
    height,
    hair,
    eyes,
    tags,
    fansUrl: "https://onlyfans.com/",
    free: i % 4 !== 3,
    badge: i < 3 ? "new" : i % 5 === 0 ? "hot" : i % 7 === 2 ? "trending" : null,
    featured: i,
    addedAt: added.toISOString().slice(0, 10),
    updatedAt: today.toISOString().slice(0, 10),
    socials: {
      instagram: `${slug}.peach`,
      tiktok: `${slug}.peach`,
      x: i % 2 === 0 ? `${slug}peach` : undefined,
      snapchat: i % 3 === 0 ? `${slug}.snaps` : undefined,
      reddit: i % 4 === 1 ? `u/${slug}peach` : undefined,
    },
    photos,
    clips: [clips[i % 4], clips[(i + 1) % 4], clips[(i + 2) % 4]].map((c, k) => ({
      ...c,
      caption: ["new set is up", "golden hour hits different", "come say hi"][k],
    })),
    placeholder: true,
  };
});

writeFileSync(join(root, "data/creators.json"), JSON.stringify(creators, null, 2) + "\n");
console.log(`wrote ${creators.length} placeholder creators`);
