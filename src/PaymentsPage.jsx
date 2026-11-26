import { useState } from "react";
import { supabase } from "./supabaseClient";
import { friendlyDate, friendlyDateLower } from "./dates";
import { getUpi, buildMessage, openWhatsApp, shareQR } from "./reminder";

// After you deploy the app, put its web address here (for example "https://yourapp.vercel.app")
const APP_URL = "";

const MODES = ["Card", "UPI", "Cash", "Other"];
const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");
const todayLocal = () => new Date().toLocaleDateString("en-CA");
const sumAmt = (list) => list.reduce((s, e) => s + Number(e.amount), 0);

function EditForm({ entry, friends, onSave, onCancel }) {
  const [d, setD] = useState({
    friend: entry.friend,
    amount: String(entry.amount),
    payment_date: entry.payment_date,
    due_date: entry.due_date || "",
    note: entry.note || "",
    paid_by: entry.paid_by,
    mode: entry.mode,
  });
  const set = (k, v) => setD({ ...d, [k]: v });

  const names = friends.map((f) => f.name);
  if (!names.includes(d.friend)) names.unshift(d.friend);

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(d);
      }}
    >
      <h3>Edit payment</h3>
      {entry.friend_user_id && (
        <p className="sub" style={{ margin: "8px 0 0" }}>
          This payment is shared with {entry.friend}, so they will see your changes.
        </p>
      )}

      <label>Friend</label>
      <select value={d.friend} onChange={(e) => set("friend", e.target.value)} required>
        {names.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      <div className="row2">
        <div>
          <label>Amount (₹)</label>
          <input type="number" value={d.amount}
            onChange={(e) => set("amount", e.target.value)} required />
        </div>
        <div>
          <label>Payment date</label>
          <input type="date" value={d.payment_date}
            onChange={(e) => set("payment_date", e.target.value)} required />
        </div>
      </div>

      <label>Pay me back by (optional)</label>
      <input type="date" value={d.due_date}
        onChange={(e) => set("due_date", e.target.value)} />

      <label>Description</label>
      <input value={d.note} onChange={(e) => set("note", e.target.value)} />

      <label>Who paid?</label>
      <div className="seg">
        <button type="button" className={d.paid_by === "me" ? "on" : ""}
          onClick={() => set("paid_by", "me")}>I paid</button>
        <button type="button" className={d.paid_by === "friend" ? "on" : ""}
          onClick={() => set("paid_by", "friend")}>Friend paid</button>
      </div>

      <label>Paid via</label>
      <div className="seg">
        {MODES.map((m) => (
          <button key={m} type="button" className={d.mode === m ? "on" : ""}
            onClick={() => set("mode", m)}>{m}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button className="small" type="submit">Save changes</button>
        <button className="ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function PaymentsPage({ entries, friends, reload, setError, goFriends, myName }) {
  const [friend, setFriend] = useState("");
  const [newMode, setNewMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState("me");
  const [mode, setMode] = useState("UPI");
  const [filter, setFilter] = useState("All");
  const [lastAdded, setLastAdded] = useState(null);
  const [editingId, setEditingId] = useState(null);

  function onFriendChange(v) {
    if (v === "__new__") {
      setNewMode(true);
      setFriend("");
    } else {
      setNewMode(false);
      setFriend(v);
    }
  }

  async function add(e) {
    e.preventDefault();
    if (!amount) return;

    let friendName = friend;
    if (newMode) {
      const n = newName.trim();
      if (!n) {
        setError("Enter the friend's name.");
        return;
      }
      const existing = friends.find((f) => f.name.toLowerCase() === n.toLowerCase());
      if (existing) {
        friendName = existing.name;
      } else {
        const { error: fe } = await supabase
          .from("friends")
          .insert({ name: n, phone: newPhone.trim() || null });
        if (fe) {
          setError(fe.message);
          return;
        }
        friendName = n;
      }
    } else if (!friend) {
      return;
    }

    const { data, error } = await supabase
      .from("entries")
      .insert({
        friend: friendName,
        amount: Number(amount),
        note,
        mode,
        paid_by: paidBy,
        payment_date: date,
        due_date: due || null,
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setError("");
    setAmount("");
    setNote("");
    setDue("");
    setNewMode(false);
    setNewName("");
    setNewPhone("");
    setFriend(friendName);
    await reload();
    setLastAdded({ id: data.id });
  }

  async function saveEdit(en, d) {
    const amt = Number(d.amount);
    if (!d.friend || !(amt > 0)) {
      setError("Choose a friend and enter an amount above 0.");
      return;
    }
    const { error } = await supabase
      .from("entries")
      .update({
        friend: d.friend,
        amount: amt,
        payment_date: d.payment_date,
        due_date: d.due_date || null,
        note: d.note,
        paid_by: d.paid_by,
        mode: d.mode,
      })
      .eq("id", en.id);
    if (error) {
      setError(error.message);
      return;
    }
    setError("");
    setEditingId(null);
    reload();
  }

  function remind(en) {
    const f = friends.find((x) => x.name === en.friend);
    const text = buildMessage({ friend: en.friend, entries, entry: en, myName });
    openWhatsApp(f && f.phone, text);
  }

  function invite(f) {
    const lines = [
      `Hi ${f.name}! 👋`,
      `${myName || "A friend"} added a payment for you on SplitPay.`,
      "Join SplitPay and enter this invite code (Friends → Have an invite code) to see it in your own account:",
      `🔑 ${f.invite_code}`,
    ];
    if (APP_URL) lines.push("", APP_URL);
    openWhatsApp(f.phone, lines.join("\n"));
  }

  async function sendQR() {
    const upi = getUpi();
    if (!upi.id) {
      setError("First save your UPI ID in Profile.");
      return;
    }
    await shareQR(upi.id, upi.name);
  }

  async function toggle(en) {
    await supabase
      .from("entries")
      .update({ status: en.status === "Settled" ? "Pending" : "Settled" })
      .eq("id", en.id);
    reload();
  }

  async function remove(en) {
    const ok = window.confirm(
      `Delete this ${rupee(en.amount)} payment with ${en.friend}? This cannot be undone.`
    );
    if (!ok) return;
    const { error } = await supabase.from("entries").delete().eq("id", en.id);
    if (error) setError(error.message);
    reload();
  }

  const added = lastAdded && entries.find((x) => x.id === lastAdded.id);
  const addedFriend = added && friends.find((f) => f.name === added.friend);
  const needsInvite = addedFriend && !addedFriend.linked_user_id;
  const shown = entries.filter((e) => filter === "All" || e.mode === filter);
  const total = sumAmt(shown);

  return (
    <>
      <h1>Payments</h1>
      <p className="sub">Record payments and keep track of what you owe each other.</p>

      {added && (
        <div className="card notify">
          <h3>Payment added ✅</h3>

          {added.paid_by === "me" && (
            <p className="sub" style={{ margin: "8px 0 0" }}>
              Send {added.friend} a reminder on WhatsApp?
            </p>
          )}

          {needsInvite && (
            <p className="sub" style={{ margin: "8px 0 0" }}>
              {added.friend} isn't on SplitPay yet. Share invite code{" "}
              <strong>{addedFriend.invite_code}</strong> so this payment also shows in their
              account.
            </p>
          )}

          <div className="actions">
            {added.paid_by === "me" && (
              <>
                <button className="small" onClick={() => remind(added)}>
                  Send on WhatsApp
                </button>
                <button className="ghost" onClick={sendQR}>Get QR image</button>
              </>
            )}
            {needsInvite && (
              <button className="small" onClick={() => invite(addedFriend)}>
                Send invite on WhatsApp
              </button>
            )}
            <button className="ghost" onClick={() => setLastAdded(null)}>Dismiss</button>
          </div>
        </div>
      )}

      <form className="card" onSubmit={add}>
        <h3>Add a payment</h3>

        <label>Friend</label>
        <select
          value={newMode ? "__new__" : friend}
          onChange={(e) => onFriendChange(e.target.value)}
          required
        >
          <option value="">Select a friend</option>
          {friends.map((f) => (
            <option key={f.id} value={f.name}>{f.name}</option>
          ))}
          <option value="__new__">＋ Add a new friend…</option>
        </select>

        {newMode && (
          <div className="stack" style={{ marginTop: 12 }}>
            <input placeholder="Friend's name" value={newName}
              onChange={(e) => setNewName(e.target.value)} required />
            <input placeholder="WhatsApp number (optional)" inputMode="tel" value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)} />
            <p className="sub" style={{ margin: 0 }}>
              A unique invite code is created automatically. Share it so this payment also
              shows in their account.
            </p>
          </div>
        )}

        {friends.length === 0 && !newMode && (
          <p className="sub" style={{ marginTop: 8, marginBottom: 0 }}>
            No friends yet. Choose "Add a new friend" above, or{" "}
            <button type="button" className="link" onClick={goFriends}>
              open Friends
            </button>
            .
          </p>
        )}

        <div className="row2">
          <div>
            <label>Amount (₹)</label>
            <input type="number" placeholder="1000" value={amount}
              onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label>Payment date</label>
            <input type="date" value={date}
              onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>

        <label>Pay me back by (optional)</label>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />

        <label>Description</label>
        <input placeholder="Lunch, movie tickets, cab..." value={note}
          onChange={(e) => setNote(e.target.value)} />

        <label>Who paid?</label>
        <div className="seg">
          <button type="button" className={paidBy === "me" ? "on" : ""}
            onClick={() => setPaidBy("me")}>I paid</button>
          <button type="button" className={paidBy === "friend" ? "on" : ""}
            onClick={() => setPaidBy("friend")}>Friend paid</button>
        </div>

        <label>Paid via</label>
        <div className="seg">
          {MODES.map((m) => (
            <button key={m} type="button" className={mode === m ? "on" : ""}
              onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>

        <button className="primary" type="submit">Add Payment</button>
      </form>

      <h2>Payment history</h2>
      <div className="tabs">
        {["All", ...MODES].map((m) => (
          <button key={m}
            className={"tab" + (filter === m ? " active" : "")}
            onClick={() => setFilter(m)}>
            {m}
          </button>
        ))}
      </div>
      <p className="sub" style={{ marginTop: 16, marginBottom: 0 }}>
        {filter} total: {rupee(total)}
      </p>

      {shown.length === 0 && <p className="sub">No payments here yet.</p>}
      {shown.map((en) => {
        if (editingId === en.id) {
          return (
            <EditForm
              key={en.id}
              entry={en}
              friends={friends}
              onSave={(d) => saveEdit(en, d)}
              onCancel={() => setEditingId(null)}
            />
          );
        }
        const fr = friends.find((f) => f.name === en.friend);
        const canInvite = !en.shared && fr && !fr.linked_user_id;
        return (
          <div className={"entry" + (en.status === "Settled" ? " settled" : "")} key={en.id}>
            <div>
              <div className="entry-name">{en.friend}</div>
              <div className="entry-meta">
                {friendlyDate(en.payment_date)} · {en.mode}
                {en.note ? ` · ${en.note}` : ""}
                {en.due_date
                  ? ` · Due ${friendlyDateLower(en.due_date)}`
                  : ""}
              </div>
            </div>
            <div className="entry-right">
              <div className={"entry-amount " + (en.paid_by === "me" ? "pos" : "neg")}>
                {en.paid_by === "me" ? "You paid " : `${en.friend} paid `}
                {rupee(en.amount)}
              </div>
              {en.paid_by === "me" && en.status !== "Settled" && (
                <>
                  <button className="remind" onClick={() => remind(en)}>Remind</button>
                  {" · "}
                </>
              )}
              {canInvite && (
                <>
                  <button className="remind" onClick={() => invite(fr)}>Invite</button>
                  {" · "}
                </>
              )}
              {en.shared ? (
                <span className="entry-meta">Added by {en.friend}</span>
              ) : (
                <>
                  <button className="remind" onClick={() => setEditingId(en.id)}>Edit</button>
                  {" · "}
                  <button className="del muted" onClick={() => toggle(en)}>
                    {en.status === "Settled" ? "Mark pending" : "Mark settled"}
                  </button>
                  {" · "}
                  <button className="del" onClick={() => remove(en)}>Delete</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}