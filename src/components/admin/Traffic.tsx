"use client";

import { useEffect, useMemo, useState } from "react";
import { BOT_REASONS, CHANNELS, fmt, fmtPct, pct } from "./meta";
import { Bars, ChannelTag, Empty, Glass, Tip } from "./parts";
import { ISpark } from "./icons";

export type SourceRow = { channel: string; label: string; visitors: number; sessions: number; engaged: number; pageviews: number; clicks: number; clicking_sessions: number; leads: number };
export type TrafficData = {
  since: string;
  days: number;
  totals: Record<string, number>;
  previous: Record<string, number>;
  daily: { day: string; visitors: number; clicks: number; leads: number; bots: number }[];
  channels: { channel: string; visitors: number; sessions: number; engaged: number; clicks: number; leads: number }[];
  sources: SourceRow[];
  campaigns: { label: string; campaign: string | null; content: string | null; term: string | null; visitors: number; sessions: number; engaged: number; clicks: number; leads: number }[];
  landing: { path: string; sessions: number; clicks: number }[];
  bots: { reason: string; sessions: number }[];
};

type SortKey = "visitors" | "engagedPct" | "clicks" | "clickRate" | "leads" | "leadRate";

const AI_NAMES = ["ChatGPT", "Perplexity", "Claude", "Google Gemini", "Microsoft Copilot", "Grok", "DeepSeek", "Meta AI"];

