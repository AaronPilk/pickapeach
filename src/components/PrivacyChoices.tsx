"use client";

import { useEffect, useState } from "react";
import { type Consent, getConsent, gpcOn, onConsent, openCookieSettings, region, setConsent } from "@/lib/consent";
import { track } from "@/lib/track";

// The "Your Privacy Choices" controls: cookie state, the Do Not Sell or Share switch, and GPC status.
export default function PrivacyChoices() {
  const [c, setC] = useState<Consent | null>(null);
  const [gpc, setGpc] = useState(false);
  const [rule, setRule] = useState("optout");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setC(getConsent());
    setGpc(gpcOn());
    setRule(region().rule);
    return onConsent(setC);
  }, []);

  if (!c) return <div className="group-card" style={{ height: 156 }} />;

  const toggleShare = () => {
    const next = setConsent({ analytics: c.analytics, ads: !c.ads }, "settings");
    track("consent", { m: { a: next.analytics, d: next.ads, src: "privacy-choices", rule, gpc } });
    setSaved(next.ads ? "Ad sharing is back on." : "Done. We won't share your activity with ad networks from this browser.");
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div className="group-card">
        <div className="cookie-row">
          <div>
            <b>Do not sell or share my personal information</b>
            <p>{gpc ? "Your browser's Global Privacy Control signal is on, so this is already done for you." : "Turns off ad-network tracking (conversion pixels) in this browser."}</p>
          </div>
          <button className="switch" role="switch" aria-checked={!c.ads} aria-label="Do not sell or share my personal information" disabled={gpc} onClick={toggleShare} />
        </div>
        <div className="cookie-row">
          <div>
            <b>Analytics cookies</b>
            <p>{c.analytics ? "On. A random ID helps us count visits." : "Off. We only count visits anonymously, with nothing stored on your device."}</p>
          </div>
          <button className="btn btn-sm btn-gray" onClick={openCookieSettings}>Change</button>
        </div>
        <div className="cookie-row">
          <div>
            <b>Global Privacy Control</b>
            <p>{gpc ? "Detected and honored." : "Not detected in this browser. If you turn it on, we'll treat it as an opt-out automatically."}</p>
          </div>
          <span className="t-foot c3">{gpc ? "On" : "Off"}</span>
        </div>
      </div>
      {saved && <p className="studio-ok" role="status" style={{ marginTop: 10 }}>{saved}</p>}
    </div>
  );
}
