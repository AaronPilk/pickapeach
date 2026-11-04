"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bolt, Clips, Lock, Sparkle } from "./Icons";
import { openGate, useVip } from "@/lib/vip";

// Landing page for ads that point straight at the unlock offer.
export default function VipLanding() {
  const vip = useVip();
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("open") === "1" && !vip.unlocked) setTimeout(() => openGate("vip_page_auto"), 600);
  }, [vip.unlocked]);

  return (
    <section style={{ minHeight: "70dvh", display: "grid", placeItems: "center", padding: "30px 0" }}>
      <div className="panel glass" style={{ maxWidth: 480, width: "100%", textAlign: "center", padding: "30px 22px" }}>
        <div className="lock-ico" style={{ width: 64, height: 64, borderRadius: 22 }}>
          {vip.unlocked ? <Sparkle style={{ width: 28, height: 28 }} /> : <Lock style={{ width: 28, height: 28 }} />}
        </div>
        <h1 style={{ fontSize: "2.2rem" }}>{vip.unlocked ? "You're a member" : "Pick a Peach VIP"}</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          {vip.unlocked ? "Every profile now shows its VIP drops. Go have a look." : "Free forever. Extra photos and clips from every creator, members-only girls, and first look at new faces."}
        </p>
        {!vip.unlocked && (
          <div className="perks" style={{ textAlign: "left", maxWidth: 300, margin: "18px auto 0" }}>
            <div className="perk"><Sparkle /> VIP photo drops on every profile</div>
            <div className="perk"><Clips /> Members-only clips</div>
            <div className="perk"><Bolt /> First look at new creators</div>
          </div>
        )}
        {vip.unlocked ? (
          <Link href="/" className="btn btn-coral btn-block" style={{ marginTop: 22 }}>Browse creators</Link>
        ) : (
          <button className="btn btn-coral btn-block" style={{ marginTop: 22 }} onClick={() => openGate("vip_page")}>Unlock free</button>
        )}
      </div>
    </section>
  );
}
