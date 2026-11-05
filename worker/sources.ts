// Turns "where did this visit come from" into a plain-English label the whole team can read.
//
//   channel   ai | search | paid | social | adult | creator | email | referral | direct
//   label     "ChatGPT", "Google Search", "Traffic Junky (paid ad)", "Instagram app", "somesite.com", ...
//
// Order of evidence: ad click IDs and campaign tags first (they're the most deliberate), then the referring site,
// then the in-app browser fingerprint (apps like Instagram and TikTok often hide the referrer), then "Direct".

export type Channel = "ai" | "search" | "paid" | "social" | "adult" | "creator" | "email" | "referral" | "direct";
export type Source = { channel: Channel; label: string; adNetwork?: string };

type Rule = [RegExp, string];

// AI assistants and AI search. ChatGPT also tags its links with ?utm_source=chatgpt.com.
const AI: Rule[] = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$|(^|\.)openai\.com$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)claude\.ai$/, "Claude"],
  [/^gemini\.google\.com$|^bard\.google\.com$/, "Google Gemini"],
  [/^copilot\.microsoft\.com$|^copilot\.cloud\.microsoft$|^m365\.cloud\.microsoft$/, "Microsoft Copilot"],
  [/(^|\.)grok\.com$|^grok\.x\.ai$/, "Grok"],
  [/(^|\.)deepseek\.com$/, "DeepSeek"],
  [/(^|\.)meta\.ai$/, "Meta AI"],
  [/^chat\.mistral\.ai$/, "Mistral Le Chat"],
  [/(^|\.)you\.com$/, "You.com"],
  [/(^|\.)phind\.com$/, "Phind"],
  [/(^|\.)poe\.com$/, "Poe"],
  [/^huggingface\.co$/, "HuggingChat"],
  [/(^|\.)character\.ai$/, "Character.AI"],
  [/(^|\.)kagi\.com$/, "Kagi"],
];
const AI_TAGS: Rule[] = [
  [/chatgpt|openai/, "ChatGPT"],
  [/perplexity/, "Perplexity"],
  [/claude|anthropic/, "Claude"],
  [/gemini|bard/, "Google Gemini"],
  [/copilot/, "Microsoft Copilot"],
  [/grok/, "Grok"],
  [/deepseek/, "DeepSeek"],
  [/meta\.?ai/, "Meta AI"],
];

const SEARCH: Rule[] = [
  [/^news\.google\./, "Google News"],
  [/(^|\.)google\.[a-z.]+$|^android-app:\/\/com\.google\.android\.googlequicksearchbox/, "Google Search"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\.[a-z.]+$/, "Yahoo"],
  [/^search\.brave\.com$/, "Brave Search"],
  [/(^|\.)yandex\.[a-z.]+$/, "Yandex"],
  [/(^|\.)baidu\.com$/, "Baidu"],
  [/(^|\.)ecosia\.org$/, "Ecosia"],
  [/(^|\.)startpage\.com$/, "Startpage"],
  [/(^|\.)qwant\.com$/, "Qwant"],
  [/(^|\.)naver\.com$/, "Naver"],
  [/(^|\.)aol\.com$/, "AOL Search"],
];

const SOCIAL: Rule[] = [
  [/(^|\.)instagram\.com$|^l\.instagram\.com$/, "Instagram"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$|^l\.facebook\.com$|^lm\.facebook\.com$|^m\.facebook\.com$/, "Facebook"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)x\.com$|(^|\.)twitter\.com$|^t\.co$/, "X (Twitter)"],
  [/(^|\.)reddit\.com$|^out\.reddit\.com$/, "Reddit"],
  [/(^|\.)snapchat\.com$/, "Snapchat"],
  [/^t\.me$|(^|\.)telegram\.(org|me)$|^web\.telegram\.org$/, "Telegram"],
  [/(^|\.)threads\.(net|com)$/, "Threads"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "YouTube"],
  [/(^|\.)discord(app)?\.com$|^discord\.gg$/, "Discord"],
  [/(^|\.)pinterest\.[a-z.]+$|^pin\.it$/, "Pinterest"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/(^|\.)tumblr\.com$/, "Tumblr"],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, "WhatsApp"],
  [/(^|\.)bsky\.app$/, "Bluesky"],
  [/^linktr\.ee$|(^|\.)beacons\.ai$|(^|\.)allmylinks\.com$|(^|\.)linkin\.bio$|(^|\.)lnk\.bio$|(^|\.)hoo\.be$|(^|\.)campsite\.bio$/, "Link in bio"],
];

