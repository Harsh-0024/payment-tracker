import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";

import { rupee } from "./people";
const fmt = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
const iso = (d) => (d ? String(d).slice(0, 10) : "");

function metaOf(p) {
  try {
    const m = JSON.parse(p.note);
    return m && typeof m === "object" ? m : null;
  } catch {
    return null;
  }
}

const LIMIT = 20;

export default function GlobalSearch({ entries = [], friends = [] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [payments, setPayments] = useState([]);
  const [paymentsFailed, setPaymentsFailed] = useState(false);

  async function loadPayments() {
    const { data, error } = await supabase
      .from("app_payments")
      .select("*")
      .order("created_at", { ascending: false });
    // Without this, a failed load looked like "no UPI payment matches".
    setPaymentsFailed(!!error);
    if (data) setPayments(data);
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const results = useMemo(() => {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return { entries: [], payments: [], friends: [] };
    const match = (hay) => tokens.every((t) => hay.includes(t));

    const e = entries
      .filter((x) => {
        const dir = x.paid_by === "friend" ? "dena owe you owe" : "lena milega gets";
        const hay = [
          x.friend, x.note, x.amount, rupee(x.amount),
          fmt(x.payment_date), iso(x.payment_date), x.status, dir,
        ].join(" ").toLowerCase();
        return match(hay);
      })
      .sort((a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0));

    const p = payments.filter((x) => {
      const m = metaOf(x);
      const hay = [
        x.friend_name, x.amount, rupee(x.amount), fmt(x.created_at), iso(x.created_at),
        x.status, x.payee_upi, x.reference, "upi",
        m && m.merchant ? "merchant" : "", m && m.splitFriend ? m.splitFriend : "",
      ].join(" ").toLowerCase();
      return match(hay);
    });

    const f = friends.filter((x) => match([x.name, x.upi_id].join(" ").toLowerCase()));

    return { entries: e, payments: p, friends: f };
  }, [q, entries, payments, friends]);

  function net(name) {
    let owe = 0;
    let get = 0;
    entries
      .filter((e) => e.friend === name && e.status !== "Settled")
      .forEach((e) => {
        const a = Number(e.amount) || 0;
        if (e.paid_by === "friend") owe += a;
        else if (e.paid_by === "me") get += a;
      });
    const n = get - owe;
    if (!owe && !get) return "No pending";
    return n >= 0 ? `Owes you ${rupee(n)}` : `You owe ${rupee(-n)}`;
  }

  const blue = "#00baf2";
  const navy = "#002970";
  const active = q.trim().length > 0;
  const total = results.entries.length + results.payments.length + results.friends.length;

  const tabs = [
    ["all", `All (${total})`],
    ["entries", `Entries (${results.entries.length})`],
    ["payments", `UPI payments (${results.payments.length})`],
    ["friends", `Friends (${results.friends.length})`],
  ];

  const row = {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    padding: "10px 0", borderBottom: "1px solid #eef2f7",
  };
  const title = { fontWeight: 700, fontSize: 14, color: "#0f172a" };
  const sub = { fontSize: 12, color: "#64748b", marginTop: 2, wordBreak: "break-word" };
  const amt = { fontWeight: 800, fontSize: 14, color: "#0f172a", whiteSpace: "nowrap" };
  const head = { fontSize: 12, fontWeight: 800, color: navy, margin: "12px 0 2px", textTransform: "uppercase", letterSpacing: 0.5 };

  function more(n) {
    return n > LIMIT ? (
      <div style={{ ...sub, padding: "8px 0" }}>+{n - LIMIT} more, refine your search</div>
    ) : null;
  }

  return (
    <div
      style={{
        background: "#fff", borderRadius: 16, padding: 12, marginBottom: 14,
        boxShadow: "0 2px 12px rgba(0,41,112,.08)", color: "#0f172a",
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flex: "none", marginLeft: 4 }}>
          <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={loadPayments}
          placeholder="Search people, amounts, notes…"
          aria-label="Search by friend, amount, note, date, UPI ID or status"
          style={{
            flex: 1, border: "1px solid #cbd5e1", borderRadius: 999, padding: "10px 14px",
            fontSize: 14, outline: "none", background: "#fff", color: "#0f172a", minWidth: 0,
          }}
        />
        {active && (
          <button
            type="button"
            onClick={() => setQ("")}
            style={{ border: 0, background: "transparent", color: "#64748b", fontSize: 18, cursor: "pointer" }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {active && (
        <>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 10 }}>
            {tabs.map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                style={{
                  flex: "0 0 auto", border: `1px solid ${blue}`, borderRadius: 999, padding: "5px 12px",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: kind === k ? blue : "#fff", color: kind === k ? "#fff" : navy,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {paymentsFailed && (
            <div style={{ ...sub, color: "#b45309", padding: "8px 0 0" }}>
              UPI payments couldn't be loaded, so they aren't in these results.
            </div>
          )}

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {total === 0 && <div style={{ ...sub, padding: "14px 0" }}>Kuch nahi mila. Doosra shabd try karo.</div>}

            {(kind === "all" || kind === "friends") && results.friends.length > 0 && (
              <>
                <div style={head}>Friends</div>
                {results.friends.slice(0, LIMIT).map((f) => (
                  <div style={row} key={"f" + f.id}>
                    <div>
                      <div style={title}>👤 {f.name}</div>
                      <div style={sub}>{f.upi_id || "No UPI ID saved"}</div>
                    </div>
                    <div style={{ ...sub, fontWeight: 700, textAlign: "right" }}>{net(f.name)}</div>
                  </div>
                ))}
                {more(results.friends.length)}
              </>
            )}

            {(kind === "all" || kind === "entries") && results.entries.length > 0 && (
              <>
                <div style={head}>Entries</div>
                {results.entries.slice(0, LIMIT).map((e) => (
                  <div style={row} key={"e" + e.id}>
                    <div>
                      <div style={title}>{e.friend}</div>
                      <div style={sub}>
                        {fmt(e.payment_date)} · {e.paid_by === "friend" ? "You owe" : "Owes you"} ·{" "}
                        {e.status === "Settled" ? "Settled" : "Pending"}
                        {e.note ? ` · ${e.note}` : ""}
                      </div>
                    </div>
                    <div style={amt}>{rupee(e.amount)}</div>
                  </div>
                ))}
                {more(results.entries.length)}
              </>
            )}

            {(kind === "all" || kind === "payments") && results.payments.length > 0 && (
              <>
                <div style={head}>UPI payments</div>
                {results.payments.slice(0, LIMIT).map((p) => {
                  const m = metaOf(p);
                  return (
                    <div style={row} key={"p" + p.id}>
                      <div>
                        <div style={title}>{p.friend_name}{m && m.merchant ? " (merchant)" : ""}</div>
                        <div style={sub}>
                          {fmt(p.created_at)} · {p.status}
                          {p.payee_upi ? ` · ${p.payee_upi}` : ""}
                          {p.reference ? ` · Ref ${p.reference}` : ""}
                        </div>
                      </div>
                      <div style={amt}>{rupee(p.amount)}</div>
                    </div>
                  );
                })}
                {more(results.payments.length)}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
