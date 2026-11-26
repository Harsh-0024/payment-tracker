import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "./supabaseClient";
import { friendlyDate, friendlyDateLower } from "./dates";
import { setTheme, useTheme } from "./ThemeToggle";
import AuthChoice, { Splash } from "./AuthChoice";
import PaymentsHub from "./PaymentsHub";
import SplitHub from "./SplitHub";
import InviteClaim from "./InviteClaim";
import "./room.css";
import "./shell.css";
import "./mobile.css";
import "./mobile-ui.css";
import MobileHome from "./MobileHome";
import DesktopHome from "./DesktopHome";
import { MobileGroups, MobileProfile } from "./MobileScreens";
import "./mobile-screens.css";
import "./no-splash.css";
import "./dk.css";

// Heavy screens load on first use, so the first page doesn't wait for the QR
// scanner, camera decoder and chart libraries.
const PayPage = lazy(() => import("./PayPage"));
const FriendScan = lazy(() => import("./FriendScan"));
const ProfilePage = lazy(() => import("./ProfilePage"));
const SpendingChart = lazy(() => import("./SpendingChart"));

const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");
const sumAmt = (list) => list.reduce((s, e) => s + Number(e.amount), 0);
const nameOfUser = (session) => {
  const m = session.user.user_metadata || {};
  return m.name || m.full_name || (session.user.email || "").split("@")[0] || "there";
};

/* ---------- Sidebar items: key, label, icon ---------- */
const SIDE = [
  ["Dashboard", "Dashboard", "home"],
  ["Groups", "Groups", "users"],
  ["Expenses", "Expenses", "receipt"],
  ["Payments", "Activity", "clock"],
  ["Analytics", "Analytics", "chart"],
  ["Profile", "Settings", "gear"],
];
const TITLES = {
  Dashboard: ["Dashboard", "Split smarter. Spend better."],
  Groups: ["Groups", "Friends and people you split with."],
  Expenses: ["Expenses", "Add and split expenses."],
  Settlements: ["Settlements", "Clear your dues in one tap."],
  Payments: ["Activity", "Record payments and see your history."],
  Analytics: ["Analytics", "See where your money goes."],
  Profile: ["Settings", "Your account and settings."],
};

const ICONS = {
  home: <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  users: (<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.8 0 4.5 1.8 4.5 4.5" /></>),
  receipt: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>),
  swap: <path d="M4 8h14l-3-3M20 16H6l3 3" />,
  card: (<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18" /></>),
  chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
  bell: (<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 21h4" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>),
  phone: (<><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  user: (<><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.8 3-6 7-6s7 2.2 7 6" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M4.2 7l2.6 1.5M17.2 15.5l2.6 1.5M4.2 17l2.6-1.5M17.2 8.5l2.6-1.5" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
};
function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const firstName = (n) => {
  const w = String(n || "").trim().split(/\s+/)[0] || "there";
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
};

function useIsPhone() {
  const q = "(max-width: 900px)";
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return m;
}

function useOutside(ref, fn) {
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) fn();
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("touchstart", h);
    };
  }, []);
}

/* ---------- App (login check) ---------- */
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return <Splash />;
  return session ? <Shell session={session} /> : <AuthChoice emailForm={<Auth />} />;
}

/* ---------- Email login / signup ---------- */
function Auth() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) setMessage(error.message);
      else if (!data.session) setMessage("Check your email to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }
    setBusy(false);
  }

  return (
    <div className="sa-form">
      <div className="sa-tabs sa-mode">
        <button type="button" className={mode === "login" ? "on" : ""}
          onClick={() => { setMode("login"); setMessage(""); }}>Login</button>
        <button type="button" className={mode === "signup" ? "on" : ""}
          onClick={() => { setMode("signup"); setMessage(""); }}>Register</button>
      </div>
      <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="sub">
        {mode === "signup"
          ? "Sign up with email and start splitting."
          : "Log in to see your balances."}
      </p>
      <form onSubmit={submit}>
        {mode === "signup" && (
          <>
            <label>Name</label>
            <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ravi Sharma" required />
          </>
        )}
        <label>Email</label>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com" required />
        <label>Password</label>
        <input type="password" minLength={6} value={password}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
        {message && <p className="error">{message}</p>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Please wait..." : mode === "signup" ? "Get started" : "Log in"}
        </button>
      </form>
      <p className="switch">
        {mode === "signup" ? "Already have an account? " : "New here? "}
        <button className="link" type="button"
          onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setMessage(""); }}>
          {mode === "signup" ? "Log in" : "Create account"}
        </button>
      </p>
    </div>
  );
}

