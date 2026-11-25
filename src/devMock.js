// A pretend Supabase for looking at the app locally, with no project and no real accounts.
// Turned on only by `npm run dev:mock` (VITE_MOCK=1 in dev). Production builds never include it:
// supabaseClient.js checks import.meta.env.DEV first, so Vite drops this file from the build.
//
// The data lives in this tab's memory, starts from the demo rows below and is gone on reload
// (only "signed in" is remembered, in sessionStorage). Nothing is sent anywhere.

const ME = { id: "u-demo", email: "demo@example.test", user_metadata: { name: "Demo" } };

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const at = (offset) => `${day(offset)}T12:00:00.000Z`;

function seed() {
  const entries = [
    { friend: "Aarav", amount: 1200, note: "Dinner at Toit", paid_by: "me", status: "Pending", mode: "UPI", payment_date: day(-1), due_date: day(6) },
    { friend: "Meera", amount: 450, note: "Cab to the airport", paid_by: "friend", status: "Pending", mode: "UPI", payment_date: day(-3), due_date: null },
    { friend: "Kabir", amount: 2999, note: "Concert tickets", paid_by: "me", status: "Pending", mode: "Card", payment_date: day(-6), due_date: day(-1) },
    { friend: "Aarav", amount: 300, note: "Coffee", paid_by: "friend", status: "Settled", mode: "Cash", payment_date: day(-12), due_date: null },
    { friend: "Meera", amount: 800, note: "Groceries", paid_by: "me", status: "Settled", mode: "UPI", payment_date: day(-20), due_date: null },
  ].map((e, i) => ({ id: `e${i + 1}`, user_id: ME.id, created_at: at(-i), ...e }));
  return {
    entries,
    friends: [
      { id: "f1", user_id: ME.id, name: "Aarav", upi_id: "aarav@okbank", phone: null, linked_user_id: null, invite_code: null },
      { id: "f2", user_id: ME.id, name: "Kabir", upi_id: null, phone: null, linked_user_id: null, invite_code: null },
      { id: "f3", user_id: ME.id, name: "Meera", upi_id: "meera@okbank", phone: null, linked_user_id: null, invite_code: null },
    ],
    connections: [],
    profiles: [{ id: ME.id, name: "Demo", friend_code: "DEMO42" }],
    profile_details: [],
    friend_groups: [{ id: "g1", user_id: ME.id, name: "Goa trip", created_at: at(-8) }],
    friend_group_members: [
      { id: "m1", group_id: "g1", name: "Aarav", member_user_id: null },
      { id: "m2", group_id: "g1", name: "Meera", member_user_id: null },
    ],
    friend_group_expenses: [
      { id: "x1", group_id: "g1", kind: "expense", title: "Villa", amount: 9000, paid_by: "__me__", shares: { __me__: 3000, Aarav: 3000, Meera: 3000 }, expense_date: day(-8) },
    ],
    app_payments: [],
  };
}

// Filled by createMockClient(); nothing runs when this file is merely imported, so builds drop it.
let db = null;
let nextId = 100;
const newId = () => `mock-${(nextId += 1)}`;

