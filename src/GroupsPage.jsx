import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { friendlyDate } from "./dates";
import { getUpi, openWhatsApp, shareQR } from "./reminder";

const ME = "__me__";
const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");
const todayLocal = () => new Date().toLocaleDateString("en-CA");
const round2 = (x) => Math.round(x * 100) / 100;
const fmt = (s) => friendlyDate(s);

function equalShares(total, names) {
  const cents = Math.round(total * 100);
  const n = names.length;
  const base = Math.floor(cents / n);
  const extra = cents - base * n;
  const out = {};
  names.forEach((nm, i) => {
    out[nm] = (base + (i < extra ? 1 : 0)) / 100;
  });
  return out;
}

function computeBalances(names, expenses) {
  const bal = {};
  names.forEach((n) => (bal[n] = 0));
  expenses.forEach((e) => {
    bal[e.paid_by] = (bal[e.paid_by] || 0) + Number(e.amount);
    Object.entries(e.shares).forEach(([n, s]) => {
      bal[n] = (bal[n] || 0) - Number(s);
    });
  });
  Object.keys(bal).forEach((k) => (bal[k] = round2(bal[k])));
  return bal;
}

function suggest(bal) {
  const debtors = [];
  const creditors = [];
  Object.entries(bal).forEach(([n, v]) => {
    if (v < -0.005) debtors.push([n, -v]);
    else if (v > 0.005) creditors.push([n, v]);
  });
  debtors.sort((a, b) => b[1] - a[1]);
  creditors.sort((a, b) => b[1] - a[1]);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i][1], creditors[j][1]);
    out.push({ from: debtors[i][0], to: creditors[j][0], amount: round2(amt) });
    debtors[i][1] -= amt;
    creditors[j][1] -= amt;
    if (debtors[i][1] < 0.005) i++;
    if (creditors[j][1] < 0.005) j++;
  }
  return out;
}