/* ---------- Top bar pieces ---------- */
function TopSearch({ entries, friends, go }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);
  useOutside(ref, () => setOpen(false));

  useEffect(() => {
    const k = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (inputRef.current) inputRef.current.focus();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const t = q.trim().toLowerCase();
  const fr = t ? friends.filter((f) => f.name.toLowerCase().includes(t)).slice(0, 3) : [];
  const en = t
    ? entries
        .filter((e) => [e.friend, e.note, e.amount].join(" ").toLowerCase().includes(t))
        .slice(0, 4)
    : [];
  function pick(page) {
    setOpen(false);
    setQ("");
    go(page);
  }

  return (
    <div className="sp-search" ref={ref}>
      <Icon name="search" size={18} />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search friends, expenses or payments..."
      />
      <kbd>⌘ K</kbd>
      {open && t && (
        <div className="sp-pop">
          {fr.length === 0 && en.length === 0 && <div className="none">Nothing found.</div>}
          {fr.length > 0 && <div className="hd">Friends</div>}
          {fr.map((f) => (
            <button key={"f" + f.id} type="button" onClick={() => pick("Groups")}>{f.name}</button>
          ))}
          {en.length > 0 && <div className="hd">Payments</div>}
          {en.map((e) => (
            <button key={"e" + e.id} type="button" onClick={() => pick("Payments")}>
              {e.friend} · {rupee(e.amount)}
              <small>{e.note || e.mode || ""}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Bell({ requests, owes, go }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const has = requests > 0 || owes.length > 0;
  function pick(page) {
    setOpen(false);
    go(page);
  }
  return (
    <div className="sp-ib" ref={ref}>
      <button type="button" className="sp-bell" aria-label="Notifications" onClick={() => setOpen(!open)}>
        <Icon name="bell" />
        {has && <span className="sp-dot" />}
      </button>
      {open && (
        <div className="sp-pop">
          {!has && <div className="none">You are all caught up.</div>}
          {requests > 0 && (
            <button type="button" onClick={() => pick("Groups")}>
              {requests} friend request{requests > 1 ? "s" : ""}
              <small>Tap to review</small>
            </button>
          )}
          {owes.map((e) => (
            <button key={e.id} type="button" onClick={() => pick("Settlements")}>
              You owe {e.friend} {rupee(e.amount)}
              <small>{e.note || "Pending payment"}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeSwitch() {
  const { dark } = useTheme();
  return (
    <div className="dk-theme">
      <button type="button" className={!dark ? "on" : ""} aria-label="Light mode" onClick={() => setTheme("light")}><Icon name="sun" size={18} /></button>
      <button type="button" className={dark ? "on" : ""} aria-label="Dark mode" onClick={() => setTheme("dark")}><Icon name="moon" size={18} /></button>
    </div>
  );
}

function ProfileMenu({ name, go }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { dark } = useTheme();
  useOutside(ref, () => setOpen(false));
  function pick(page) {
    setOpen(false);
    go(page);
  }
  return (
    <div className="sp-ib" ref={ref}>
      <button type="button" className="sp-user" onClick={() => setOpen(!open)}>
        <span className="sp-avatar">{name.trim().charAt(0).toUpperCase()}</span>
        <span className="nm">{name}</span>
        <span className="cv">▾</span>
      </button>
      {open && (
        <div className="sp-pop">
          <button type="button" onClick={() => pick("Profile")}>Profile</button>
          <button type="button" className="only-m" onClick={() => pick("Settlements")}>Settlements</button>
          <button type="button" className="only-m" onClick={() => pick("Analytics")}>Analytics</button>
          <button type="button" onClick={() => setTheme(dark ? "light" : "dark")}>
            {dark ? "☀️ Light mode" : "🌙 Dark mode"}
          </button>
          <button type="button" onClick={() => supabase.auth.signOut()}>Log out</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Shell: data + layout ---------- */
function Shell({ session }) {
  const myId = session.user.id;
  const myName = nameOfUser(session);
  const [page, setPage] = useState("Dashboard");
  const [entries, setEntries] = useState([]);
  const [friends, setFriends] = useState([]);
  const [connections, setConnections] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState("");
  const phone = useIsPhone();
  const { dark } = useTheme();

  async function load() {
    const [e, f, c, p] = await Promise.all([
      supabase
        .from("entries")
        .select("*")
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("friends").select("*").order("name"),
      supabase.from("connections").select("*"),
      supabase.from("profiles").select("id, name, friend_code"),
    ]);
    const err = e.error || f.error || c.error || p.error;
    if (err) {
      setError(err.message);
      return;
    }

    const names = {};
    p.data.forEach((x) => (names[x.id] = x.name));
    const local = {};
    f.data.forEach((x) => {
      if (x.linked_user_id) local[x.linked_user_id] = x.name;
    });

    setFriends(f.data);
    setConnections(c.data);
    setProfiles(p.data);
    setEntries(
      e.data.map((en) =>
        en.user_id === myId
          ? en
          : {
              ...en,
              friend: local[en.user_id] || names[en.user_id] || "Friend",
              paid_by: en.paid_by === "me" ? "friend" : "me",
              shared: true,
            }
      )
    );
  }

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [session.access_token]);

  // A new page starts at its top; without this the phone kept the last page's scroll position,
  // so "+" or Profile could open halfway down.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const requests = connections.filter((c) => c.status === "pending" && c.addressee === myId).length;
  const owes = entries.filter((e) => e.status !== "Settled" && e.paid_by === "friend").slice(0, 3);
  const meta = [null, ...(TITLES[page] || TITLES.Dashboard)];
  const home = page === "Dashboard";

  const pageBlocks = (
    <>
          {page === "Groups" && (
            <Friends
              friends={friends}
              connections={connections}
              profiles={profiles}
              entries={entries}
              myId={myId}
              reload={load}
              setError={setError}
            />
          )}

          {page === "Expenses" && (
            <SplitHub
              entries={entries}
              friends={friends}
              reload={load}
              setError={setError}
              goFriends={() => setPage("Groups")}
              myName={myName}
            />
          )}

          {page === "Settlements" && (
            <Suspense fallback={null}><PayPage entries={entries} friends={friends} reload={load} setError={setError} /></Suspense>
          )}

          {page === "Payments" && (
            <PaymentsHub
              entries={entries}
              friends={friends}
              reload={load}
              setError={setError}
              goFriends={() => setPage("Groups")}
              myName={myName}
            />
          )}

          {page === "Analytics" && (
            <>
              <Suspense fallback={null}><SpendingChart entries={entries} /></Suspense>
              <PaidSummary entries={entries} />
            </>
          )}

          {page === "Profile" && <Suspense fallback={null}><ProfilePage session={session} profiles={profiles} /></Suspense>}
    </>
  );

  if (phone) {
    const tabs = [
      ["Dashboard", "home", "Home"],
      ["Groups", "users", "Groups"],
      ["Expenses", "plus", ""],
      ["Payments", "clock", "Activity"],
      ["Profile", "user", "Profile"],
    ];
    return (
      <div className="mb-app">
        {page !== "Groups" && page !== "Profile" && (
        <header className="mb-top">
          <div className="mb-ttl">
            {home ? (
              <>
                <h1>Hi, {firstName(myName)} 👋</h1>
                <p>Let's split something?</p>
              </>
            ) : (
              <h1>{meta[1]}</h1>
            )}
          </div>
          <Bell requests={requests} owes={owes} go={setPage} />
          <ProfileMenu name={myName} go={setPage} />
        </header>
        )}

        <main className="sp-content mb-content">
          {error && <p className="error">{error}</p>}
          {home ? (
            <MobileHome entries={entries} go={setPage} />
          ) : page === "Groups" ? (
            <MobileGroups
              me={myName}
              friends={friends}
              myName={myName}
              entries={entries}
              go={setPage}
              reload={load}
              setError={setError}
              manage={
                <Friends
                  friends={friends}
                  connections={connections}
                  profiles={profiles}
                  entries={entries}
                  myId={myId}
                  reload={load}
                  setError={setError}
                />
              }
            />
          ) : page === "Profile" ? (
            <MobileProfile
              session={session}
              name={myName}
              entries={entries}
              requests={requests}
              owes={owes}
              go={setPage}
              dark={dark}
              onTheme={() => setTheme(dark ? "light" : "dark")}
              settingsPage={<Suspense fallback={null}><ProfilePage session={session} profiles={profiles} /></Suspense>}
            />
          ) : (
            pageBlocks
          )}
        </main>

        <nav className="mb-nav">
          {tabs.map(([key, icon, label]) =>
            key === "Expenses" ? (
              <button key={key} type="button" className="mb-plus" aria-label="Add expense" onClick={() => setPage("Expenses")}>
                <span className="c"><Icon name="plus" size={26} /></span>
              </button>
            ) : (
              <button key={key} type="button" className={page === key ? "on" : ""} onClick={() => setPage(key)}>
                <Icon name={icon} size={22} />
                <span>{label}</span>
              </button>
            )
          )}
        </nav>
      </div>
    );
  }

  return (
    <div className="dk-app">
      <aside className="dk-side">
        <div className="dk-logo">
          <i>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <rect x="3.5" y="9" width="11" height="11" rx="3" /><rect x="9.5" y="3.5" width="11" height="11" rx="3" />
            </svg>
          </i>
          <span>SplitPay</span>
        </div>

        <nav className="dk-nav">
          {SIDE.map(([key, label, icon]) => (
            <button key={key} type="button" className={page === key ? "on" : ""} onClick={() => setPage(key)}>
              <Icon name={icon} size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="dk-spacer" />

        <div className="dk-appcard">
          <b>Get the App</b>
          <small>Scan QR to open SplitPay on your phone</small>
          <span className="sp-qrbox"><QRCodeSVG value={window.location.origin} size={92} /></span>
        </div>
        <ThemeSwitch />
      </aside>

      <div className="dk-main">
        <header className="dk-top">
          <TopSearch entries={entries} friends={friends} go={setPage} />
          <div className="dk-grow" />
          <Bell requests={requests} owes={owes} go={setPage} />
          <ProfileMenu name={myName} go={setPage} />
        </header>

        <main className="sp-content dk-content">
          {error && <p className="error">{error}</p>}
          {home ? (
            <DesktopHome entries={entries} friends={friends} name={firstName(myName)} go={setPage} />
          ) : (
            <>
              <div className="dk-pagehead">
                <h1>{meta[1]}</h1>
                <p>{meta[2]}</p>
              </div>
              {pageBlocks}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- Friends / Groups page ---------- */
function Friends({ friends, connections, profiles, entries, myId, reload, setError }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);

  const nameOf = (id) => (profiles.find((p) => p.id === id) || {}).name || "Someone";
  const incoming = connections.filter((c) => c.status === "pending" && c.addressee === myId);
  const outgoing = connections.filter((c) => c.status === "pending" && c.requester === myId);

  async function sendRequest(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("send_friend_request", {
      p_code: code.trim(),
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setError("");
    setNotice(data);
    setCode("");
    reload();
  }

  async function respond(id, accept) {
    const { data, error } = await supabase.rpc("respond_friend_request", {
      p_id: id,
      p_accept: accept,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setError("");
    setNotice(data);
    reload();
  }

  async function addManual(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const { error } = await supabase
      .from("friends")
      .insert({ name: n, phone: phone.trim() || null });
    if (error) {
      setError(error.message);
      return;
    }
    setError("");
    setName("");
    setPhone("");
    reload();
  }

  async function remove(f) {
    // Ask first, as the phone screen does: one stray tap shouldn't drop a friend.
    if (!window.confirm(`Remove ${f.name}?`)) return;
    const { error } = await supabase.from("friends").delete().eq("id", f.id);
    if (error) {
      setError("Couldn't remove this friend: " + error.message);
      return;
    }
    setError("");
    reload();
  }

  const selected = friends.find((f) => f.id === selectedId);

  if (selected) {
    const list = entries.filter((e) => e.friend === selected.name);
    const iPaid = list.filter((e) => e.paid_by === "me");
    const theyPaid = list.filter((e) => e.paid_by === "friend");
    const pendingMine = sumAmt(iPaid.filter((e) => e.status !== "Settled"));
    const pendingTheirs = sumAmt(theyPaid.filter((e) => e.status !== "Settled"));
    const net = pendingMine - pendingTheirs;

    return (
      <>
        <button className="back" onClick={() => setSelectedId(null)}>← All friends</button>
        <h1>
          {selected.name}
          {selected.linked_user_id && <span className="badge">Linked</span>}
        </h1>
        <p className="sub">{selected.phone || "No WhatsApp number saved"}</p>

        <div className="stats">
          <div className="stat">
            <div className="label">You paid for them</div>
            <div className="value pos">{rupee(sumAmt(iPaid))}</div>
          </div>
          <div className="stat">
            <div className="label">They paid for you</div>
            <div className="value neg">{rupee(sumAmt(theyPaid))}</div>
          </div>
          <div className="stat">
            <div className="label">Right now</div>
            <div className={"value " + (net > 0 ? "pos" : net < 0 ? "neg" : "")}
              style={{ fontSize: 22 }}>
              {net > 0
                ? `${selected.name} owes you ${rupee(net)}`
                : net < 0
                ? `You owe ${selected.name} ${rupee(-net)}`
                : "All settled up"}
            </div>
          </div>
        </div>

        <h2>History</h2>
        {list.length === 0 && <p className="sub" style={{ display: "block" }}>No payments with {selected.name} yet.</p>}
        {list.map((en) => (
          <div className={"entry" + (en.status === "Settled" ? " settled" : "")} key={en.id}>
            <div>
              <div className="entry-name">
                {friendlyDate(en.payment_date)} · {en.mode}
              </div>
              <div className="entry-meta">
                {en.note || "No description"}
                {en.due_date
                  ? ` · Due ${friendlyDateLower(en.due_date)}`
                  : ""}
                {en.shared ? ` · Added by ${en.friend}` : ""}
              </div>
            </div>
            <div className="entry-right">
              <div className={"entry-amount " + (en.paid_by === "me" ? "pos" : "neg")}>
                {en.paid_by === "me" ? "You paid " : `${selected.name} paid `}
                {rupee(en.amount)}
              </div>
              <div className="entry-meta">{en.status === "Settled" ? "Settled" : "Pending"}</div>
            </div>
          </div>
        ))}
      </>
    );
  }

  const shownFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <h1>Friends</h1>
      <p className="sub">Connect with friends using their SplitPay ID, or add people by name.</p>

      {notice && (
        <div className="card notify">
          <strong>{notice}</strong>
          <div className="actions">
            <button className="ghost" onClick={() => setNotice("")}>OK</button>
          </div>
        </div>
      )}

      <InviteClaim reload={reload} setError={setError} />
      <Suspense fallback={null}><FriendScan profiles={profiles} myId={myId} reload={reload} setError={setError} /></Suspense>
      <form className="card" onSubmit={sendRequest}>
        <h3>Add a friend by SplitPay ID</h3>
        <label>Their ID</label>
        <input value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="Example: A3F9C21B" />
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Please wait..." : "Send request"}
        </button>
      </form>

      {incoming.length > 0 && (
        <div className="card">
          <h3>Requests for you</h3>
          {incoming.map((c) => (
            <div className="entry" key={c.id}>
              <div className="entry-name">{nameOf(c.requester)}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="small" onClick={() => respond(c.id, true)}>Accept</button>
                <button className="ghost" onClick={() => respond(c.id, false)}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="card">
          <h3>Waiting for them to accept</h3>
          {outgoing.map((c) => (
            <div className="entry" key={c.id}>
              <div className="entry-name">{nameOf(c.addressee)}</div>
              <span className="badge warn">Pending</span>
            </div>
          ))}
        </div>
      )}

      <h2>Your friends</h2>
      <input placeholder="Search by name" value={query}
        onChange={(e) => setQuery(e.target.value)} />
      {shownFriends.length === 0 && <p className="sub" style={{ display: "block" }}>No friends found.</p>}
      {shownFriends.map((f) => (
        <div className="entry row-click" key={f.id} onClick={() => setSelectedId(f.id)}>
          <div>
            <div className="entry-name">
              {f.name}
              {f.linked_user_id && <span className="badge">Linked</span>}
            </div>
            <div className="entry-meta">{f.phone || "No WhatsApp number"}</div>
          </div>
          <button className="del"
            onClick={(e) => { e.stopPropagation(); remove(f); }}>
            Delete
          </button>
        </div>
      ))}

      <form className="card" onSubmit={addManual}>
        <h3>Add a friend without an account</h3>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Friend's name" required />
        <label>WhatsApp number (for reminders)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)}
          placeholder="9876543210" inputMode="tel" />
        <button className="primary" type="submit">Add Friend</button>
      </form>
    </>
  );
}

/* ---------- Analytics ---------- */

function PaidSummary({ entries }) {
  const iPaid = {};
  const theyPaid = {};

  entries.forEach((e) => {
    const target = e.paid_by === "me" ? iPaid : theyPaid;
    if (!target[e.friend]) target[e.friend] = { total: 0, count: 0 };
    target[e.friend].total += Number(e.amount);
    target[e.friend].count += 1;
  });

  const mine = Object.entries(iPaid).sort((a, b) => b[1].total - a[1].total);
  const theirs = Object.entries(theyPaid).sort((a, b) => b[1].total - a[1].total);
  const sum = (list) => list.reduce((s, [, v]) => s + v.total, 0);

  function List({ list, cls }) {
    if (list.length === 0) return <p className="sub" style={{ display: "block" }}>No payments yet.</p>;
    return list.map(([name, v]) => (
      <div className="entry" key={name}>
        <div>
          <div className="entry-name">{name}</div>
          <div className="entry-meta">
            {v.count} payment{v.count > 1 ? "s" : ""}
          </div>
        </div>
        <div className={"entry-amount " + cls}>{rupee(v.total)}</div>
      </div>
    ));
  }

  return (
    <div className="two-col">
      <div className="card">
        <h3>You paid for</h3>
        <p className="sub" style={{ marginBottom: 8, display: "block" }}>
          {mine.length} friend{mine.length === 1 ? "" : "s"} · total {rupee(sum(mine))}
        </p>
        <List list={mine} cls="pos" />
      </div>
      <div className="card">
        <h3>Paid for you</h3>
        <p className="sub" style={{ marginBottom: 8, display: "block" }}>
          {theirs.length} friend{theirs.length === 1 ? "" : "s"} · total {rupee(sum(theirs))}
        </p>
        <List list={theirs} cls="neg" />
      </div>
    </div>
  );
}
