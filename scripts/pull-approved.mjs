// Pulls creator-submitted profiles that the owners approved (public tier) so they're
// built into real static pages. Never fails the build: if Supabase can't be reached,
// it writes whatever was there before (or an empty list).
import { existsSync, writeFileSync } from "node:fs";

const out = new URL("../data/self-serve.json", import.meta.url);
const base = process.env.SUPABASE_URL || "https://qcuzrmceswanetrmimzn.supabase.co";
const key = process.env.SUPABASE_KEY || "sb_publishable_zG7RWc6SzzTIVBRMPXSJ0w_K0tLxwfD";

try {
  const r = await fetch(`${base}/rest/v1/rpc/public_profiles`, { method: "POST", headers: { apikey: key, "content-type": "application/json" }, body: "{}" });
  if (!r.ok) throw new Error(`${r.status}`);
  const list = await r.json();
  writeFileSync(out, JSON.stringify(Array.isArray(list) ? list : [], null, 2) + "\n");
  console.log(`approved creator profiles: ${Array.isArray(list) ? list.length : 0}`);
} catch (e) {
  if (!existsSync(out)) writeFileSync(out, "[]\n");
  console.warn(`could not pull approved profiles (${e.message}); using the last copy`);
}
