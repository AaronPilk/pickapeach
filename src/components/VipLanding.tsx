"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import CreatorCard from "./CreatorCard";
import { Lock, Sparkle } from "./Icons";
import { toCard } from "@/lib/card";
import { openGate, useVip } from "@/lib/vip";

// /vip: the members area. Locked → the unlock pitch (also a clean landing page for ads: /vip?open=1).
// Unlocked → every members-only girl.
export default function VipLanding() {
  const vip = useVip();
  const count = vip.summary?.count ?? 0;
  const cards = useMemo(() => (vip.content?.creators || []).map((c) => toCard({ ...c, locked: true })), [vip.content]);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("open") === "1" && !vip.unlocked) setTimeout(() => openGate("vip_page_auto"), 500);
  }, [vip.unlocked]);

  if (vip.unlocked) {
    return (
      <>
        <header className="page-head">
          <h1 className="t-large">Members</h1>
          <p className="lede">{cards.length ? `${cards.length} girls you only see as a member.` : "Loading members…"}</p>
        </header>
        <div className="grid grid-wide" style={{ marginTop: 14 }}>
          {cards.map((c, i) => (
            <CreatorCard key={c.slug} c={c} index={i} list="members" eager={i < 2} />
          ))}
        </div>
      </>
    );
  }

  return (
    <section style={{ minHeight: "70dvh", display: "grid", placeItems: "center", padding: "24px 0" }}>
      <div className="panel cell" style={{ maxWidth: 420, width: "100%", textAlign: "center", padding: "28px 20px 20px" }}>
        <div className="unlock-hero">
          <div className="ico"><Lock /></div>
          <h1 className="t-title1">{count ? `${count} more girls` : "More girls"}</h1>
          <p>The rest of the roster is members-only. Unlock with your email and number, free.</p>
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={() => openGate("vip_page")}>
          <Sparkle /> Unlock free
        </button>
        <Link href="/" className="btn btn-plain" style={{ marginTop: 4 }}>
          Keep browsing
        </Link>
      </div>
    </section>
  );
}