export default function Traffic({ data, initialChannel = "all" }: { data: TrafficData; initialChannel?: string }) {
  const [channel, setChannel] = useState(initialChannel);
  const [sort, setSort] = useState<SortKey>("visitors");
  useEffect(() => setChannel(initialChannel), [initialChannel]);

  const rows = useMemo(() => {
    const r = data.sources
      .filter((s) => channel === "all" || s.channel === channel)
      .map((s) => ({ ...s, engagedPct: pct(s.engaged, s.sessions), clickRate: pct(s.clicking_sessions, s.sessions), leadRate: pct(s.leads, s.visitors) }));
    return r.sort((a, b) => (b[sort] as number) - (a[sort] as number));
  }, [data.sources, channel, sort]);

  const present = new Set(data.channels.map((c) => c.channel));
  const ai = data.sources.filter((s) => s.channel === "ai");
  const aiVisitors = ai.reduce((a, s) => a + s.visitors, 0);
  const paid = data.sources.filter((s) => s.channel === "paid");
  const botsTotal = data.bots.reduce((a, b) => a + b.sessions, 0);

  const head = (k: SortKey, l: string, help: string) => (
    <th aria-sort={sort === k ? "descending" : "none"}>
      <button onClick={() => setSort(k)}>{l}{sort === k ? " ↓" : ""}</button>
      <Tip text={help} />
    </th>
  );

  return (
    <div className="g-stack">
      <Glass
        title="Where every visitor came from"
        note="Real people only. Bots are already taken out (see the bottom of this page). Tap a column to sort."
      >
        <div className="g-chips" role="tablist" aria-label="Filter by channel">
          <button role="tab" aria-selected={channel === "all"} onClick={() => setChannel("all")}>All</button>
          {Object.entries(CHANNELS).map(([k, c]) => (
            <button key={k} role="tab" aria-selected={channel === k} onClick={() => setChannel(k)} disabled={!present.has(k)} title={c.blurb}>
              <i style={{ background: c.tint }} />{c.name}
            </button>
          ))}
        </div>
        {channel !== "all" && <p className="g-blurb">{CHANNELS[channel]?.blurb}</p>}
        {!rows.length ? (
          <Empty />
        ) : (
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr>
                  <th>Source</th>
                  {head("visitors", "Visitors", "Different people who came from this source.")}
                  {head("engagedPct", "Engaged", "Share of visits where the person actually tapped, scrolled or typed. Low numbers mean bots or bad traffic.")}
                  {head("clicks", "Follow clicks", "Taps on Follow that sent someone to a creator's page.")}
                  {head("clickRate", "Click rate", "Share of visits that tapped Follow at least once.")}
                  {head("leads", "Unlocks", "People who gave their email and number to see the hidden girls.")}
                  {head("leadRate", "Unlock rate", "Unlocks divided by visitors.")}
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.channel + s.label}>
                    <td>
                      <b>{s.label}</b>
                      <ChannelTag channel={s.channel} />
                    </td>
                    <td data-l="Visitors">{fmt(s.visitors)}</td>
                    <td data-l="Engaged"><Meter v={s.engagedPct} /></td>
                    <td data-l="Follow clicks">{fmt(s.clicks)}</td>
                    <td data-l="Click rate">{fmtPct(s.clicking_sessions, s.sessions)}</td>
                    <td data-l="Unlocks">{fmt(s.leads)}</td>
                    <td data-l="Unlock rate">{fmtPct(s.leads, s.visitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Glass>

      <div className="g-grid-2">
        <Glass title={<><ISpark className="g-inline-ico" /> AI assistants</>} note="Visits that came from an AI tool recommending or linking to the site.">
          {aiVisitors ? (
            <Bars rows={ai as unknown as Record<string, unknown>[]} value="visitors" label={(r) => String(r.label)} sub={(r) => `${fmt(Number(r.clicks))} follow clicks · ${fmt(Number(r.leads))} unlocks`} />
          ) : (
            <Empty>
              No AI visits yet. When ChatGPT, Perplexity, Claude, Gemini, Copilot or Grok send someone here, they show up by name. We watch for: {AI_NAMES.join(", ")} and more.
            </Empty>
          )}
        </Glass>
        <Glass title="By channel" note="Visitors grouped into simple buckets. Tap one to filter the table.">
          <Bars
            rows={data.channels as unknown as Record<string, unknown>[]}
            value="visitors"
            label={(r) => CHANNELS[String(r.channel)]?.name || String(r.channel)}
            sub={(r) => `${fmtPct(Number(r.engaged), Number(r.sessions))} engaged · ${fmt(Number(r.clicks))} clicks · ${fmt(Number(r.leads))} unlocks`}
            onPick={(r) => setChannel(String(r.channel))}
          />
        </Glass>
      </div>

      <Glass
        title="Paid ads: campaigns"
        note="Tag every ad link with utm_source, utm_campaign and utm_content (the ad) so each one shows here on its own row."
      >
        {!data.campaigns.length ? (
          <Empty>No ad campaigns yet. Use links like www.pickapeach.com/?utm_source=trafficjunky&amp;utm_medium=cpm&amp;utm_campaign=&#123;CampaignID&#125;&amp;utm_content=&#123;AdID&#125;&amp;utm_term=&#123;SiteName&#125;</Empty>
        ) : (
          <div className="g-table-wrap">
            <table className="g-table">
              <thead>
                <tr><th>Ad source</th><th>Campaign</th><th>Ad · site</th><th>Visitors</th><th>Engaged</th><th>Follow clicks</th><th>Unlocks</th></tr>
              </thead>
              <tbody>
                {data.campaigns.map((c, i) => (
                  <tr key={i}>
                    <td><b>{c.label}</b></td>
                    <td data-l="Campaign">{c.campaign || "—"}</td>
                    <td data-l="Ad · site">{[c.content, c.term].filter(Boolean).join(" · ") || "—"}</td>
                    <td data-l="Visitors">{fmt(c.visitors)}</td>
                    <td data-l="Engaged"><Meter v={pct(c.engaged, c.sessions)} /></td>
                    <td data-l="Follow clicks">{fmt(c.clicks)}</td>
                    <td data-l="Unlocks">{fmt(c.leads)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Glass>

      <CostCheck rows={paid} days={data.days} />

      <div className="g-grid-2">
        <Glass title="Landing pages" note="The first page people saw.">
          <Bars rows={data.landing as unknown as Record<string, unknown>[]} value="sessions" label={(r) => String(r.path)} sub={(r) => `${fmt(Number(r.clicks))} follow clicks`} />
        </Glass>
        <Glass
          title={`Bots blocked: ${fmt(botsTotal)}`}
          note="Kept out of every number on this dashboard, so your ad decisions are based on real people."
        >
          {data.bots.length ? (
            <Bars rows={data.bots as unknown as Record<string, unknown>[]} value="sessions" label={(r) => BOT_REASONS[String(r.reason)] || String(r.reason)} />
          ) : (
            <Empty>No bots caught in this period.</Empty>
          )}
        </Glass>
      </div>

      <Glass title="What these numbers mean">
        <dl className="g-dl">
          <div><dt>Visitors</dt><dd>Different people. Someone who comes back three times in a week is one visitor.</dd></div>
          <div><dt>Engaged</dt><dd>The visitor tapped, scrolled or typed. Real people almost always do; bots and fake ad clicks usually don&apos;t. If a paid source has low engagement, it&apos;s sending junk.</dd></div>
          <div><dt>Follow clicks</dt><dd>Taps on a creator&apos;s Follow button that sent them to her page. This is the number that makes money.</dd></div>
          <div><dt>Unlocks</dt><dd>People who gave their email and number to see the hidden girls.</dd></div>
          <div><dt>Direct / unknown</dt><dd>No trail: they typed the address, used a bookmark, or came from an app that hides where it came from. Tag your links so less traffic lands here.</dd></div>
        </dl>
      </Glass>
    </div>
  );
}

function Meter({ v }: { v: number }) {
  const tone = v >= 50 ? "good" : v >= 25 ? "ok" : "bad";
  return (
    <span className={`g-meter ${tone}`}>
      <i style={{ width: `${Math.min(100, v)}%` }} />
      <em>{v ? `${v}%` : "—"}</em>
    </span>
  );
}

// Type what you spent on each ad source to see cost per follow click and per unlock. Saved in this browser only.
function CostCheck({ rows, days }: { rows: SourceRow[]; days: number }) {
  const [spend, setSpend] = useState<Record<string, string>>({});
  useEffect(() => {
    try {
      setSpend(JSON.parse(localStorage.getItem(`pp_spend_${days}`) || "{}"));
    } catch {}
  }, [days]);
  const set = (label: string, v: string) => {
    const next = { ...spend, [label]: v.replace(/[^\d.]/g, "") };
    setSpend(next);
    try {
      localStorage.setItem(`pp_spend_${days}`, JSON.stringify(next));
    } catch {}
  };
  const money = (n: number) => (isFinite(n) && n > 0 ? `$${n.toFixed(2)}` : "—");
  return (
    <Glass title="Ad cost check" note={`Type what you spent on each ad source in this ${days === 1 ? "day" : `${days}-day`} period to see what each click and unlock costs you. Saved only in this browser.`}>
      {!rows.length ? (
        <Empty>Paid ad sources show up here once tagged ad traffic arrives.</Empty>
      ) : (
        <div className="g-table-wrap">
          <table className="g-table">
            <thead>
              <tr><th>Ad source</th><th>You spent</th><th>Visitors</th><th>Cost per visitor</th><th>Cost per follow click</th><th>Cost per unlock</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const s = Number(spend[r.label] || 0);
                return (
                  <tr key={r.label}>
                    <td><b>{r.label}</b></td>
                    <td data-l="You spent">
                      <label className="g-money">$<input inputMode="decimal" value={spend[r.label] || ""} onChange={(e) => set(r.label, e.target.value)} placeholder="0" aria-label={`Spend on ${r.label}`} /></label>
                    </td>
                    <td data-l="Visitors">{fmt(r.visitors)}</td>
                    <td data-l="Cost per visitor">{money(s / r.visitors)}</td>
                    <td data-l="Cost per follow click">{money(s / r.clicks)}</td>
                    <td data-l="Cost per unlock">{money(s / r.leads)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Glass>
  );
}
