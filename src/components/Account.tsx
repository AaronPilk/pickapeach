"use client";

import { useCallback, useEffect, useState } from "react";

type Owner = { id: string; email: string; name?: string; lastLogin?: string; createdAt: string; you: boolean };

const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "That didn't work.");
  return d;
};

// Dashboard → Account: change your password, add or remove other owner logins, sign out.
export default function Account({ onSignOut }: { onSignOut: () => void }) {
  const [me, setMe] = useState<{ email: string; name?: string } | null>(null);
  const [team, setTeam] = useState<Owner[]>([]);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [add, setAdd] = useState({ email: "", name: "", password: "" });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [m, t] = await Promise.all([fetch("/api/admin/me", { cache: "no-store" }), fetch("/api/admin/team", { cache: "no-store" })]);
    if (m.ok) setMe(await m.json());
    if (t.ok) setTeam(await t.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "ok", text: ok });
      load();
      return true;
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "That didn't work." });
      return false;
    }
  };

  return (
    <section style={{ marginTop: 10, display: "grid", gap: 18, maxWidth: 560 }}>
      {msg && <p className={msg.kind === "err" ? "form-error" : "studio-ok"} role="status">{msg.text}</p>}

      <div className="group-card" style={{ padding: 16 }}>
        <b>Signed in as {me?.name ? `${me.name} · ` : ""}{me?.email || "…"}</b>
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-sm btn-gray" onClick={async () => { await fetch("/api/admin/logout"); onSignOut(); }}>Sign out</button>
        </div>
      </div>

      <form
        className="group-card"
        style={{ padding: 16, display: "grid", gap: 10 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => post("/api/admin/password", pw), "Password changed. Other devices were signed out.")) setPw({ current: "", next: "" });
        }}
      >
        <b>Change password</b>
        <input className="input" type="password" autoComplete="current-password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <input className="input" type="password" autoComplete="new-password" placeholder="New password (10+ characters)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <button className="btn btn-sm btn-primary" disabled={!pw.current || pw.next.length < 10}>Update password</button>
      </form>

      <div className="group-card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <b>Owner logins</b>
        {team.map((o) => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
            <span className="t-foot" style={{ minWidth: 0, wordBreak: "break-all" }}>
              {o.name ? `${o.name} · ` : ""}{o.email}{o.you ? " (you)" : ""}
              <span className="c3"> · {o.lastLogin ? `last in ${new Date(o.lastLogin).toLocaleDateString()}` : "never signed in"}</span>
            </span>
            {!o.you && (
              <button
                className="btn btn-sm btn-gray"
                onClick={() => confirm(`Remove ${o.email}'s login?`) && run(() => post("/api/admin/team/remove", { id: o.id }), "Login removed.")}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <form
        className="group-card"
        style={{ padding: 16, display: "grid", gap: 10 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => post("/api/admin/team/add", add), `Login created for ${add.email}. Send them the password privately and ask them to change it.`)) setAdd({ email: "", name: "", password: "" });
        }}
      >
        <b>Add an owner</b>
        <p className="t-foot c2">They&apos;ll see everything here, including leads. Only add people you trust.</p>
        <input className="input" type="email" placeholder="Email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
        <input className="input" type="text" placeholder="Name (optional)" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
        <input className="input" type="password" autoComplete="new-password" placeholder="Temporary password (10+ characters)" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} />
        <button className="btn btn-sm btn-primary" disabled={!add.email || add.password.length < 10}>Create login</button>
      </form>
    </section>
  );
}