const ADULT: Rule[] = [
  [/(^|\.)pornhub\.(com|org)$/, "Pornhub"],
  [/(^|\.)xvideos\.[a-z.]+$/, "XVideos"],
  [/(^|\.)xhamster\d*\.[a-z.]+$/, "xHamster"],
  [/(^|\.)xnxx\.[a-z.]+$/, "XNXX"],
  [/(^|\.)redtube\.[a-z.]+$/, "RedTube"],
  [/(^|\.)youporn\.[a-z.]+$/, "YouPorn"],
  [/(^|\.)tube8\.[a-z.]+$/, "Tube8"],
  [/(^|\.)spankbang\.[a-z.]+$/, "SpankBang"],
  [/(^|\.)eporner\.com$/, "Eporner"],
  [/(^|\.)chaturbate\.com$/, "Chaturbate"],
  [/(^|\.)stripchat\.com$/, "Stripchat"],
];

const CREATOR: Rule[] = [
  [/(^|\.)onlyfans\.com$/, "OnlyFans"],
  [/(^|\.)fansly\.com$/, "Fansly"],
  [/(^|\.)fanvue\.com$/, "Fanvue"],
  [/(^|\.)justfor\.fans$/, "JustFor.Fans"],
];

const EMAIL_HOSTS: Rule[] = [
  [/^mail\.google\.com$/, "Gmail"],
  [/^outlook\.(live|office|office365)\.com$/, "Outlook"],
  [/^mail\.yahoo\.com$/, "Yahoo Mail"],
  [/(^|\.)mail\.aol\.com$/, "AOL Mail"],
  [/(^|\.)icloud\.com$/, "iCloud Mail"],
];

// Adult ad networks: a tag naming one of these always means a paid ad. Label shows as "<name> (paid ad)".
const ADULT_NETWORKS: Rule[] = [
  [/traffic.?junky|^tj$/, "Traffic Junky"],
  [/exo.?click|^exo$/, "ExoClick"],
  [/juicy.?ads/, "JuicyAds"],
  [/traffic.?stars/, "TrafficStars"],
  [/adsterra/, "Adsterra"],
  [/propeller/, "PropellerAds"],
  [/clickadu/, "Clickadu"],
  [/plug.?rush/, "PlugRush"],
  [/hilltop/, "HilltopAds"],
  [/ero.?advertising/, "EroAdvertising"],
  [/twin.?red/, "TwinRed"],
  [/traffic.?factory/, "Traffic Factory"],
  [/ad-?xxx/, "AdXXX"],
];
// Big platforms: only a paid ad when the link also says utm_medium=cpc/paid/etc. (otherwise it's a normal post).
const PLATFORM_ADS: Rule[] = [
  [/^google|adwords|gads/, "Google Ads"],
  [/^bing|microsoft/, "Microsoft Ads"],
  [/^(facebook|fb|meta|instagram|ig)$/, "Meta Ads"],
  [/tiktok/, "TikTok Ads"],
  [/reddit/, "Reddit Ads"],
  [/^(x|twitter)$/, "X Ads"],
  [/snap/, "Snapchat Ads"],
];
const SHORT_TAGS: Record<string, string> = { ig: "Instagram", insta: "Instagram", fb: "Facebook", tt: "TikTok", yt: "YouTube", tw: "X (Twitter)", sc: "Snapchat", tg: "Telegram" };
const PAID_MEDIUM = /^(cpc|cpm|cpa|cpv|ppc|paid|paid[_-]?social|paidsocial|display|banner|native|pop|popunder|popup|push|interstitial|video|preroll|ads?|sponsored|retargeting|affiliate)$/;