// A query: from(table).select().eq()...; awaiting it (or .then) runs it.
function query(table) {
  const filters = [];
  const orders = [];
  let action = "select";
  let payload = null;
  let returnRows = false;
  let one = null; // "single" | "maybe"

  const q = {
    select() {
      if (action !== "select") returnRows = true;
      return q;
    },
    insert(rows) { action = "insert"; payload = rows; return q; },
    upsert(rows) { action = "upsert"; payload = rows; return q; },
    update(values) { action = "update"; payload = values; return q; },
    delete() { action = "delete"; return q; },
    eq(col, v) { filters.push((r) => r[col] === v); return q; },
    neq(col, v) { filters.push((r) => r[col] !== v); return q; },
    in(col, vs) { filters.push((r) => vs.includes(r[col])); return q; },
    filter(col, op, v) {
      filters.push((r) => (op === "eq" ? r[col] === v : op === "neq" ? r[col] !== v : true));
      return q;
    },
    order(col, { ascending = true } = {}) { orders.push([col, ascending]); return q; },
    limit() { return q; },
    single() { one = "single"; return q; },
    maybeSingle() { one = "maybe"; return q; },
    then(resolve, reject) { return Promise.resolve().then(run).then(resolve, reject); },
  };

  function run() {
    const rows = (db[table] ||= []);
    const match = (r) => filters.every((f) => f(r));
    let out;
    if (action === "insert" || action === "upsert") {
      const list = (Array.isArray(payload) ? payload : [payload]).map((r) => ({
        id: r.id || newId(),
        user_id: ME.id,
        created_at: new Date().toISOString(),
        ...(table === "entries" ? { status: "Pending" } : {}),
        ...r,
      }));
      list.forEach((r) => {
        const key = action === "upsert" && r.user_id && table === "profile_details" ? "user_id" : "id";
        const i = rows.findIndex((x) => x[key] === r[key]);
        if (action === "upsert" && i >= 0) rows[i] = { ...rows[i], ...r };
        else rows.push(r);
      });
      out = returnRows ? list : null;
    } else if (action === "update") {
      out = rows.filter(match).map((r) => Object.assign(r, payload));
      if (!returnRows) out = null;
    } else if (action === "delete") {
      db[table] = rows.filter((r) => !match(r));
      out = null;
    } else {
      out = rows.filter(match).map((r) => ({ ...r }));
      for (const [col, asc] of [...orders].reverse()) {
        out.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
      }
    }
    if (one) {
      const row = Array.isArray(out) ? out[0] ?? null : out;
      if (!row && one === "single") return { data: null, error: { message: "No rows (mock)" } };
      return { data: row, error: null };
    }
    return { data: out, error: null };
  }
  return q;
}

// Remembered for this tab only, so a dev-server reload (or switching branches) doesn't sign you out.
// The demo rows still start fresh on each load.
const KEY = "splitpay-mock-signed-in";
const remember = (on) => {
  try {
    if (on) sessionStorage.setItem(KEY, "1");
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode: just forget */
  }
};
const remembered = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export function createMockClient() {
  db = seed();
  let session = remembered() ? { access_token: "mock-token", user: ME } : null;
  const listeners = new Set();
  const signIn = () => {
    session = { access_token: "mock-token", user: ME };
    remember(true);
    listeners.forEach((cb) => cb("SIGNED_IN", session));
    return { data: { session, user: ME }, error: null };
  };
  const ok = async () => ({ data: {}, error: null });

  return {
    auth: {
      async getSession() { return { data: { session } }; },
      async getUser() { return { data: { user: session ? ME : null }, error: null }; },
      onAuthStateChange(cb) {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      },
      async signInWithPassword() { return signIn(); },
      async signUp() { return signIn(); },
      async signInWithOtp() { return { data: {}, error: { message: "Codes aren't sent in the mock: use email and password." } }; },
      async signInWithOAuth() { return signIn(); },
      async verifyOtp() { return signIn(); },
      async signOut() {
        session = null;
        remember(false);
        db = seed();
        listeners.forEach((cb) => cb("SIGNED_OUT", null));
        return { error: null };
      },
      updateUser: ok,
      resetPasswordForEmail: ok,
    },
    from: query,
    async rpc(name, args) {
      if (name === "update_my_name") {
        db.profiles[0].name = args?.new_name ?? args?.name ?? db.profiles[0].name;
        return { data: null, error: null };
      }
      return { data: null, error: { message: `${name} isn't in the mock.` } };
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: "Uploads aren't in the mock." } }),
        remove: ok,
        download: async () => ({ data: null, error: { message: "Not in the mock." } }),
        createSignedUrl: async () => ({ data: null, error: { message: "Not in the mock." } }),
      }),
    },
  };
}
