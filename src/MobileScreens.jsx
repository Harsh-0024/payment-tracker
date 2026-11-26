/* Phone screens that match the mockup: My Groups, Group detail, Expense Details, Profile. */
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Cover } from "./DesktopHome";
import { kindFor, hue, ini, R } from "./people";
import GroupsPage from "./GroupsPage";
import { friendlyDate } from "./dates";

const IC = {
  back: <path d="M15 5l-7 7 7 7" />,
  chev: <path d="M9 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>),
  more: (<><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></>),
  // A toothed gear (Lucide "settings", ISC): the spoked circle it replaced read as a sun, right above Dark mode.
  gear: (<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>),
  bell: (<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 21h4" /></>),
  help: (<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  swap: <path d="M4 8h14l-3-3M20 16H6l3 3" />,
  chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  logout: (<><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M15 8l4 4-4 4M19 12H9" /></>),
  receipt: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};
function Ic({ n, s = 22 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{IC[n]}</svg>
  );
}
/* "You" is drawn with your own initial (as on Home and Profile), not a "Y". */
// With max, a stack of more people than fit ends in a "+N" bubble, so "4 people" never shows three faces.
function Avs({ names, s = 40, me, max = Infinity }) {
  const extra = names.length > max ? names.length - (max - 1) : 0;
  const shown = extra ? names.slice(0, max - 1) : names;
  const size = { width: s, height: s, fontSize: s * 0.4 };
  return (
    <span className="ms-avs">
      {shown.map((n, i) => (
        <i key={i} style={{ ...size, marginLeft: i ? -s * 0.28 : 0, background: n === "You" ? "#12327f" : hue(n) }}>
          {ini(n === "You" && me ? me : n)}
        </i>
      ))}
      {extra ? (
        <i className="ms-av-more" style={{ ...size, fontSize: s * 0.34, marginLeft: -s * 0.28 }} aria-label={`and ${extra} more`}>
          +{extra}
        </i>
      ) : null}
    </span>
  );
}
// Lists say "Yesterday" or "24 Nov"; one expense's own page keeps the whole date.
const dt = friendlyDate;
const fullDt = (x) => new Date(x).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const sumA = (l) => l.reduce((s, e) => s + Number(e.amount), 0);

export function MobileGroups({ friends, entries, go, manage, reload, setError, myName, me }) {
  const [view, setView] = useState({ t: "list" });
  // Trip groups (friend_groups) sit at the top of this tab; friends follow below.
  const [trips, setTrips] = useState({ groups: [], members: [], items: [] });
  const [q, setQ] = useState("");
  const [pill, setPill] = useState("All");
  const [tab, setTab] = useState("Expenses");
  const [menu, setMenu] = useState(false);

  const info = (f) => {
    const list = entries.filter((e) => e.friend === f.name);
    const open = list.filter((e) => e.status !== "Settled");
    const net = sumA(open.filter((e) => e.paid_by === "me")) - sumA(open.filter((e) => e.paid_by === "friend"));
    return { list, open, net };
  };
  const netText = (net) => (net > 0 ? `You're owed ${R(net)}` : net < 0 ? `You owe ${R(-net)}` : "All settled up");
  const netCls = (net) => (net > 0 ? "get" : net < 0 ? "owe" : "ok");

  const onList = view.t === "list";
  useEffect(() => {
    if (!onList) return;
    let live = true;
    Promise.all([
      supabase.from("friend_groups").select("*").order("created_at", { ascending: false }),
      supabase.from("friend_group_members").select("group_id, name"),
      supabase.from("friend_group_expenses").select("group_id, amount"),
    ]).then(([g, m, x]) => {
      if (!live) return;
      const err = g.error || m.error || x.error;
      if (err) { setError(err.message); return; }
      setTrips({ groups: g.data || [], members: m.data || [], items: x.data || [] });
    });
    return () => { live = false; };
  }, [onList, setError]);

  /* ---- One trip group, or the full trip-groups page (create form + lists) ---- */
  if (view.t === "trip" || view.t === "trips") {
    const back = () => setView({ t: "list" });
    return (
      <div className="ms ms-trip">
        {view.t === "trips" && (
          <div className="ms-bar">
            <button type="button" className="ms-ib" onClick={back} aria-label="Back"><Ic n="back" /></button>
            <h2>Trip groups</h2>
            <span className="ms-ib ghost" />
          </div>
        )}
        <GroupsPage
          friends={friends}
          setError={setError}
          myName={myName}
          startOpen={view.t === "trip" ? view.id : null}
          onClose={back}
          goFriends={() => setView({ t: "manage" })}
        />
      </div>
    );
  }

  /* ---- Add friends (the old forms: invite code, QR, add by ID) ---- */
  if (view.t === "manage") {
    return (
      <div className="ms">
        <div className="ms-bar">
          <button type="button" className="ms-ib" onClick={() => setView({ t: "list" })} aria-label="Back"><Ic n="back" /></button>
          <h1>Add friends</h1>
          <span className="ms-ib ghost" />
        </div>
        {manage}
      </div>
    );
  }

  /* ---- Expense details ---- */
  if (view.t === "expense") {
    const e = entries.find((x) => x.id === view.id);
    const f = friends.find((x) => x.id === view.gid);
    if (!e) { setView({ t: "list" }); return null; }
    const mine = e.paid_by === "me";
    const settled = e.status === "Settled";
    return (
      <div className="ms">
        <div className="ms-bar">
          <button type="button" className="ms-ib" onClick={() => setView(f ? { t: "group", id: f.id } : { t: "list" })} aria-label="Back"><Ic n="back" /></button>
          <h2>Expense Details</h2>
          <span className="ms-ib ghost" />
        </div>
        <div className="ms-ed">
          <span className="ms-ed-ic"><Ic n="receipt" s={34} /></span>
          <h3>{e.note || e.mode || "Payment"}</h3>
          <b>{R(e.amount)}</b>
          <small>{fullDt(e.payment_date || e.created_at)}</small>
        </div>
        <div className="ms-split">
          <span>Between you and {e.friend}</span>
          <b>{R(e.amount)}</b>
        </div>
        <div className="ms-paid">
          <Avs names={[mine ? "You" : e.friend]} s={44} me={me} />
          <div><small>Paid</small><b>{mine ? "You" : e.friend}</b></div>
          <div className="r">
            <small>{settled ? "Settled" : mine ? `${e.friend} owes` : "You owe"}</small>
            <b className={settled ? "mut" : mine ? "pos" : "neg"}>{R(e.amount)}</b>
          </div>
        </div>
        <div className="ms-facts">
          <div><span>Payment mode</span><b>{e.mode || "-"}</b></div>
          <div><span>Status</span><b>{settled ? "Settled" : "Pending"}</b></div>
          {e.due_date && <div><span>Due date</span><b>{fullDt(e.due_date + "T00:00:00")}</b></div>}
        </div>
        {!settled ? (
          <button type="button" className="ms-cta" onClick={() => go("Settlements")}>Settle Up</button>
        ) : (
          <button type="button" className="ms-cta ghost" disabled>Settled ✓</button>
        )}
      </div>
    );
  }

  /* ---- Group (friend) detail ---- */
  if (view.t === "group") {
    const f = friends.find((x) => x.id === view.id);
    if (!f) { setView({ t: "list" }); return null; }
    const { list, open, net } = info(f);
    const idx = friends.indexOf(f);
    async function remove() {
      if (!window.confirm(`Remove ${f.name}?`)) return;
      const { error } = await supabase.from("friends").delete().eq("id", f.id);
      if (error) { setError(error.message); return; }
      setMenu(false);
      setView({ t: "list" });
      reload();
    }
    return (
      <div className="ms ms-gd">
        <div className="ms-hero">
          <Cover kind={kindFor(f.name, idx)} uid={"g" + f.id} />
          <button type="button" className="ms-ib" onClick={() => { setMenu(false); setView({ t: "list" }); }} aria-label="Back"><Ic n="back" /></button>
          <button type="button" className="ms-ib r" onClick={() => setMenu(!menu)} aria-label="More"><Ic n="more" /></button>
          {menu && <div className="ms-menu"><button type="button" onClick={remove}>Remove friend</button></div>}
        </div>
        <div className="ms-sheet">
          <div className="ms-gd-av"><Avs names={[f.name, "You"]} s={52} me={me} /></div>
          <h1>{f.name}</h1>
          <p className="ms-gd-sub">{f.linked_user_id ? "Linked friend" : "Friend"} • {open.length ? "Active" : "Settled"}</p>
          <p className={"ms-gd-net " + netCls(net)}>{netText(net)}</p>

          <div className="ms-seg">
            {["Expenses", "Settlements"].map((t) => (
              <button key={t} type="button" className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {tab === "Expenses" && (
            <>
              {list.length === 0 && <p className="ms-empty">No expenses with {f.name} yet.</p>}
              {list.map((e) => (
                <button type="button" className="ms-row" key={e.id} onClick={() => setView({ t: "expense", id: e.id, gid: f.id })}>
                  <span className="ms-row-ic"><Ic n="receipt" s={22} /></span>
                  <span className="ms-row-mid"><b>{e.note || e.mode || "Payment"}</b><small>{e.paid_by === "me" ? "You paid" : `${f.name} paid`} • {dt(e.payment_date || e.created_at)}</small></span>
                  <span className="ms-row-end"><b className={e.status === "Settled" ? "mut" : e.paid_by === "me" ? "pos" : "neg"}>{R(e.amount)}</b><small>{e.status === "Settled" ? "Settled" : "Pending"}</small></span>
                </button>
              ))}
            </>
          )}

          {tab === "Settlements" && (
            open.length === 0 ? (
              <div className="ms-done">
                <span className="ms-done-ic"><Ic n="check" s={44} /></span>
                <h3>All Settled!</h3>
                <p>{list.length ? `You're all caught up with ${f.name}.` : `No expenses with ${f.name} yet.`}</p>
                <button type="button" className="ms-cta" onClick={() => setView({ t: "list" })}>Back to Groups</button>
              </div>
            ) : (
              <>
                <div className="ms-split"><span>{netText(net)}</span><button type="button" className="ms-link" onClick={() => go("Settlements")}>Settle Up →</button></div>
                {open.map((e) => (
                  <button type="button" className="ms-row" key={e.id} onClick={() => setView({ t: "expense", id: e.id, gid: f.id })}>
                    <span className="ms-row-ic"><Ic n="swap" s={22} /></span>
                    <span className="ms-row-mid"><b>{e.note || e.mode || "Payment"}</b><small>{e.paid_by === "me" ? `${f.name} owes you` : `You owe ${f.name}`}</small></span>
                    <span className="ms-row-end"><b className={e.paid_by === "me" ? "pos" : "neg"}>{R(e.amount)}</b></span>
                  </button>
                ))}
              </>
            )
          )}

          <button type="button" className="ms-cta ms-sticky" onClick={() => go("Expenses")}>Add Expense</button>
        </div>
      </div>
    );
  }

  /* ---- My Groups list ---- */
  const needle = q.trim().toLowerCase();
  const tripRows = trips.groups
    .map((g) => {
      const names = trips.members.filter((m) => m.group_id === g.id).map((m) => m.name);
      const items = trips.items.filter((x) => x.group_id === g.id);
      return { g, names, count: items.length, total: sumA(items) };
    })
    .filter((r) => r.g.name.toLowerCase().includes(needle) || r.names.some((n) => n.toLowerCase().includes(needle)))
    .filter((r) => (pill === "All" ? true : pill === "Active" ? r.count > 0 : r.count === 0));
  const shown = friends
    .filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((f) => {
      const { open } = info(f);
      return pill === "All" ? true : pill === "Active" ? open.length > 0 : open.length === 0;
    });

  return (
    <div className="ms">
      <div className="ms-bar big">
        <h1>My Groups</h1>
        <button type="button" className="ms-plus" onClick={() => setView({ t: "manage" })} aria-label="Add friends"><Ic n="plus" s={22} /></button>
      </div>
      <label className="ms-search">
        <Ic n="search" s={20} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups..." />
      </label>
      <div className="ms-pills">
        {["All", "Active", "Archived"].map((p) => (
          <button key={p} type="button" className={pill === p ? "on" : ""} onClick={() => setPill(p)}>{p}</button>
        ))}
      </div>

      <div className="ms-sec">
        <h2>Trip groups</h2>
        <button type="button" className="ms-link" onClick={() => setView({ t: "trips" })}>+ New group</button>
      </div>
      {trips.groups.length === 0 && (
        <p className="ms-sec-note">Split a trip or a flat with several people at once.</p>
      )}
      {trips.groups.length > 0 && tripRows.length === 0 && <p className="ms-sec-note">No trip groups match.</p>}
      {tripRows.map(({ g, names, count, total }) => (
        <button type="button" className="ms-g" key={g.id} onClick={() => setView({ t: "trip", id: g.id })}>
          <Avs names={["You", ...names]} max={3} s={34} me={me} />
          <span className="ms-g-mid">
            <b>{g.name}</b>
            <small>{names.length + 1} people • {count} item{count === 1 ? "" : "s"}{count ? ` • ${R(total)}` : ""}</small>
          </span>
          <Ic n="chev" s={20} />
        </button>
      ))}

      <div className="ms-sec">
        <h2>Friends</h2>
      </div>
      {friends.length === 0 && (
        <div className="ms-empty-card">
          <p>No friends yet. Tap + to add someone with an invite code, QR or by name.</p>
          <button type="button" className="ms-cta" onClick={() => setView({ t: "manage" })}>Add friends</button>
        </div>
      )}
      {friends.length > 0 && shown.length === 0 && (
        <p className="ms-empty">
          {q.trim() ? `No group called “${q.trim()}”${pill === "All" ? "" : ` in ${pill}`}.`
            : pill === "Active" ? "Nothing open: every group is settled up."
              : "No archived groups. A group moves here once everything in it is settled."}
        </p>
      )}

      {shown.map((f) => {
        const { list, net } = info(f);
        return (
          <button type="button" className="ms-g" key={f.id} onClick={() => { setTab("Expenses"); setView({ t: "group", id: f.id }); }}>
            <Avs names={[f.name, "You"]} s={40} me={me} />
            <span className="ms-g-mid">
              <b>{f.name}</b>
              <small>{list.length} expense{list.length === 1 ? "" : "s"} • <em className={netCls(net)}>{net > 0 ? `owes you ${R(net)}` : net < 0 ? `you owe ${R(-net)}` : "Settled"}</em></small>
            </span>
            <Ic n="chev" s={20} />
          </button>
        );
      })}
    </div>
  );
}

export function MobileProfile({ session, name, entries, requests, owes, go, settingsPage, dark, onTheme }) {
  const [view, setView] = useState("main");
  const email = session.user.email || session.user.phone || "";
  const open = entries.filter((e) => e.status !== "Settled");
  const youOwe = sumA(open.filter((e) => e.paid_by === "friend"));
  const youGet = sumA(open.filter((e) => e.paid_by === "me"));

  if (view !== "main") {
    const titles = { settings: "Settings", notif: "Notifications", help: "Help & Support", about: "About SplitPay" };
    return (
      <div className="ms">
        <div className="ms-bar">
          <button type="button" className="ms-ib" onClick={() => setView("main")} aria-label="Back"><Ic n="back" /></button>
          <h2>{titles[view]}</h2>
          <span className="ms-ib ghost" />
        </div>
        {view === "settings" && settingsPage}
        {view === "notif" && (
          <div className="ms-card">
            {requests === 0 && owes.length === 0 && <p className="ms-empty">You are all caught up.</p>}
            {requests > 0 && (
              <button type="button" className="ms-row" onClick={() => go("Groups")}>
                <span className="ms-row-ic"><Ic n="bell" /></span>
                <span className="ms-row-mid"><b>{requests} friend request{requests > 1 ? "s" : ""}</b><small>Tap to review</small></span>
                <Ic n="chev" s={18} />
              </button>
            )}
            {owes.map((e) => (
              <button type="button" className="ms-row" key={e.id} onClick={() => go("Settlements")}>
                <span className="ms-row-ic"><Ic n="swap" /></span>
                <span className="ms-row-mid"><b>You owe {e.friend} {R(e.amount)}</b><small>{e.note || "Pending payment"}</small></span>
                <Ic n="chev" s={18} />
              </button>
            ))}
          </div>
        )}
        {view === "help" && (
          <div className="ms-card ms-text">
            <p><b>Add a friend:</b> open the Groups tab, tap +, then use an invite code, scan a QR, or add by name.</p>
            <p><b>Add an expense:</b> tap the blue + button in the bottom bar.</p>
            <p><b>Settle up:</b> open Settlements from this page, or tap Settle Up on the home screen.</p>
          </div>
        )}
        {view === "about" && (
          <div className="ms-card ms-text">
            <p><b>SplitPay</b></p>
            <p>Split. Track. Settle. Your group expenses, made effortless.</p>
          </div>
        )}
      </div>
    );
  }

  const rows = [
    ["swap", "Settlements", () => go("Settlements")],
    ["chart", "Analytics", () => go("Analytics")],
    ["gear", "Settings", () => setView("settings")],
    ["bell", "Notifications", () => setView("notif"), requests + owes.length || null],
    // A switch, not a link: it changes the theme here and opens nothing.
    ["moon", "Dark mode", onTheme, null, { on: !!dark }],
    ["help", "Help & Support", () => setView("help")],
    ["info", "About SplitPay", () => setView("about")],
  ];

  return (
    <div className="ms">
      <div className="ms-prof">
        <button type="button" className="ms-ib r" onClick={() => setView("settings")} aria-label="Settings"><Ic n="gear" /></button>
        <span className="ms-prof-av">{ini(name)}</span>
        <h1>{name}</h1>
        <small>{email}</small>
      </div>
      <button type="button" className="ms-owed" onClick={() => go("Settlements")}>
        {/* The same summary as Home's card: it led with "You owe ₹120" while ₹1,900 was owed to you. */}
        <span>Total Balance</span>
        <b>{youGet - youOwe < 0 ? "-" : ""}{R(Math.abs(youGet - youOwe))}</b>
        <em>You get {R(youGet)} · You owe {R(youOwe)}</em>
        <i><Ic n="arrow" s={18} /></i>
      </button>
      <div className="ms-list">
        {rows.map(([ic, label, fn, badge, sw]) => (
          <button type="button" key={label} onClick={fn} {...(sw ? { role: "switch", "aria-checked": sw.on } : {})}>
            <Ic n={ic} s={22} />
            <span>{label}</span>
            {badge ? <u>{badge}</u> : null}
            {sw ? <i className={`ms-sw${sw.on ? " on" : ""}`} aria-hidden="true" /> : <Ic n="chev" s={18} />}
          </button>
        ))}
      </div>
      <button type="button" className="ms-logout" onClick={() => supabase.auth.signOut()}>Log Out</button>
    </div>
  );
}
