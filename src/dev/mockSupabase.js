// A stand-in for the Supabase client, for trying the app with no Supabase project and no .env.
// It is used only by `npm run dev:mock` (vite.config.js swaps it in for src/supabaseClient.js);
// a normal `npm run dev` or `npm run build` never includes it.
//
// Everything lives in this browser's localStorage under "pt-mock": one demo account ("Demo",
// demo@example.test), a few friends, entries, a group and a payment. Any email and password
// signs in as the demo user. Clear the data with: localStorage.removeItem("pt-mock").

const KEY = "pt-mock";
const DEMO = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@example.test",
  user_metadata: { name: "Demo" },
};
const FRIEND_ID = "00000000-0000-4000-8000-000000000002";

const uuid = () =>
  (globalThis.crypto?.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => ((Math.random() * 16) | 0).toString(16)));
const now = () => new Date().toISOString();
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

function seed() {
  const me = DEMO.id;
  const entry = (friend, amount, paid_by, status, offset, note, due) => ({
    id: uuid(), user_id: me, friend, amount, paid_by, status, payment_date: day(offset),
    due_date: due ?? null, note, created_at: new Date(Date.now() + offset * 864e5).toISOString(),
  });
  const groupId = uuid();
  return {
    session: { access_token: "mock", token_type: "bearer", user: DEMO },
    tables: {
      profiles: [
        { id: me, name: "Demo", friend_code: "DEMO42" },
        { id: FRIEND_ID, name: "Aarav", friend_code: "AARAV7" },
      ],
      profile_details: [
        { user_id: me, upi_id: "demo@okbank", upi_name: "Demo", qr_mode: "generated", qr_path: null, phone: "9876543210", updated_at: now() },
      ],
      friends: [
        { id: uuid(), user_id: me, name: "Aarav", phone: "9876500001", upi_id: "aarav@okbank", created_at: now() },
        { id: uuid(), user_id: me, name: "Meera", phone: "9876500002", upi_id: null, created_at: now() },
        { id: uuid(), user_id: me, name: "Kabir", phone: null, upi_id: null, created_at: now() },
      ],
      connections: [
        { id: uuid(), requester: me, addressee: FRIEND_ID, status: "accepted", created_at: now() },
      ],
      entries: [
        entry("Aarav", 450, "me", "Pending", -2, "Dinner at Toit", day(5)),
        entry("Aarav", 120, "friend", "Pending", -1, "Auto to office"),
        entry("Meera", 1200, "me", "Pending", -9, "Concert tickets", day(-1)),
        entry("Meera", 300, "me", "Settled", -20, "Groceries"),
        entry("Kabir", 250.5, "me", "Pending", -4, "Movie"),
        entry("Kabir", 80, "friend", "Settled", -15, "Chai"),
      ],
      friend_groups: [{ id: groupId, user_id: me, name: "Goa trip", created_at: now() }],
      friend_group_members: ["Aarav", "Meera", "Kabir"].map((name) => ({ id: uuid(), group_id: groupId, name, created_at: now() })),
      friend_group_expenses: [
        { id: uuid(), group_id: groupId, kind: "expense", title: "Villa", amount: 9000, paid_by: "me",
          shares: { me: 2250, Aarav: 2250, Meera: 2250, Kabir: 2250 }, expense_date: day(-6), created_at: now() },
        { id: uuid(), group_id: groupId, kind: "expense", title: "Scooters", amount: 1600, paid_by: "Aarav",
          shares: { me: 400, Aarav: 400, Meera: 400, Kabir: 400 }, expense_date: day(-5), created_at: now() },
      ],
      app_payments: [
        { id: uuid(), user_id: me, friend_name: "Kabir", amount: 80, method: "upi_app", status: "paid",
          entry_ids: [], payee_upi: "kabir@okbank", note: "Chai", reference: null, created_at: new Date(Date.now() - 15 * 864e5).toISOString() },
      ],
    },
    files: {},
  };
}

