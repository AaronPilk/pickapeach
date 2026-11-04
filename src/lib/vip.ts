"use client";

// Tiny global store for the VIP gate: whether this visitor has unlocked,
// the unlocked content, and whether the unlock sheet is open.
import { useSyncExternalStore } from "react";
import type { VipContent, VipSummary } from "./types";

type State = {
  unlocked: boolean;
  open: boolean;
  origin: string; // where the gate was opened from (for tracking)
  creator?: string;
  content: VipContent | null;
  summary: VipSummary | null;
};

let state: State = { unlocked: false, open: false, origin: "", content: null, summary: null };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

export function useVip() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
    () => state,
  );
}

let booted = false;
export function bootVip() {
  if (booted || typeof document === "undefined") return;
  booted = true;
  const unlocked = /(?:^|; )pp_unlocked=1/.test(document.cookie);
  set({ unlocked });
  fetch("/api/vip/summary")
    .then((r) => (r.ok ? r.json() : null))
    .then((summary) => summary && set({ summary }))
    .catch(() => {});
  if (unlocked) loadVip();
}

export async function loadVip() {
  try {
    const r = await fetch("/api/vip", { credentials: "same-origin" });
    if (r.status === 401) {
      document.cookie = "pp_unlocked=; Path=/; Max-Age=0";
      set({ unlocked: false, content: null });
      return;
    }
    if (r.ok) set({ content: await r.json(), unlocked: true });
  } catch {}
}

export function openGate(origin: string, creator?: string) {
  set({ open: true, origin, creator });
}
export function closeGate() {
  set({ open: false });
}
export function markUnlocked(content: VipContent | null) {
  set({ unlocked: true, content });
}