export default function GroupsPage({ friends, setError, myName, goFriends }) {
  const [myId, setMyId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [profileNames, setProfileNames] = useState({});
  const [openId, setOpenId] = useState(null);

  async function load() {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session ? s.session.user.id : null;
    const [g, m, x, p] = await Promise.all([
      supabase.from("friend_groups").select("*").order("created_at", { ascending: false }),
      supabase.from("friend_group_members").select("*"),
      supabase
        .from("friend_group_expenses")
        .select("*")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, name"),
    ]);
    const err = g.error || m.error || x.error || p.error;
    if (err) {
      setError(err.message);
      return;
    }
    const map = {};
    p.data.forEach((row) => (map[row.id] = row.name));
    setMyId(uid);
    setProfileNames(map);
    setGroups(g.data);
    setMembers(m.data);
    setExpenses(x.data);
  }

  useEffect(() => {
    load();
  }, []);

  const rowsOf = (gid) => members.filter((m) => m.group_id === gid);
  const groupExpenses = (gid) => expenses.filter((e) => e.group_id === gid);
  const meKeyOf = (g) =>
    g.user_id === myId
      ? ME
      : (rowsOf(g.id).find((m) => m.member_user_id === myId) || {}).name;

  const open = groups.find((g) => g.id === openId);
  if (open) {
    return (
      <GroupDetail
        key={open.id}
        group={open}
        isOwner={open.user_id === myId}
        ownerName={profileNames[open.user_id] || "Owner"}
        meKey={meKeyOf(open) || "__none__"}
        memberRows={rowsOf(open.id)}
        items={groupExpenses(open.id)}
        friends={friends}
        myName={myName}
        reload={load}
        setError={setError}
        onBack={() => setOpenId(null)}
      />
    );
  }

  const owned = groups.filter((g) => g.user_id === myId);
  const shared = groups.filter((g) => g.user_id !== myId);

  const renderRow = (g) => {
    const names = rowsOf(g.id).map((m) => m.name);
    const items = groupExpenses(g.id);
    const meKey = meKeyOf(g);
    const everyone = [
      ...new Set([ME, ...names, ...items.flatMap((e) => [e.paid_by, ...Object.keys(e.shares)])]),
    ];
    const mine = meKey ? computeBalances(everyone, items)[meKey] || 0 : 0;
    return (
      <div className="entry row-click" key={g.id} onClick={() => setOpenId(g.id)}>
        <div>
          <div className="entry-name">{g.name}</div>
          <div className="entry-meta">
            {names.length + 1} people · {items.length} item{items.length === 1 ? "" : "s"}
            {g.user_id !== myId ? ` · Shared by ${profileNames[g.user_id] || "a friend"}` : ""}
          </div>
        </div>
        <div className={"entry-amount " + (mine > 0 ? "pos" : mine < 0 ? "neg" : "")}>
          {mine > 0
            ? `You are owed ${rupee(mine)}`
            : mine < 0
            ? `You owe ${rupee(-mine)}`
            : "Settled up"}
        </div>
      </div>
    );
  };

  return (
    <>
      <p className="sub">Create a group for a trip or outing and see who owes whom.</p>
      <CreateGroup
        friends={friends}
        reload={load}
        setError={setError}
        goFriends={goFriends}
        onCreated={(id) => setOpenId(id)}
      />

      <h2>Your groups</h2>
      {owned.length === 0 && <p className="sub">No groups yet.</p>}
      {owned.map(renderRow)}

      {shared.length > 0 && (
        <>
          <h2>Shared with you</h2>
          {shared.map(renderRow)}
        </>
      )}
    </>
  );
}

function CreateGroup({ friends, reload, setError, goFriends, onCreated }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);
  const friendNames = [...new Set(friends.map((f) => f.name))];

  const toggle = (n) =>
    setPicked(picked.includes(n) ? picked.filter((x) => x !== n) : [...picked, n]);

  async function create(e) {
    e.preventDefault();
    if (!name.trim() || picked.length === 0) {
      setError("Give the group a name and pick at least one friend.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("friend_groups")
      .insert({ name: name.trim() })
      .select()
      .single();
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    const r = await supabase
      .from("friend_group_members")
      .insert(picked.map((n) => ({ group_id: data.id, name: n })));
    setError(r.error ? r.error.message : "");
    setName("");
    setPicked([]);
    setBusy(false);
    await reload();
    onCreated(data.id);
  }

  return (
    <form className="card" onSubmit={create}>
      <h3>Create a group</h3>
      <label>Group name</label>
      <input value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Goa trip, Flat expenses..." />
      <label>Who is in it?</label>
      {friendNames.length === 0 && (
        <p className="sub">
          No friends yet.{" "}
          <button type="button" className="link" onClick={goFriends}>Add friends first</button>
        </p>
      )}
      <div className="seg">
        {friendNames.map((n) => (
          <button key={n} type="button" className={picked.includes(n) ? "on" : ""}
            onClick={() => toggle(n)}>{n}</button>
        ))}
      </div>
      <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>
        You are added automatically. Friends who have SplitPay accounts will see the group too.
      </p>
      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Creating..." : "Create group"}
      </button>
    </form>
  );
}

function GroupDetail({
  group, isOwner, ownerName, meKey, memberRows, items,
  friends, myName, reload, setError, onBack,
}) {
  const names = memberRows.map((m) => m.name);
  const all = [ME, ...names];
  const everyone = [
    ...new Set([...all, ...items.flatMap((e) => [e.paid_by, ...Object.keys(e.shares)])]),
  ];
  const dn = (n) => (n === meKey ? "You" : n === ME ? ownerName : n);
  const bal = computeBalances(everyone, items);
  const plan = suggest(bal);
  const myNet = bal[meKey] || 0;

  const linked = memberRows.filter((m) => m.member_user_id).map((m) => m.name);
  const notLinked = memberRows.filter((m) => !m.member_user_id).map((m) => m.name);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [paidBy, setPaidBy] = useState(ME);
  const [excluded, setExcluded] = useState([]);
  const [how, setHow] = useState("equal");
  const [custom, setCustom] = useState({});

  const splitWith = all.filter((n) => !excluded.includes(n));
  const toggleSplit = (n) =>
    setExcluded(excluded.includes(n) ? excluded.filter((x) => x !== n) : [...excluded, n]);

  async function addExpense(e) {
    e.preventDefault();
    const total = Number(amount);
    if (!(total > 0)) {
      setError("Enter an amount above 0.");
      return;
    }
    if (splitWith.length === 0) {
      setError("Pick at least one person to split with.");
      return;
    }
    let shares = {};
    if (how === "equal") {
      shares = equalShares(total, splitWith);
    } else {
      let sum = 0;
      splitWith.forEach((n) => {
        const v = Number(custom[n]) || 0;
        if (v > 0) {
          shares[n] = v;
          sum += v;
        }
      });
      if (Math.abs(sum - total) > 0.009) {
        setError(`Custom amounts add up to ${rupee(sum)}, but the total is ${rupee(total)}.`);
        return;
      }
    }
    const { error } = await supabase.from("friend_group_expenses").insert({
      group_id: group.id,
      kind: "expense",
      title: title.trim() || "Expense",
      amount: total,
      paid_by: paidBy,
      shares,
      expense_date: date,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setError("");
    setTitle("");
    setAmount("");
    setCustom({});
    reload();
  }

  async function settle(s) {
    const ok = window.confirm(`Record that ${dn(s.from)} paid ${dn(s.to)} ${rupee(s.amount)}?`);
    if (!ok) return;
    const { error } = await supabase.from("friend_group_expenses").insert({
      group_id: group.id,
      kind: "settlement",
      title: "Settlement",
      amount: s.amount,
      paid_by: s.from,
      shares: { [s.to]: s.amount },
      expense_date: todayLocal(),
    });
    setError(error ? error.message : "");
    reload();
  }

  function remind(s) {
    const f = friends.find((x) => x.name === s.from);
    const upi = getUpi();
    const lines = [
      `Hi ${s.from}! 👋`,
      `Reminder from ${myName || "me"} for the group "${group.name}".`,
      "",
      `💸 Please pay me: ${rupee(s.amount)}`,
    ];
    if (upi.id) {
      lines.push("", `Pay via UPI: ${upi.id}`, "My payment QR is in the next message 👇");
    }
    openWhatsApp(f && f.phone, lines.join("\n"));
  }

  async function sendQR() {
    const upi = getUpi();
    if (!upi.id) {
      setError("First save your UPI ID in Profile.");
      return;
    }
    await shareQR(upi.id, upi.name);
  }

  async function removeExpense(x) {
    if (!window.confirm(`Delete "${x.title}" (${rupee(x.amount)})? This cannot be undone.`)) return;
    const { error } = await supabase.from("friend_group_expenses").delete().eq("id", x.id);
    if (error) setError(error.message);
    reload();
  }

  async function addMember(n) {
    const { error } = await supabase
      .from("friend_group_members")
      .insert({ group_id: group.id, name: n });
    if (error) setError(error.message);
    reload();
  }

  async function removeMember(n) {
    const used = items.some((x) => x.paid_by === n || n in x.shares);
    if (used) {
      setError(`${n} has expenses in this group, so they can't be removed.`);
      return;
    }
    await supabase
      .from("friend_group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("name", n);
    reload();
  }

  async function removeGroup() {
    if (!window.confirm(`Delete the group "${group.name}" and all its expenses?`)) return;
    const { error } = await supabase.from("friend_groups").delete().eq("id", group.id);
    if (error) {
      setError(error.message);
      return;
    }
    await reload();
    onBack();
  }

  const addable = [...new Set(friends.map((f) => f.name))].filter((n) => !names.includes(n));

  return (
    <>
      <button className="back" onClick={onBack}>← All groups</button>
      <h1>
        {group.name}
        {!isOwner && <span className="badge">Shared by {ownerName}</span>}
      </h1>
      <p className="sub">
        {all.map(dn).join(", ")}
        {!isOwner ? " · View only" : ""}
      </p>

      <div className="stats">
        <div className="stat">
          <div className="label">Your balance</div>
          <div className={"value " + (myNet > 0 ? "pos" : myNet < 0 ? "neg" : "")}
            style={{ fontSize: 24 }}>
            {myNet > 0
              ? `You are owed ${rupee(myNet)}`
              : myNet < 0
              ? `You owe ${rupee(-myNet)}`
              : "Settled up"}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Settle up</h3>
        {plan.length === 0 && (
          <p className="sub" style={{ margin: "8px 0 0" }}>Everyone is settled up.</p>
        )}
        {plan.map((s, i) => (
          <div className="entry" key={i}>
            <div>
              <div className="entry-name">{dn(s.from)} pays {dn(s.to)}</div>
              <div className="entry-meta">{rupee(s.amount)}</div>
            </div>
            {isOwner && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {s.to === ME && (
                  <button className="small" onClick={() => remind(s)}>Remind on WhatsApp</button>
                )}
                <button className="ghost" onClick={() => settle(s)}>Mark as paid</button>
              </div>
            )}
          </div>
        ))}
        {isOwner && plan.some((s) => s.to === ME) && (
          <div style={{ marginTop: 14 }}>
            <button className="ghost" onClick={sendQR}>Get QR image</button>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Balances</h3>
        {everyone.map((n) => (
          <div className="entry" key={n}>
            <div className="entry-name">{dn(n)}</div>
            <div className={"entry-amount " + (bal[n] > 0 ? "pos" : bal[n] < 0 ? "neg" : "")}>
              {bal[n] > 0
                ? `gets back ${rupee(bal[n])}`
                : bal[n] < 0
                ? `owes ${rupee(-bal[n])}`
                : "settled"}
            </div>
          </div>
        ))}
      </div>

      {isOwner && (
        <form className="card" onSubmit={addExpense}>
          <h3>Add an expense</h3>
          <label>What was it for?</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Dinner, cab, hotel..." />

          <div className="row2">
            <div>
              <label>Amount (₹)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="2000" />
            </div>
            <div>
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <label>Who paid?</label>
          <div className="seg">
            {all.map((n) => (
              <button key={n} type="button" className={paidBy === n ? "on" : ""}
                onClick={() => setPaidBy(n)}>
                {n === ME ? "I paid" : `${n} paid`}
              </button>
            ))}
          </div>

          <label>Split between</label>
          <div className="seg">
            {all.map((n) => (
              <button key={n} type="button" className={!excluded.includes(n) ? "on" : ""}
                onClick={() => toggleSplit(n)}>
                {dn(n)}
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

          {how === "equal" && Number(amount) > 0 && splitWith.length > 0 && (
            <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>
              About {rupee(round2(Number(amount) / splitWith.length))} each ({splitWith.length} people)
            </p>
          )}

          {how === "custom" &&
            splitWith.map((n) => (
              <div className="row2" key={n} style={{ alignItems: "center", marginTop: 10 }}>
                <div style={{ fontSize: 18 }}>{dn(n)}</div>
                <input type="number" placeholder="0" value={custom[n] || ""}
                  onChange={(e) => setCustom({ ...custom, [n]: e.target.value })} />
              </div>
            ))}

          <button className="primary" type="submit">Add expense</button>
        </form>
      )}

      <h2>History</h2>
      {items.length === 0 && <p className="sub">No expenses yet.</p>}
      {items.map((x) => (
        <div className="entry" key={x.id}>
          <div>
            <div className="entry-name">
              {x.kind === "settlement" ? "Settlement" : x.title}
            </div>
            <div className="entry-meta">
              {fmt(x.expense_date)} ·{" "}
              {x.kind === "settlement"
                ? `${dn(x.paid_by)} paid ${dn(Object.keys(x.shares)[0])}`
                : `${dn(x.paid_by)} paid · split ${Object.keys(x.shares).length} way${
                    Object.keys(x.shares).length === 1 ? "" : "s"
                  }`}
            </div>
          </div>
          <div className="entry-right">
            <div className="entry-amount">{rupee(x.amount)}</div>
            {isOwner && (
              <button className="del" onClick={() => removeExpense(x)}>Delete</button>
            )}
          </div>
        </div>
      ))}

      {isOwner && (
        <>
          <div className="card">
            <h3>Members</h3>
            <div className="seg" style={{ marginTop: 12 }}>
              <button type="button" className="tab" disabled>You</button>
              {names.map((n) => (
                <button key={n} type="button" className="tab" onClick={() => removeMember(n)}
                  title="Click to remove">
                  {n} ✕
                </button>
              ))}
            </div>
            {linked.length > 0 && (
              <p className="sub" style={{ marginTop: 14, marginBottom: 0 }}>
                ✅ Can see this group in their app: {linked.join(", ")}
              </p>
            )}
            {notLinked.length > 0 && (
              <p className="sub" style={{ marginTop: 8, marginBottom: 0 }}>
                Not connected (can't see it): {notLinked.join(", ")}. Connect with them in Friends
                using their SplitPay ID or QR.
              </p>
            )}
            {addable.length > 0 && (
              <>
                <label>Add a friend to this group</label>
                <div className="seg">
                  {addable.map((n) => (
                    <button key={n} type="button" className="tab" onClick={() => addMember(n)}>
                      + {n}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button className="ghost" style={{ marginTop: 24 }} onClick={removeGroup}>
            Delete this group
          </button>
        </>
      )}
    </>
  );
}