function load() {
  try {
    const db = JSON.parse(localStorage.getItem(KEY) || "null");
    if (db?.tables) return db;
  } catch {
    // fall through to a fresh seed
  }
  const db = seed();
  save(db);
  return db;
}
function save(db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // private mode: the data lives for this page only
  }
}

let db = load();
const ok = (data) => ({ data, error: null });
const fail = (message) => ({ data: null, error: { message } });
const later = (v) => new Promise((r) => setTimeout(() => r(v), 60)); // a little like a network

/* ---------- tables ---------- */

function pick(row, columns) {
  if (!columns || columns.trim() === "*") return { ...row };
  const out = {};
  for (const c of columns.split(",").map((s) => s.trim()).filter(Boolean)) out[c] = row[c];
  return out;
}

class Query {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.filters = [];
    this.orders = [];
    this.columns = "*";
    this.returning = false;
    this.one = null; // "single" | "maybe"
    this.max = null;
  }
  select(columns = "*") {
    if (this.op === "select") this.columns = columns;
    else this.returning = true;
    this.columns = columns;
    return this;
  }
  insert(values) { this.op = "insert"; this.values = values; return this; }
  upsert(values) { this.op = "upsert"; this.values = values; return this; }
  update(values) { this.op = "update"; this.values = values; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c, v) { this.filters.push((r) => r[c] === v); return this; }
  neq(c, v) { this.filters.push((r) => r[c] !== v); return this; }
  in(c, list) { this.filters.push((r) => list.includes(r[c])); return this; }
  gt(c, v) { this.filters.push((r) => r[c] > v); return this; }
  gte(c, v) { this.filters.push((r) => r[c] >= v); return this; }
  lt(c, v) { this.filters.push((r) => r[c] < v); return this; }
  lte(c, v) { this.filters.push((r) => r[c] <= v); return this; }
  ilike(c, pattern) {
    const rx = new RegExp(`^${String(pattern).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "i");
    this.filters.push((r) => rx.test(String(r[c] ?? "")));
    return this;
  }
  order(c, { ascending = true } = {}) { this.orders.push([c, ascending]); return this; }
  limit(n) { this.max = n; return this; }
  single() { this.one = "single"; return this; }
  maybeSingle() { this.one = "maybe"; return this; }
  then(resolve, reject) { return later(this.run()).then(resolve, reject); }

  rows() {
    if (!db.tables[this.table]) db.tables[this.table] = [];
    return db.tables[this.table];
  }
  matches(r) { return this.filters.every((f) => f(r)); }
  run() {
    const all = this.rows();
    let out;
    if (this.op === "select") {
      out = all.filter((r) => this.matches(r));
    } else if (this.op === "insert" || this.op === "upsert") {
      const list = (Array.isArray(this.values) ? this.values : [this.values]).map((v) => ({
        ...(this.table === "profile_details" || this.table === "profiles" ? {} : { id: uuid() }),
        user_id: DEMO.id,
        created_at: now(),
        ...v,
      }));
      out = [];
      for (const row of list) {
        const key = this.table === "profile_details" ? "user_id" : "id";
        const at = this.op === "upsert" ? all.findIndex((r) => r[key] === row[key]) : -1;
        if (at >= 0) all[at] = { ...all[at], ...row };
        else all.push(row);
        out.push(at >= 0 ? all[at] : row);
      }
    } else if (this.op === "update") {
      out = [];
      all.forEach((r, i) => {
        if (this.matches(r)) {
          all[i] = { ...r, ...this.values };
          out.push(all[i]);
        }
      });
    } else {
      out = all.filter((r) => this.matches(r));
      db.tables[this.table] = all.filter((r) => !this.matches(r));
    }
    if (this.op !== "select") save(db);
    if (this.op !== "select" && !this.returning && !this.one) return ok(null);
    for (const [c, asc] of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
    }
    if (this.max !== null) out = out.slice(0, this.max);
    out = out.map((r) => pick(r, this.columns));
    if (this.one === "single") return out.length === 1 ? ok(out[0]) : fail("JSON object requested, multiple (or no) rows returned");
    if (this.one === "maybe") return ok(out[0] ?? null);
    return ok(out);
  }
}

/* ---------- auth ---------- */

const listeners = new Set();
function emit(event) {
  for (const fn of listeners) setTimeout(() => fn(event, db.session), 0);
}
function signIn() {
  db.session = { access_token: "mock", token_type: "bearer", user: DEMO };
  save(db);
  emit("SIGNED_IN");
  return later(ok({ session: db.session, user: DEMO }));
}

const auth = {
  getSession: () => later(ok({ session: db.session })),
  getUser: () => later(db.session ? ok({ user: db.session.user }) : fail("Not signed in")),
  onAuthStateChange(fn) {
    listeners.add(fn);
    setTimeout(() => fn("INITIAL_SESSION", db.session), 0);
    return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } };
  },
  signInWithPassword: signIn,
  signUp: signIn,
  verifyOtp: signIn,
  signInWithOtp: () => later(ok({})),
  signInWithOAuth: () => signIn(),
  resetPasswordForEmail: () => later(ok({})),
  updateUser(attrs) {
    if (!db.session) return later(fail("Not signed in"));
    const user = db.session.user;
    db.session.user = { ...user, ...(attrs.email ? { email: attrs.email } : {}), user_metadata: { ...user.user_metadata, ...(attrs.data || {}) } };
    save(db);
    emit("USER_UPDATED");
    return later(ok({ user: db.session.user }));
  },
  signOut() {
    db.session = null;
    save(db);
    emit("SIGNED_OUT");
    return later(ok(null));
  },
};

/* ---------- functions the database runs (rpc) ---------- */

function rpc(name, args = {}) {
  const t = db.tables;
  switch (name) {
    case "update_my_name": {
      const p = t.profiles.find((r) => r.id === DEMO.id);
      if (p) p.name = args.p_name;
      save(db);
      return later(ok(null));
    }
    case "friend_upi": {
      const f = t.friends.find((r) => r.id === args.p_friend_id);
      return later(ok(f?.upi_id || null));
    }
    case "confirm_app_payment": {
      const p = t.app_payments.find((r) => r.id === args.p_id);
      if (p) p.status = "confirmed";
      save(db);
      return later(ok(null));
    }
    case "send_friend_request":
    case "claim_friend_invite": {
      const other = t.profiles.find((r) => r.friend_code.toLowerCase() === String(args.p_code || "").trim().toLowerCase());
      if (!other) return later(fail("No one has that friend code."));
      if (other.id === DEMO.id) return later(fail("That's your own code."));
      return later(ok(null));
    }
    case "respond_friend_request": {
      const c = t.connections.find((r) => r.id === args.p_id);
      if (c) c.status = args.p_accept ? "accepted" : "declined";
      save(db);
      return later(ok(null));
    }
    case "delete_my_account":
      db = seed();
      db.session = null;
      save(db);
      emit("SIGNED_OUT");
      return later(ok(null));
    default:
      return later(fail(`The mock has no function "${name}".`));
  }
}

/* ---------- storage (files kept as data URLs) ---------- */

function bucket(name) {
  const key = (path) => `${name}/${path}`;
  return {
    async upload(path, file) {
      const url = await new Promise((r) => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.readAsDataURL(file);
      });
      db.files[key(path)] = url;
      save(db);
      return ok({ path });
    },
    async download(path) {
      const url = db.files[key(path)];
      return url ? ok(await (await fetch(url)).blob()) : fail("Not found");
    },
    getPublicUrl: (path) => ({ data: { publicUrl: db.files[key(path)] || "" } }),
    createSignedUrl: (path) => later(db.files[key(path)] ? ok({ signedUrl: db.files[key(path)] }) : fail("Not found")),
    remove(paths) {
      for (const p of paths) delete db.files[key(p)];
      save(db);
      return later(ok(null));
    },
  };
}

export const supabase = {
  from: (table) => new Query(table),
  rpc,
  auth,
  storage: { from: bucket },
  channel: () => ({ on() { return this; }, subscribe() { return this; } }),
  removeChannel: () => {},
};
