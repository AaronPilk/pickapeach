import { allRegions, allTags, byRegion, byTagSlug, regionLabel } from "./creators";
import type { Creator } from "./types";

export type Section = { id: string; h: string; body: string[] };
export type Post = {
  slug: string;
  title: string;
  description: string;
  dek: string;
  kind: "guide" | "picks";
  published: string;
  updated: string;
  tldr: string;
  sections: Section[];
  faqs: { q: string; a: string }[];
  keywords: string[];
  picks?: Creator[];
  readMins: number;
};

// Paragraph strings starting with "- " render as list items.
const guides: Omit<Post, "readMins" | "kind">[] = [
  {
    slug: "how-to-find-onlyfans-creators",
    title: "How to find OnlyFans creators you'll actually like",
    description: "OnlyFans has no real search. Here's how people actually find creators worth following in 2026, from directories to socials, and how to avoid wasting money on the wrong pages.",
    dek: "OnlyFans doesn't let you browse. This is how people find creators anyway.",
    published: "2026-11-04",
    updated: "2026-11-04",
    tldr: "OnlyFans has no browse or search feature for fans, so most people find creators through their social accounts or through curated directories like Pick a Peach. Start with free pages, check that the creator links to the page from her own socials, and follow a few before you pay for anything.",
    keywords: ["find onlyfans creators", "onlyfans search", "onlyfans directory", "best onlyfans pages"],
    sections: [
      {
        id: "why-its-hard",
        h: "Why is it hard to find creators on OnlyFans?",
        body: [
          "OnlyFans was built as a subscription tool for creators who already have an audience, not as a place to browse. There's no public feed, no category pages and no recommendation engine for fans. If you don't already know a creator's username, the site itself won't help you find her.",
          "That's why almost all discovery happens somewhere else: on Instagram, TikTok, X and Reddit, or on directory sites that collect creators in one place.",
        ],
      },
      {
        id: "use-a-directory",
        h: "Use a curated directory",
        body: [
          "A good directory does the searching for you. On Pick a Peach every profile shows a handful of photos, a few short clips, the creator's social accounts and one button that goes straight to her official page. You can filter by vibe, hair, age range and location, and you can see right away whether her page is free.",
          "Curated matters. Big scraped directories list thousands of accounts, many of them inactive, duplicated or fake. A short list picked by people is faster to get through and far less likely to send you somewhere sketchy.",
        ],
      },
      {
        id: "follow-socials",
        h: "Follow the socials first",
        body: [
          "Most creators post their personality on Instagram or TikTok and their subscription link in the bio. Following a creator there for a week tells you a lot: how often she posts, what her style is, and whether she actually talks to her followers.",
          "When a creator links her page from her own verified social account, you also know the page is really hers.",
        ],
      },
      {
        id: "start-free",
        h: "Start with free pages",
        body: [
          "Plenty of creators run free pages. You can follow them at no cost and see their regular posts, and they sell extra content through messages if you want it. It's the easiest way to find out who you like before you spend anything.",
          "On Pick a Peach, free pages are marked on every card and profile, and you can filter the whole directory to free pages only.",
        ],
      },
      {
        id: "checklist",
        h: "A quick checklist before you subscribe",
        body: [
          "- The page is linked from the creator's own social accounts or a directory profile that links to them.",
          "- She's posted recently. A page with nothing new in a month usually isn't worth paying for.",
          "- The price matches what you expected, and you know whether it renews automatically.",
          "- You've looked at her free content (socials, clips, free page) and you actually like her style.",
        ],
      },
    ],
    faqs: [
      { q: "Can you search for creators on OnlyFans?", a: "Not in any useful way. OnlyFans doesn't offer browsing or category search for fans, so people use social media and directories to find creators." },
      { q: "Is it free to browse Pick a Peach?", a: "Yes. Browsing is free, and many of the creators listed have free pages you can follow at no cost." },
      { q: "How do I know a creator's page is real?", a: "Check that the page is linked from her own social accounts. Every Pick a Peach profile links to the creator's socials and official page so you can confirm it." },
    ],
  },
  {
    slug: "free-vs-paid-onlyfans",
    title: "Free vs paid OnlyFans pages: what's the difference?",
    description: "Free OnlyFans pages cost nothing to follow, paid pages charge a monthly subscription. Here's what you actually get with each, and which one makes sense for you.",
    dek: "Same platform, two very different setups. What you get with each.",
    published: "2026-11-04",
    updated: "2026-11-04",
    tldr: "A free page costs nothing to follow and shows regular posts, with extra content sold through paid messages. A paid page charges a monthly subscription that unlocks the main feed, and may still sell extras. Free pages are best for trying creators out; paid pages suit fans who want everything in the feed without buying posts one by one.",
    keywords: ["free onlyfans", "free vs paid onlyfans", "onlyfans subscription", "free onlyfans pages"],
    sections: [
      {
        id: "free",
        h: "How do free pages work?",
        body: [
          "A free page is exactly what it sounds like: you follow it without paying. You'll see the creator's regular feed posts. Creators with free pages usually make their money through paid messages, tips and custom requests, so expect offers in your inbox.",
          "Free pages are the lowest-risk way to see if you like someone. If you don't, you unfollow and you've spent nothing.",
        ],
      },
      {
        id: "paid",
        h: "How do paid pages work?",
        body: [
          "A paid page charges a monthly subscription that the creator sets. Paying unlocks her main feed. Subscriptions renew automatically unless you turn renewal off, and creators often run discounts for new subscribers or multi-month bundles.",
          "Some paid pages still sell extra content through messages. Read the page description before subscribing so you know what the subscription covers.",
        ],
      },
      {
        id: "which",
        h: "Which one should you pick?",
        body: [
          "- Trying someone new: start with her free page if she has one.",
          "- You already know you like her: a paid subscription is usually better value than buying posts one at a time.",
          "- You want to control spending: free pages plus the occasional message purchase keeps costs predictable.",
        ],
      },
      {
        id: "on-pick-a-peach",
        h: "Finding free pages on Pick a Peach",
        body: [
          "Every creator card and profile on Pick a Peach shows whether her page is free. Use the Free filter on the home page to see only free pages, or browse by vibe and location and look for the Free tag.",
        ],
      },
    ],
    faqs: [
      { q: "Are free OnlyFans pages really free?", a: "Following a free page costs nothing. Creators may offer extra content for a price through messages, but you never have to buy anything." },
      { q: "Do paid subscriptions renew automatically?", a: "Yes, unless you switch off auto-renew in your subscription settings on the creator's page." },
      { q: "How do I see only free pages?", a: "On Pick a Peach, tap the Free chip on the home page or turn on Free pages only in Filters." },
    ],
  },
  {
    slug: "spot-fake-creator-accounts",
    title: "How to spot fake creator accounts and copycat pages",
    description: "Copycat accounts steal creators' photos to scam fans. Here are the signs of a fake page and how to make sure you're following the real creator.",
    dek: "Copycats are everywhere. Five checks that catch almost all of them.",
    published: "2026-11-04",
    updated: "2026-11-04",
    tldr: "Fake accounts reuse a real creator's photos to collect payments or personal details. The real page is the one linked from the creator's own verified socials. Be wary of brand-new accounts, pages that push you to pay outside the platform, and anyone asking for gift cards or crypto.",
    keywords: ["fake onlyfans account", "onlyfans scam", "catfish onlyfans", "real creator account"],
    sections: [
      {
        id: "how-scams-work",
        h: "How do copycat scams work?",
        body: [
          "Scammers download a real creator's photos and set up look-alike accounts on social media, often with a username one letter off. They message fans, offer cheap content, and ask for payment through gift cards, payment apps or crypto. The fan pays, and the account disappears.",
        ],
      },
      {
        id: "signs",
        h: "Signs an account is fake",
        body: [
          "- It's new, with few posts but lots of photos uploaded at once.",
          "- The username is a near-copy of a better-known account.",
          "- It asks you to pay off-platform, by gift card, crypto or a payment app.",
          "- It DMs you first with a deal that sounds too good.",
          "- Its links point somewhere other than the creator's official page.",
        ],
      },
      {
        id: "verify",
        h: "How to verify the real page",
        body: [
          "Go to the creator's most established social account, the one with the longest history, and follow the link in her bio. That's her real page. On Pick a Peach, every profile links to the creator's own social accounts and to her official page, so you can cross-check before you follow.",
        ],
      },
      {
        id: "if-scammed",
        h: "What to do if you were scammed",
        body: [
          "Report the account to the platform it's on, contact your bank or payment provider quickly, and report the scam to the FTC at ReportFraud.ftc.gov if you're in the US. Don't send more money to anyone who promises to get your first payment back.",
        ],
      },
    ],
    faqs: [
      { q: "Should I ever pay a creator outside the platform?", a: "No. Paying through gift cards, crypto or payment apps is the most common sign of a scam. Pay only through the creator's official page." },
      { q: "How do I report a fake account?", a: "Use the report tool on the platform where the account lives. If you lost money, contact your bank and file a report at ReportFraud.ftc.gov." },
    ],
  },
  {
    slug: "subscribe-privately",
    title: "How to subscribe privately: billing, names and notifications",
    description: "Practical privacy tips for fans: what shows on your statement, how to keep notifications discreet, and how to protect your personal details.",
    dek: "Your subscriptions are your business. A few settings keep it that way.",
    published: "2026-11-04",
    updated: "2026-11-04",
    tldr: "Use a display name that isn't your real name, turn off notification previews, and check how charges appear on your statement before you subscribe. Never share personal details like your address or workplace in messages, and use a separate email if you want extra separation.",
    keywords: ["onlyfans privacy", "subscribe privately", "discreet billing", "fan privacy tips"],
    sections: [
      {
        id: "display-name",
        h: "Pick a display name that isn't yours",
        body: [
          "Creators see your display name and username. You don't need to use your real name for either. A neutral username keeps your account from being connected to your other profiles.",
        ],
      },
      {
        id: "notifications",
        h: "Make notifications discreet",
        body: [
          "On your phone, turn off notification previews for your browser or the app so message content doesn't show on the lock screen. Turn off email notifications you don't need, or send them to a separate email address.",
        ],
      },
      {
        id: "billing",
        h: "Know how billing appears",
        body: [
          "Before subscribing, check the platform's help pages for how charges appear on bank statements. If you share a card or a bank account, a separate card or a prepaid card you control keeps things simple.",
        ],
      },
      {
        id: "personal-details",
        h: "Keep personal details out of messages",
        body: [
          "- Don't share your address, workplace or full name in chats.",
          "- Don't send photos that show your face or anything identifying unless you're comfortable with them being seen.",
          "- Be careful with links in messages. Stay on the official site.",
        ],
      },
      {
        id: "on-our-site",
        h: "What Pick a Peach collects",
        body: [
          "Browsing Pick a Peach doesn't require an account. If you unlock the members-only creators, we ask for an email and mobile number and only message you if you agreed to it. You can reply STOP to any text. Our privacy policy explains exactly what we store.",
        ],
      },
    ],
    faqs: [
      { q: "Can creators see my real name?", a: "Creators see your display name and username, not your legal name, so use names that don't identify you." },
      { q: "Does Pick a Peach need an account?", a: "No. Browsing is open. Unlocking members-only creators needs an email and mobile number, nothing else." },
    ],
  },
  {
    slug: "tips-ppv-subscriptions-explained",
    title: "Subscriptions, tips and pay-per-view messages explained",
    description: "How fans pay creators on subscription platforms: monthly subscriptions, tips, pay-per-view messages and custom requests, and what each one is for.",
    dek: "Four ways money changes hands, and what each one gets you.",
    published: "2026-11-04",
    updated: "2026-11-04",
    tldr: "Subscriptions unlock a creator's main feed each month. Tips are optional payments to say thanks or get attention. Pay-per-view messages are locked posts sent to your inbox that you can choose to buy. Custom requests are made-to-order content priced by the creator.",
    keywords: ["onlyfans tips", "pay per view messages", "onlyfans ppv", "how onlyfans works"],
    sections: [
      {
        id: "subscriptions",
        h: "Subscriptions",
        body: [
          "A subscription is a monthly fee that unlocks a creator's feed. Each creator sets her own price, and free pages skip the fee entirely. Subscriptions renew unless you turn renewal off.",
        ],
      },
      {
        id: "tips",
        h: "Tips",
        body: [
          "Tips are optional. Fans tip to say thanks for a post, to get a reply, or to support a creator they like. Many creators reward tips with shout-outs or extra content.",
        ],
      },
      {
        id: "ppv",
        h: "Pay-per-view messages",
        body: [
          "Pay-per-view (PPV) messages are locked posts sent to your inbox with a price on them. You can open the preview and decide whether to buy. You never have to. Free pages rely on PPV the most.",
        ],
      },
      {
        id: "customs",
        h: "Custom requests",
        body: [
          "Some creators take custom requests: content made for you, priced by the creator. Agree on the price and details in messages first, and always pay through the platform.",
        ],
      },
      {
        id: "where-money-goes",
        h: "Where does the money go?",
        body: [
          "Platforms keep a share of each payment and the rest goes to the creator. When you pay through her official page, you're paying her directly through the platform, which is the safest way for both of you.",
        ],
      },
    ],
    faqs: [
      { q: "Do I have to buy pay-per-view messages?", a: "No. PPV messages are always optional. You can ignore them or open the preview and decide." },
      { q: "Is tipping required?", a: "No. Tips are a way to say thanks or get a creator's attention, but they're always optional." },
    ],
  },
  {
    slug: "enjoy-subscriptions-without-overspending",
    title: "How to enjoy creator subscriptions without overspending",
    description: "Simple ways to keep creator subscriptions fun and affordable: monthly budgets, renewal settings, free pages and avoiding impulse buys.",
    dek: "A budget, a calendar reminder and one rule about late nights.",
    published: "2026-11-04",
    updated: "2026-11-04",
    tldr: "Set a monthly amount you're comfortable with, turn off auto-renew on pages you're testing, lean on free pages, and wait a day before big purchases. A short list of creators you really like beats a long list you barely check.",
    keywords: ["onlyfans budget", "manage subscriptions", "onlyfans spending", "auto renew onlyfans"],
    sections: [
      {
        id: "set-a-number",
        h: "Set a number for the month",
        body: [
          "Decide what you're happy to spend each month before you start, and treat it like any other entertainment budget. When it's gone, it's gone until next month.",
        ],
      },
      {
        id: "renewals",
        h: "Control your renewals",
        body: [
          "Turn off auto-renew on pages you're trying out. If you still want the page when the month ends, renew on purpose. A calendar reminder a day before renewal helps.",
        ],
      },
      {
        id: "free-first",
        h: "Use free pages as your base",
        body: [
          "Free pages let you follow lots of creators without a monthly cost. Pick one or two paid pages for the creators you like most, and keep the rest free.",
        ],
      },
      {
        id: "impulse",
        h: "Sleep on the big buys",
        body: [
          "- Wait 24 hours before buying anything expensive.",
          "- Avoid spending late at night or after drinking.",
          "- Check your total spend once a week.",
        ],
      },
      {
        id: "help",
        h: "If spending stops being fun",
        body: [
          "If you find yourself spending more than you can afford, or hiding it, talk to someone you trust or a counselor. Most banks can also block payments to specific merchants if you ask.",
        ],
      },
    ],
    faqs: [
      { q: "How do I stop a subscription from renewing?", a: "Open the creator's page and switch off auto-renew in your subscription settings. You keep access until the period ends." },
      { q: "Are free pages worth following?", a: "Yes. They cost nothing and let you keep up with creators you like while saving paid subscriptions for your favorites." },
    ],
  },
  {
    slug: "be-a-fan-creators-like",
    title: "How to be a fan creators actually like",
    description: "What creators wish fans knew: how to message, how to make requests, and the small things that get you noticed for the right reasons.",
    dek: "Creators remember the fans who make the job easier. Be one of them.",
    published: "2026-11-04",
    updated: "2026-11-04",
    tldr: "Be friendly and specific in messages, respect a creator's boundaries and prices, don't haggle or pressure, and pay through the platform. Kind fans who stick around and engage with posts get the best replies.",
    keywords: ["how to message onlyfans creator", "fan etiquette", "support creators", "creator tips"],
    sections: [
      {
        id: "messages",
        h: "Send messages people want to answer",
        body: [
          "A specific compliment about a post goes further than a one-word message. Ask questions she can actually answer. Give her time to reply; most creators handle hundreds of messages.",
        ],
      },
      {
        id: "boundaries",
        h: "Respect boundaries and prices",
        body: [
          "Creators decide what they make and what it costs. If something isn't on offer, take no for an answer. Haggling, guilt-tripping or repeated asks are the fastest way to get ignored or blocked.",
        ],
      },
      {
        id: "support",
        h: "Support that actually helps",
        body: [
          "- Like and comment on posts, not just messages.",
          "- Share her public socials if you enjoy her work.",
          "- Stick around. Long-term subscribers matter more to creators than one-time big spenders.",
          "- Always pay through her official page.",
        ],
      },
      {
        id: "privacy",
        h: "Respect her privacy",
        body: [
          "Never share or re-upload paid content, and never try to find out where a creator lives or works. Leaking content takes money out of her pocket and can put her at real risk.",
        ],
      },
    ],
    faqs: [
      { q: "Is it okay to ask a creator for a discount?", a: "Creators set their own prices. Many run promotions, but pushing for a discount usually goes badly. Wait for a sale instead." },
      { q: "Can I share content I paid for?", a: "No. Paid content is for you only. Sharing it is a copyright violation and hurts the creator." },
    ],
  },
  {
    slug: "how-pick-a-peach-works",
    title: "What is Pick a Peach and how do we choose creators?",
    description: "Pick a Peach is a hand-picked directory of independent adult creators. Here's how the site works, how creators are chosen, and what members-only means.",
    dek: "A short list, picked by people. Here's how it works.",
    published: "2026-11-04",
    updated: "2026-11-04",
    tldr: "Pick a Peach is a free directory of independent adult creators, all 18+ and listed with their permission. Each profile has photos, short clips, social links and a button to the creator's official page. Some creators are members-only and unlock with an email and mobile number.",
    keywords: ["pick a peach", "creator directory", "onlyfans directory", "about pick a peach"],
    sections: [
      {
        id: "what",
        h: "What is Pick a Peach?",
        body: [
          "Pick a Peach is a directory of independent creators. Instead of thousands of scraped accounts, it's a short list we keep up to date by hand, with photos, clips and links that go straight to each creator's official page.",
        ],
      },
      {
        id: "how-chosen",
        h: "How are creators chosen?",
        body: [
          "Every creator is a real adult, 18 or older, who agreed to be listed. We check that her page and socials are hers, keep her photos current, and remove profiles that go inactive.",
        ],
      },
      {
        id: "members",
        h: "What does members-only mean?",
        body: [
          "Some creators are only visible to members. Membership is free: add your email and mobile number once and every members-only creator unlocks on your device. If you opt in, we'll message you when new creators join. Reply STOP any time.",
        ],
      },
      {
        id: "creators",
        h: "Are you a creator?",
        body: [
          "Apply on the Get listed page with your socials and page link. We review every application and get back to the ones that fit.",
        ],
      },
    ],
    faqs: [
      { q: "Does Pick a Peach sell subscriptions?", a: "No. Pick a Peach links to each creator's official page. Any subscription or purchase happens there." },
      { q: "Are all creators over 18?", a: "Yes. Every creator listed is 18 or older and listed with permission." },
    ],
  },
];

