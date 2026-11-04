"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProfileBody } from "./Profile";
import { Lock, ChevronLeft } from "./Icons";
import { toCard } from "@/lib/card";
import { openGate, useVip } from "@/lib/vip";

// Members-only girls aren't in the static build, so their profile renders on the client
// from /api/vip once the visitor has unlocked.
export default function MemberProfile() {
  const vip = useVip();
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => setSlug(new URLSearchParams(location.search).get("c")), []);

  const c = useMemo(() => vip.content?.creators.find((x) => x.slug === slug), [vip.content, slug]);
  const related = useMemo(
    () => (vip.content?.creators || []).filter((x) => x.slug !== slug).slice(0, 8).map((x) => toCard({ ...x, locked: true })),
    [vip.content, slug],
  );

  if (c) return <ProfileBody c={{ ...c, locked: true, tags: c.tags || [], photos: c.photos || [], clips: c.clips || [], socials: c.socials || {} }} related={related} />;

  const loading = slug === null || (vip.unlocked && !vip.content);
  return (
    <div className="wrap" style={{ minHeight: "70dvh", display: "grid", placeItems: "center", textAlign: "center", padding: "40px var(--gutter)" }}>
      {loading ? (
        <p className="c3">Loading…</p>
      ) : vip.unlocked ? (
        <div>
          <h1 className="t-title1">She&apos;s not here anymore</h1>
          <p className="c2" style={{ marginTop: 8 }}>This profile was taken down. Plenty of others weren&apos;t.</p>
          <Link href="/vip" className="btn btn-primary" style={{ marginTop: 20 }}>See all members</Link>
        </div>
      ) : (
        <div style={{ maxWidth: 360 }}>
          <div className="unlock-hero">
            <div className="ico"><Lock /></div>
            <h1 className="t-title1">Members only</h1>
            <p>This girl is only visible to members. Unlock free with your email and number.</p>
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={() => openGate("member_profile", slug || undefined)}>
            Unlock free
          </button>
          <Link href="/" className="btn btn-plain" style={{ marginTop: 6 }}>
            <ChevronLeft /> Back to everyone
          </Link>
        </div>
      )}
    </div>
  );
}
