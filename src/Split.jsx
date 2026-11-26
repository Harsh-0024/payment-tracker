import { useState } from "react";
import { supabase } from "./supabaseClient";
import { buildMessage, openWhatsApp } from "./reminder";

const MODES = ["Card", "UPI", "Cash", "Other"];
import { rupee } from "./people";
const todayLocal = () => new Date().toLocaleDateString("en-CA");

export default function Split({ entries, friends, reload, setError, goFriends, myName }) {
  const [total, setTotal] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [due, setDue] = useState("");
  const [mode, setMode] = useState("UPI");
  const [payer, setPayer] = useState("me");
  const [withMe, setWithMe] = useState(true);
  const [picked, setPicked] = useState([]);
  const [how, setHow] = useState("equal");
  const [custom, setCustom] = useState({});
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);

  function togglePick(name) {
    if (picked.includes(name)) {
      setPicked(picked.filter((p) => p !== name));
      if (payer === name) setPayer("me");
    } else {
      setPicked([...picked, name]);
    }
  }

  const t = Number(total) || 0;
  const people = [...(withMe ? ["me"] : []), ...picked];
  const n = people.length;

  const shares = {};
  people.forEach((p) => {
    shares[p] =
      how === "equal"
        ? n ? Math.round((t / n) * 100) / 100 : 0
        : Number(custom[p]) || 0;
  });
  const shareSum = people.reduce((s, p) => s + shares[p], 0);
  const diff = Math.round((t - shareSum) * 100) / 100;

  let problem = "";
  if (!t) problem = "Enter the total amount.";
  else if (picked.length === 0) problem = "Pick at least one friend.";
  else if (payer !== "me" && !withMe)
    problem = "This split doesn't include you, so there is nothing to record.";
  else if (how === "custom" && diff !== 0)
    problem = diff > 0
      ? `${rupee(diff)} is still left to assign.`
      : `Amounts are ${rupee(-diff)} more than the total.`;

  const preview = [];
  if (!problem) {
    if (payer === "me") {
      picked.forEach((f) => preview.push(`${f} owes you ${rupee(shares[f])}`));
    } else {
      preview.push(`You owe ${payer} ${rupee(shares.me)}`);
      picked
        .filter((f) => f !== payer)
        .forEach((f) =>
          preview.push(`${f} owes ${payer} ${rupee(shares[f])} (not tracked in your ledger)`)
        );
    }
  }

  async function save() {
    if (problem) return;
    setBusy(true);
    const label = `Split: ${note || "shared expense"} (${n} people)`;
    let rows = [];
    if (payer === "me") {
      rows = picked
        .map((f) => ({
          friend: f,
          amount: shares[f],
          note: label,
          mode,
          paid_by: "me",
          payment_date: date,
          due_date: due || null,
        }))
        .filter((r) => r.amount > 0);
    } else if (withMe && shares.me > 0) {
      rows = [
        {
          friend: payer,
          amount: shares.me,
          note: label,
          mode,
          paid_by: "friend",
          payment_date: date,
          due_date: null,
        },
      ];
    }
    if (rows.length === 0) {
      setError("Nothing to save.");
      setBusy(false);
      return;
    }
    const { data, error } = await supabase.from("entries").insert(rows).select();
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    setError("");
    await reload();
    setSaved({ rows: data, payer });
    setTotal("");
    setNote("");
    setDue("");
    setCustom({});
    setBusy(false);
  }

  function remind(en) {
    const f = friends.find((x) => x.name === en.friend);
    const text = buildMessage({ friend: en.friend, entries, entry: en, myName });
    openWhatsApp(f && f.phone, text);
  }

  const savedRows = saved
    ? saved.rows.map((r) => entries.find((x) => x.id === r.id)).filter(Boolean)
    : [];

  return (
    <>
      <p className="sub">Split a bill with friends and see who needs to pay whom.</p>

      {saved && (
        <div className="card notify">
          <h3>Split saved ✅</h3>
          <p className="sub" style={{ margin: "8px 0 0" }}>
            {saved.payer === "me"
              ? "Send a reminder to each friend:"
              : "Your share is added to Payments."}
          </p>
          {saved.payer === "me" &&
            savedRows.map((en) => (
              <div className="entry" key={en.id}>
                <div>
                  <div className="entry-name">{en.friend}</div>
                  <div className="entry-meta">owes you {rupee(en.amount)}</div>
                </div>
                <button className="small" onClick={() => remind(en)}>
                  Remind on WhatsApp
                </button>
              </div>
            ))}
          <div className="actions">
            <button className="ghost" onClick={() => setSaved(null)}>Dismiss</button>
          </div>
        </div>
      )}

      <div className="card">
        <h3>New split</h3>

        <label>What was it for?</label>
        <input placeholder="Dinner, trip, cab..." value={note}
          onChange={(e) => setNote(e.target.value)} />

        <div className="row2">
          <div>
            <label>Total bill (₹)</label>
            <input type="number" placeholder="2000" value={total}
              onChange={(e) => setTotal(e.target.value)} />
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <label>Who was there?</label>
        {friends.length === 0 && (
          <p className="sub" style={{ marginBottom: 8 }}>
            No friends yet.{" "}
            <button type="button" className="link" onClick={goFriends}>
              Add friends first
            </button>
          </p>
        )}
        <div className="seg">
          <button type="button" className={withMe ? "on" : ""}
            onClick={() => setWithMe(!withMe)}>Me</button>
          {friends.map((f) => (
            <button key={f.id} type="button"
              className={picked.includes(f.name) ? "on" : ""}
              onClick={() => togglePick(f.name)}>
              {f.name}
            </button>
          ))}
        </div>

        <label>Who paid the bill?</label>
        <div className="seg">
          {["me", ...picked].map((p) => (
            <button key={p} type="button" className={payer === p ? "on" : ""}
              onClick={() => setPayer(p)}>
              {p === "me" ? "I paid" : `${p} paid`}
            </button>
          ))}
        </div>

        <label>How to split?</label>
        <div className="seg">
          <button type="button" className={how === "equal" ? "on" : ""}
            onClick={() => setHow("equal")}>Equally</button>
          <button type="button" className={how === "custom" ? "on" : ""}
            onClick={() => setHow("custom")}>Custom amounts</button>
        </div>

        {how === "equal" && n > 0 && t > 0 && (
          <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>
            {rupee(shares[people[0]])} each ({n} people)
          </p>
        )}

        {how === "custom" &&
          people.map((p) => (
            <div className="row2" key={p} style={{ alignItems: "center", marginTop: 10 }}>
              <div style={{ fontSize: 18 }}>{p === "me" ? "Me" : p}</div>
              <input type="number" placeholder="0" value={custom[p] || ""}
                onChange={(e) => setCustom({ ...custom, [p]: e.target.value })} />
            </div>
          ))}

        <label>Paid via</label>
        <div className="seg">
          {MODES.map((m) => (
            <button key={m} type="button" className={mode === m ? "on" : ""}
              onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>

        {payer === "me" && (
          <>
            <label>Pay me back by (optional)</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </>
        )}

        {preview.length > 0 && (
          <div style={{ background: "#f1f7f2", borderRadius: 14, padding: 16, marginTop: 20 }}>
            <strong>Summary</strong>
            {preview.map((line, i) => (
              <div key={i} style={{ marginTop: 6 }}>{line}</div>
            ))}
          </div>
        )}

        {problem && (
          <p className="sub" style={{ marginTop: 16, marginBottom: 0 }}>{problem}</p>
        )}

        <button className="primary" type="button" onClick={save}
          disabled={!!problem || busy}
          style={{ opacity: problem || busy ? 0.5 : 1 }}>
          {busy ? "Saving..." : "Save split"}
        </button>
      </div>
    </>
  );
}