function words(p: { tldr: string; sections: Section[]; faqs: { a: string }[] }) {
  const text = [p.tldr, ...p.sections.flatMap((s) => s.body), ...p.faqs.map((f) => f.a)].join(" ");
  return text.split(/\s+/).length;
}

function cap(s: string) {
  return s.replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}

// Auto-built "top picks" articles from the live roster: one per vibe and per state with 2+ creators.
function picksPosts(): Omit<Post, "readMins">[] {
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();
  const out: Omit<Post, "readMins">[] = [];
  for (const t of allTags().filter((t) => t.count >= 2)) {
    const list = byTagSlug(t.slug);
    const name = cap(t.tag);
    const free = list.filter((c) => c.free).length;
    out.push({
      slug: `best-${t.slug}-creators`,
      kind: "picks",
      title: `Best ${name.toLowerCase()} creators to follow in ${year}`,
      description: `Our ${list.length} favorite ${name.toLowerCase()} creators right now, with photos, clips and direct links. ${free} of them have free pages.`,
      dek: `${list.length} hand-picked ${name.toLowerCase()} creators, updated as the roster changes.`,
      published: "2026-11-04",
      updated: today,
      tldr: `The best ${name.toLowerCase()} creators on Pick a Peach right now are ${list.slice(0, 3).map((c) => c.name).join(", ")}${list.length > 3 ? " and more" : ""}. ${free} of the ${list.length} have free pages you can follow at no cost.`,
      keywords: [`best ${t.tag} onlyfans`, `${t.tag} creators`, `free ${t.tag} onlyfans`, `top ${t.tag} onlyfans ${year}`],
      sections: [
        {
          id: "how-we-picked",
          h: "How we picked them",
          body: [
            `Every creator here is on our hand-picked roster and tagged ${t.tag} by our team. We favor creators who post often, answer their fans and keep their profiles current. The list updates automatically when we add or remove someone.`,
          ],
        },
      ],
      faqs: [
        { q: `Who are the best ${t.tag} creators?`, a: `Right now our top ${t.tag} picks are ${list.slice(0, 5).map((c) => c.name).join(", ")}. Each one has a full profile on Pick a Peach with photos, clips and a link to her page.` },
        { q: `Are there free ${t.tag} pages?`, a: free ? `Yes. ${free} of the ${list.length} creators in this list have free pages.` : `Not in this list right now, but new creators are added often.` },
      ],
      picks: list,
    });
  }
  for (const r of allRegions().filter((r) => r.count >= 2)) {
    const list = byRegion(r.region);
    const place = regionLabel(r.region);
    out.push({
      slug: `creators-in-${r.region}`,
      kind: "picks",
      title: `Best creators in ${place} (${year})`,
      description: `${list.length} hand-picked creators from ${place}, with photos, clips and links to their official pages.`,
      dek: `Creators who call ${place} home.`,
      published: "2026-11-04",
      updated: today,
      tldr: `Our favorite creators from ${place} right now are ${list.slice(0, 3).map((c) => c.name).join(", ")}${list.length > 3 ? " and more" : ""}. Every profile links to her socials and official page.`,
      keywords: [`onlyfans ${place.toLowerCase()}`, `${place.toLowerCase()} creators`, `best onlyfans in ${place.toLowerCase()}`],
      sections: [
        {
          id: "about-list",
          h: "About this list",
          body: [`These creators list ${place} as home on their Pick a Peach profiles. The list updates automatically as our roster changes.`],
        },
      ],
      faqs: [{ q: `Who are the best creators in ${place}?`, a: `Our current picks from ${place} are ${list.slice(0, 5).map((c) => c.name).join(", ")}.` }],
      picks: list,
    });
  }
  return out;
}

export const posts: Post[] = [...guides.map((g) => ({ ...g, kind: "guide" as const })), ...picksPosts()].map((p) => {
  const extra = (p.picks || []).reduce((n, c) => n + (c.bio || "").split(/\s+/).length + 12, 0);
  return { ...p, readMins: Math.max(2, Math.round((words(p) + extra) / 220)) };
});

export function getPost(slug: string) {
  return posts.find((p) => p.slug === slug);
}
