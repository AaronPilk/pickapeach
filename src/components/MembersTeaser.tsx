"use client";

import Link from "next/link";
import { Lock, Sparkle, ChevronRight } from "./Icons";
import { openGate, useVip } from "@/lib/vip";

// Home section that sells the unlock: blurred stand-ins (never real members' photos) + count.
export default function MembersTeaser({ art }: { art: string[] }) {
  const vip = useVip();
  const count = vip.summary?.count ?? 0;
  if (!count && !vip.unlocked) return null;

  if (vip.unlocked) {
    return (
      <section className="section">
        <Link href="/vip" className="members cell" style={{ display: "flex", alignItems: "center", gap: 14 }} data-track="members_open">
          <span className="unlock-hero" style={{ padding: 0 }}>
            <span className="ico" style={{ margin: 0, width: 48, height: 48 }}><Sparkle /></span>
          </span>
          <span style={{ flex: 1 }}>
            <span className="t-headline" style={{ display: "block" }}>You&apos;re a member</span>
            <span className="t-foot c2">All {count} members-only girls are unlocked</span>
          </span>
          <ChevronRight style={{ width: 18, height: 18, color: "var(--label-3)" }} />
        </Link>
      </section>
    );
  }

  return (
    <section className="section" aria-labelledby="members-h">
      <div className="members cell">
        <h2 id="members-h" className="t-title2">{count} more girls are members-only</h2>
        <p className="t-sub c2 section-sub">Add your email and number once to see everyone. It&apos;s free.</p>
        <div className="members-row" aria-hidden>
          {art.slice(0, 4).map((a, i) => (
            <i key={i} style={{ backgroundImage: `url(${a})` }} />
          ))}
        </div>
        <div className="members-cta">
          <button className="btn btn-primary" onClick={() => openGate("home_members")}>
            <Lock /> Unlock free
          </button>
        </div>
      </div>
    </section>
  );
}