// In-app browsers. These apps often strip the referrer, but their user agent gives them away.
const IN_APP: Rule[] = [
  [/Instagram/i, "Instagram app"],
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i, "Facebook app"],
  [/musical_ly|BytedanceWebview|TikTok|trill_/i, "TikTok app"],
  [/Snapchat/i, "Snapchat app"],
  [/Twitter|TwitterAndroid/i, "X (Twitter) app"],
  [/Reddit\//i, "Reddit app"],
  [/Pinterest/i, "Pinterest app"],
  [/LinkedInApp/i, "LinkedIn app"],
  [/Telegram/i, "Telegram app"],
  [/Discord/i, "Discord app"],
  [/ Line\//i, "LINE app"],
];

const OWN_HOSTS = /(^|\.)pickapeach\.com$|(^|\.)pickapeach\.pages\.dev$|^localhost$/;
export const isOwnHost = (host: string) => Boolean(host) && OWN_HOSTS.test(host);

function match(rules: Rule[], s: string) {
  for (const [re, name] of rules) if (re.test(s)) return name;
  return "";
}

export function hostOf(u?: string | null) {
  if (!u) return "";
  if (u.startsWith("android-app://")) return u.split("/").slice(0, 3).join("/");
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

const cap = (s: string) => s.replace(/(^|[\s._-])\w/g, (m) => m.toUpperCase());

export function classify(q: Record<string, string>, referrer: string, ua: string): Source {
  const lower = (k: string) => String(q[k] || "").trim().toLowerCase();
  const tag = lower("utm_source") || lower("src") || lower("source") || lower("ref");
  const medium = lower("utm_medium");
  const host = hostOf(referrer);
  const internal = !host || OWN_HOSTS.test(host);

  // 1. Ad click IDs (added automatically by the ad platform).
  if (q.gclid || q.gbraid || q.wbraid || q.gad_source) return { channel: "paid", label: "Google Ads (paid ad)", adNetwork: "Google Ads" };
  if (q.msclkid) return { channel: "paid", label: "Microsoft Ads (paid ad)", adNetwork: "Microsoft Ads" };
  if (q.ttclid) return { channel: "paid", label: "TikTok Ads (paid ad)", adNetwork: "TikTok Ads" };
  if (q.twclid) return { channel: "paid", label: "X Ads (paid ad)", adNetwork: "X Ads" };
  if (q.rdt_cid) return { channel: "paid", label: "Reddit Ads (paid ad)", adNetwork: "Reddit Ads" };
  if (q.ScCid || q.sccid) return { channel: "paid", label: "Snapchat Ads (paid ad)", adNetwork: "Snapchat Ads" };

  // 2. Campaign tags we (or an AI tool) put on the link.
  if (tag === "pwa") return { channel: "direct", label: "Home screen app" };
  if (tag) {
    const ai = match(AI_TAGS, tag);
    if (ai) return { channel: "ai", label: ai };
    const adult = match(ADULT_NETWORKS, tag);
    if (adult) return { channel: "paid", label: `${adult} (paid ad)`, adNetwork: adult };
    if (PAID_MEDIUM.test(medium)) {
      const net = match(PLATFORM_ADS, tag) || cap(tag);
      return { channel: "paid", label: `${net} (paid ad)`, adNetwork: net };
    }
    if (/^(email|e-?mail|newsletter)$/.test(medium) || /newsletter|klaviyo|mailchimp|email/.test(tag)) return { channel: "email", label: "Email" };
    if (/^(sms|text|mms)$/.test(medium) || /^(sms|text)$/.test(tag)) return { channel: "email", label: "Text message" };
    const fromTag = SHORT_TAGS[tag] || match(SOCIAL, tag.includes(".") ? tag : `${tag}.com`);
    if (/^(social|social-?media|organic[_-]?social|bio|link-?in-?bio)$/.test(medium)) return { channel: "social", label: fromTag || cap(tag) };
    if (fromTag) return { channel: "social", label: fromTag };
  }

  // 3. The site that linked here.
  if (!internal) {
    let name = match(AI, host);
    if (name) return { channel: "ai", label: name };
    name = match(SEARCH, host);
    if (name) return { channel: "search", label: name };
    name = match(SOCIAL, host);
    if (name) return { channel: "social", label: name };
    name = match(ADULT, host);
    if (name) return { channel: "adult", label: `${name} (link or untagged ad)` };
    name = match(CREATOR, host);
    if (name) return { channel: "creator", label: name };
    name = match(EMAIL_HOSTS, host);
    if (name) return { channel: "email", label: name };
    return { channel: "referral", label: host };
  }

  // 4. Apps that hide the referrer.
  const app = match(IN_APP, ua);
  if (app) return { channel: "social", label: app };

  // Facebook/Instagram add fbclid to every outbound link (ads and normal posts).
  if (q.fbclid) return { channel: "social", label: "Facebook / Instagram" };
  if (tag) return { channel: "referral", label: cap(tag) };

  return { channel: "direct", label: "Direct / unknown" };
}

// ------------------------------------------------------------------ bots

// Cloud and hosting networks. Real people almost never browse from these; scrapers and ad-fraud bots do.
// (Some VPNs live here too; those visits are counted separately rather than mixed into your numbers.)
const DATACENTER = /amazon|aws|google cloud|google-cloud|googleusercontent|microsoft corporation|azure|digitalocean|ovh|hetzner|linode|akamai connected|vultr|choopa|contabo|scaleway|oracle|alibaba|tencent|leaseweb|m247|datacamp|hostinger|ionos|godaddy|hostwinds|colocrossing|psychz|quadranet|servers\.com|cogent|zenlayer|g-core|gcore|cdn77|datapacket|tzulo|hivelocity|liquid web|rackspace|softlayer|ibm cloud|equinix|packet host|heficed|frantech|buyvm|ponynet|serverius|worldstream|nforce|netcup|kamatera|upcloud|ramnode|hostroyale|stark industries|aeza|pq hosting|selectel|collyer quay|egihosting|google llc|code200|packethub|clouvider|tefincom|cdnext|ipxo|latitude\.sh|maxihost/i;

export const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|whatsapp|telegrambot|discordbot|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp|monitor|uptime|scrapy|httpclient|phantomjs|selenium|puppeteer|playwright|chrome-lighthouse|gtmetrix|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|perplexitybot|ccbot|amazonbot|applebot/i;

export function botCheck(ua: string, asOrg: string, verifiedBot: boolean, c?: { wd?: unknown; hl?: unknown; sw?: unknown; sh?: unknown }) {
  if (verifiedBot) return "known crawler";
  if (!ua) return "no browser";
  if (BOT_UA.test(ua)) return "crawler or script";
  if (c && c.wd === true) return "automated browser";
  if (c && c.hl === 0) return "automated browser";
  if (c && (c.sw === 0 || c.sh === 0)) return "automated browser";
  // 800x600 is the default screen of headless browsers; no phone or modern computer reports it.
  if (c && c.sw === 800 && c.sh === 600) return "automated browser";
  if (asOrg && DATACENTER.test(asOrg)) return "datacenter / VPN";
  return "";
}

// Throwaway inbox services. Leads from these are refused.
export const DISPOSABLE_EMAIL =
  /@(mailinator|guerrillamail|guerrillamailblock|sharklasers|grr\.la|10minutemail|10minutemail\.net|tempmail|temp-mail|tempmailo|tempail|tempr\.email|throwawaymail|yopmail|getnada|nada\.email|dispostable|maildrop|mailnesia|mintemail|trashmail|fakeinbox|fakemail|emailondeck|spambox|spam4|mohmal|mailcatch|moakt|inboxkitten|burnermail|33mail|anonaddy|mailsac|discard\.email|dropmail|minuteinbox|emailfake|byom|tmail|tmpmail|1secmail|esiix|wwjmp|xojxe|yomail|mailpoof|harakirimail|mytemp|tempinbox)\./i;

// North American numbers: area code and exchange can't start with 0/1, no 555-01xx test range is blocked
// (it's fictional but harmless), no repeated or counting digits.
export function phoneLooksReal(e164: string) {
  const d = e164.replace(/\D/g, "");
  if (/^(\d)\1+$/.test(d.slice(-10))) return false;
  if (d.endsWith("1234567890") || d.endsWith("0123456789")) return false;
  if (e164.startsWith("+1")) {
    const n = d.slice(1);
    if (n.length !== 10) return false;
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(n)) return false;
    if (/^[2-9]11/.test(n)) return false;
  }
  return true;
}
