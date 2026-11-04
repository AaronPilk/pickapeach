"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toCard, type CardData } from "@/lib/card";
import CreatorCard, { LockedCard } from "./CreatorCard";
import Sheet from "./Sheet";
import { Search, Sliders, Sparkle, Flame, Grid as GridIcon } from "./Icons";
import { track } from "@/lib/track";
import { useVip } from "@/lib/vip";

type Sort = "featured" | "new" | "trending";
type Filters = { hair: string[]; eyes: string[]; tags: string[]; region: string[]; age: string[]; free: boolean };
const EMPTY: Filters = { hair: [], eyes: [], tags: [], region: [], age: [], free: false };
const AGE = [
  { id: "18-24", min: 18, max: 24 },
  { id: "25-29", min: 25, max: 29 },
  { id: "30+", min: 30, max: 99 },
];

export default function Directory({
  cards,
  regions,
  initialSort = "featured",
  showToolbar = true,
  showSearch = true,
  list = "home",
  lockedAt = 5,
  includeLocked = true,
}: {
  cards: CardData[];
  regions: { region: string; label: string }[];
  initialSort?: Sort;
  showToolbar?: boolean;
  showSearch?: boolean;
  list?: string;
  lockedAt?: number;
  includeLocked?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>(initialSort);
  const [f, setF] = useState<Filters>(EMPTY);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [open, setOpen] = useState(false);
  const [draftSort, setDraftSort] = useState<Sort>(initialSort);
  const [quick, setQuick] = useState("all");
  const vip = useVip();
  const input = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read state from the URL once (shareable filtered views, header search).
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const next = { ...EMPTY };
    (["hair", "eyes", "tags", "region", "age"] as const).forEach((k) => {
      const v = p.get(k);
      if (v) next[k] = v.split(",");
    });
    next.free = p.get("free") === "1";
    setF(next);
    if (p.get("q")) setQ(p.get("q")!);
    const s = p.get("sort") as Sort | null;
    if (s && ["featured", "new", "trending"].includes(s)) setSort(s);
    if (p.get("focus") === "search") setTimeout(() => input.current?.focus(), 300);
  }, []);

  // Keep the URL in sync without adding history entries.
  useEffect(() => {
    if (!showToolbar) return;
    const p = new URLSearchParams(location.search);
    ["hair", "eyes", "tags", "region", "age", "free", "q", "sort", "focus"].forEach((k) => p.delete(k));
    (["hair", "eyes", "tags", "region", "age"] as const).forEach((k) => f[k].length && p.set(k, f[k].join(",")));
    if (f.free) p.set("free", "1");
    if (q) p.set("q", q);
    if (sort !== initialSort) p.set("sort", sort);
    const qs = p.toString();
    history.replaceState(history.state, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
  }, [f, q, sort, showToolbar, initialSort]);

  const facets = useMemo(() => {
    const count = (get: (c: CardData) => string[] | string | undefined) => {
      const m = new Map<string, number>();
      for (const c of cards) {
        const v = get(c);
        for (const x of Array.isArray(v) ? v : v ? [v] : []) m.set(x, (m.get(x) || 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    return { hair: count((c) => c.hair), eyes: count((c) => c.eyes), tags: count((c) => c.tags).slice(0, 18) };
  }, [cards]);

  const lockedCards = useMemo(() => (vip.unlocked && includeLocked ? (vip.content?.creators || []).map((c) => toCard({ ...c, locked: true })) : []), [vip.unlocked, vip.content, includeLocked]);
  const all = useMemo(() => (lockedCards.length ? [...cards, ...lockedCards] : cards), [cards, lockedCards]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = all.filter((c) => {
      if (f.free && !c.free) return false;
      if (f.hair.length && !f.hair.includes(c.hair || "")) return false;
      if (f.eyes.length && !f.eyes.includes(c.eyes || "")) return false;
      if (f.region.length && !f.region.includes(c.region || "")) return false;
      if (f.tags.length && !f.tags.every((t) => c.tags.includes(t))) return false;
      if (f.age.length && !f.age.some((id) => {
        const a = AGE.find((x) => x.id === id)!;
        return c.age != null && c.age >= a.min && c.age <= a.max;
      })) return false;
      if (needle) {
        const hay = `${c.name} ${c.tagline} ${c.location || ""} ${c.hair || ""} ${c.tags.join(" ")}`.toLowerCase();
        if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    if (sort === "new") out = out.slice().sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    if (sort === "trending") {
      const score = (c: CardData) => (c.badge === "trending" ? 3 : c.badge === "hot" ? 2 : 0) + (c.clipCount ? 1 : 0) - (c.featured ?? 0) / 100;
      out = out.slice().sort((a, b) => score(b) - score(a));
    }
    return out;
  }, [all, f, q, sort]);

  const activeCount = f.hair.length + f.eyes.length + f.tags.length + f.region.length + f.age.length + (f.free ? 1 : 0);

  const onSearch = (v: string) => {
    setQ(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => v.trim() && track("search", { m: { q: v.trim().slice(0, 60), where: list } }), 900);
  };

  const quickChips = [
    { id: "all", label: "All", icon: <GridIcon /> },
    { id: "free", label: "Free", icon: <Sparkle /> },
    { id: "trending", label: "Trending", icon: <Flame /> },
    ...facets.tags.slice(0, 10).map(([t]) => ({ id: `tag:${t}`, label: cap(t), icon: null })),
  ];

  const applyQuick = (id: string) => {
    setQuick(id);
    track("chip_click", { m: { chip: id, l: list } });
    if (id === "all") {
      setF(EMPTY);
      setSort(initialSort);
    } else if (id === "free") setF({ ...EMPTY, free: true });
    else if (id === "trending") {
      setF(EMPTY);
      setSort("trending");
    } else if (id.startsWith("tag:")) setF({ ...EMPTY, tags: [id.slice(4)] });
  };

  const lockedCount = vip.summary?.count ?? 0;
  const art = cards[(lockedAt + 3) % Math.max(cards.length, 1)]?.cover;

  return (
    <div id="creators">
      {showSearch && (
        <div className="search" style={{ marginTop: 6 }}>
          <Search />
          <input
            ref={input}
            type="search"
            placeholder="Search by name, vibe or city"
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search creators"
            enterKeyHint="search"
          />
          {showToolbar && (
            <button
              className="icon-btn"
              style={{ position: "relative" }}
              onClick={() => {
                setDraft(f);
                setDraftSort(sort);
                setOpen(true);
                track("filters_open", { m: { l: list } });
              }}
              aria-label="Filters"
            >
              <Sliders />
              {activeCount > 0 && <FilterDot n={activeCount} />}
            </button>
          )}
        </div>
      )}

      {showToolbar && (
        <div className="chips" role="toolbar" aria-label="Quick filters">
          {quickChips.map((c) => (
            <button key={c.id} className="chip" aria-pressed={quick === c.id} onClick={() => applyQuick(c.id)}>
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
      )}

      {showToolbar && (
        <div className="toolbar">
          <Segmented value={sort} onChange={(s) => { setSort(s); track("sort", { m: { sort: s, l: list } }); }} />
          <span className="result-count" aria-live="polite">
            {results.length} {results.length === 1 ? "creator" : "creators"}
          </span>
        </div>
      )}

      <div className="grid grid-wide">
        {results.map((c, i) => (
          <FragmentWithLock key={c.slug} i={i} lockedAt={lockedAt} unlocked={vip.unlocked || !includeLocked} count={lockedCount} art={art}>
            <CreatorCard c={c} index={i} list={list} eager={i < 2} />
          </FragmentWithLock>
        ))}
        {includeLocked && results.length > 0 && results.length <= lockedAt && !vip.unlocked && lockedCount > 0 && <LockedCard index={results.length} count={lockedCount} art={art} />}
      </div>

      {results.length === 0 && (
        <div className="panel cell" style={{ textAlign: "center", marginTop: 8 }}>
          <h3 className="t-headline">No one matches that yet</h3>
          <p className="muted" style={{ marginTop: 6 }}>Try fewer filters or a different search.</p>
          <button className="btn btn-sm btn-tinted" style={{ marginTop: 14 }} onClick={() => { setF(EMPTY); setQ(""); setQuick("all"); }}>
            Clear everything
          </button>
        </div>
      )}

      {showToolbar && (
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          title="Filters"
          label="Filters"
          footer={
            <>
              <button className="btn btn-gray" onClick={() => { setDraft(EMPTY); setDraftSort(initialSort); }}>Reset</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setF(draft);
                  setSort(draftSort);
                  setQuick("");
                  setOpen(false);
                  track("filter_apply", { m: { hair: draft.hair.join("|"), tags: draft.tags.join("|"), region: draft.region.join("|"), age: draft.age.join("|"), free: draft.free, l: list } });
                }}
              >
                Show {countFor(all, draft)} creators
              </button>
            </>
          }
        >
          <div className="filter-group">
            <h3>Sort by</h3>
            <div className="filter-opts">
              {([["featured", "For you"], ["new", "Newest"], ["trending", "Hot right now"]] as [Sort, string][]).map(([v, l]) => (
                <button key={v} className="chip" aria-pressed={draftSort === v} onClick={() => setDraftSort(v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group toggle-row">
            <div>
              <div className="t-headline">Free pages only</div>
              <p className="t-foot c2" style={{ marginTop: 2 }}>Hide subscription pages</p>
            </div>
            <button className="switch" role="switch" aria-checked={draft.free} aria-label="Free only" onClick={() => setDraft({ ...draft, free: !draft.free })} />
          </div>
          <FilterGroup title="Age" opts={AGE.map((a) => [a.id, 0])} value={draft.age} onChange={(age) => setDraft({ ...draft, age })} hideCount />
          <FilterGroup title="Hair" opts={facets.hair} value={draft.hair} onChange={(hair) => setDraft({ ...draft, hair })} />
          <FilterGroup title="Vibe" opts={facets.tags} value={draft.tags} onChange={(tags) => setDraft({ ...draft, tags })} format={cap} />
          <FilterGroup title="Eyes" opts={facets.eyes} value={draft.eyes} onChange={(eyes) => setDraft({ ...draft, eyes })} />
          <FilterGroup
            title="From"
            opts={regions.map((r) => [r.region, 0] as [string, number])}
            value={draft.region}
            onChange={(region) => setDraft({ ...draft, region })}
            format={(r) => regions.find((x) => x.region === r)?.label || r}
            hideCount
          />
        </Sheet>
      )}
    </div>
  );
}

function FragmentWithLock({ i, lockedAt, unlocked, count, art, children }: { i: number; lockedAt: number; unlocked: boolean; count: number; art?: string; children: React.ReactNode }) {
  return (
    <>
      {i === lockedAt && !unlocked && count > 0 && <LockedCard index={i} count={count} art={art} />}
      {children}
    </>
  );
}

function FilterDot({ n }: { n: number }) {
  return (
    <span style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 99, background: "var(--tint)", color: "var(--on-tint)", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 4px" }}>
      {n}
    </span>
  );
}

function FilterGroup({ title, opts, value, onChange, format = (s) => s, hideCount }: { title: string; opts: [string, number][]; value: string[]; onChange: (v: string[]) => void; format?: (s: string) => string; hideCount?: boolean }) {
  if (!opts.length) return null;
  return (
    <div className="filter-group">
      <h3>{title}</h3>
      <div className="filter-opts">
        {opts.map(([v, n]) => {
          const on = value.includes(v);
          return (
            <button key={v} className="chip" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== v) : [...value, v])}>
              {format(v)}
              {!hideCount && <span className="count">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Segmented({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const opts: [Sort, string][] = [["featured", "For you"], ["new", "New"], ["trending", "Hot"]];
  const wrap = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ x: 0, w: 0 });
  useLayoutEffect(() => {
    const btn = wrap.current?.querySelector<HTMLButtonElement>(`[data-v="${value}"]`);
    if (btn) setThumb({ x: btn.offsetLeft, w: btn.offsetWidth });
  }, [value]);
  return (
    <div className="seg" ref={wrap} role="group" aria-label="Sort">
      <span className="seg-thumb" style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w }} aria-hidden />
      {opts.map(([v, l]) => (
        <button key={v} data-v={v} aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

function countFor(cards: CardData[], f: Filters) {
  return cards.filter((c) => {
    if (f.free && !c.free) return false;
    if (f.hair.length && !f.hair.includes(c.hair || "")) return false;
    if (f.eyes.length && !f.eyes.includes(c.eyes || "")) return false;
    if (f.region.length && !f.region.includes(c.region || "")) return false;
    if (f.tags.length && !f.tags.every((t) => c.tags.includes(t))) return false;
    if (f.age.length && !f.age.some((id) => {
      const a = AGE.find((x) => x.id === id)!;
      return c.age != null && c.age >= a.min && c.age <= a.max;
    })) return false;
    return true;
  }).length;
}

function cap(s: string) {
  return s.replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}
