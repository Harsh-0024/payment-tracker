/* Desktop dashboard (matches the website mockup). Numbers come from your real entries and friends. */
import { R, kindFor, hue, ini } from "./people";
const dateOf = (e) => new Date(e.payment_date || e.created_at || Date.now());
const mkey = (d) => d.getFullYear() * 12 + d.getMonth();
const sumA = (l) => l.reduce((s, e) => s + Number(e.amount), 0);

function lastMonths(n) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: mkey(d), label: d.toLocaleString("en-US", { month: "short" }) });
  }
  return out;
}
const series = (entries, ok, ms) =>
  ms.map((m) => sumA(entries.filter((e) => ok(e) && mkey(dateOf(e)) === m.key)));
function change(vals) {
  const cur = vals[vals.length - 1];
  const prev = vals[vals.length - 2];
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}
function ago(e) {
  const t = new Date(e.created_at || e.payment_date || Date.now()).getTime();
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return m + "m ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.round(h / 24);
  return d < 30 ? d + "d ago" : dateOf(e).toLocaleDateString("en-IN");
}

const CATS = [
  ["Food & Drinks", /food|dinner|lunch|breakfast|chai|tea|coffee|cafe|snack|pizza|burger|biryani|restaurant|meal|drink|zomato|swiggy|party/i, "#1d62f0"],
  ["Travel", /trip|travel|cab|taxi|uber|ola|flight|ticket|hotel|train|bus|fuel|petrol|metro|goa|stay|movie/i, "#9dbaff"],
  ["Shopping", /shop|cloth|amazon|flipkart|mall|gift|grocer|market|buy|bill|rent/i, "#6a5cf0"],
];
const catOf = (e) => {
  const t = [e.note, e.mode].join(" ");
  const c = CATS.find((x) => x[1].test(t));
  return c ? c[0] : "Others";
};

const IC = {
  wallet: (<><path d="M4 7a2 2 0 0 1 2-2h11v4" /><rect x="3" y="7" width="18" height="13" rx="3" /><circle cx="16.5" cy="13.5" r="1.2" /></>),
  users: (<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.8 0 4.5 1.8 4.5 4.5" /></>),
  gift: (<><rect x="3" y="9" width="18" height="11" rx="2" /><path d="M12 9v11M3 13h18M12 9c-3 0-4-4-1.5-4S12 9 12 9zM12 9c3 0 4-4 1.5-4S12 9 12 9z" /></>),
  receipt: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>),
  bolt: <path d="M13 3L5 13h6l-1 8 8-10h-6z" />,
  chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  up: <path d="M7 17L17 7M9 7h8v8" />,
};
function Ic({ n, s = 22 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{IC[n]}</svg>
  );
}

function Spark({ vals, color, id }) {
  const w = 130, h = 46, max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => [(i * w) / (vals.length - 1), h - 5 - (v / max) * (h - 14)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return (
    <svg className="dh-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stat({ icon, tint, label, value, vals, color, id, badUp }) {
  const c = change(vals);
  const good = c === null ? null : badUp ? c <= 0 : c >= 0;
  return (
    <div className="dh-card dh-stat">
      <span className="dh-stat-ic" style={{ background: tint[0], color: tint[1] }}><Ic n={icon} s={26} /></span>
      <div className="dh-stat-tx">
        <small>{label}</small>
        <b>{value}</b>
        <em className={c === null ? "" : good ? "up" : "dn"}>
          {c === null ? "No change data yet" : `${c >= 0 ? "↑" : "↓"} ${Math.abs(c)}%`}
        </em>
      </div>
      <Spark vals={vals} color={color} id={id} />
    </div>
  );
}

/* Picture-style covers for the group cards */
export function Cover({ kind, uid }) {
  const g = "cv" + uid;
  return (
    <svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {kind === "mountain" && (<>
        <defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6f9be0" /><stop offset="1" stopColor="#d4e3fc" /></linearGradient></defs>
        <rect width="300" height="150" fill={`url(#${g})`} />
        <path d="M0 108L58 42l40 40 52-58 60 66 40-34 50 42v52H0z" fill="#46608f" />
        <path d="M150 24l-24 30 14-5 10 10 10-9 14 6z" fill="#f4f8ff" />
        <path d="M58 42l-14 20 12-4 10 6z" fill="#f4f8ff" />
        <path d="M0 120c60-18 120 8 180-6s90-8 120 2v34H0z" fill="#3c8f6c" />
        <rect y="136" width="300" height="14" fill="#5fa8d8" />
      </>)}
      {kind === "cafe" && (<>
        <defs><linearGradient id={g} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9a6a43" /><stop offset="1" stopColor="#3d2415" /></linearGradient></defs>
        <rect width="300" height="150" fill={`url(#${g})`} />
        <path d="M0 0c30 10 40 40 20 70-10-30-30-50-20-70z" fill="#3f7a4d" />
        <path d="M0 10c40 0 50 30 30 50-10-20-30-30-30-50z" fill="#4f9a60" />
        <ellipse cx="170" cy="112" rx="92" ry="18" fill="#efe6dc" />
        <path d="M110 70h120c0 40-24 60-60 60s-60-20-60-60z" fill="#f7f1ea" />
        <ellipse cx="170" cy="70" rx="60" ry="14" fill="#b9824f" />
        <path d="M170 76c-12-8-18-14-12-19 4-3 9 0 12 4 3-4 8-7 12-4 6 5 0 11-12 19z" fill="#f4e4cf" />
      </>)}
      {kind === "room" && (<>
        <rect width="300" height="150" fill="#e8dccb" />
        <rect x="170" y="14" width="96" height="70" rx="4" fill="#cfe6ff" stroke="#8a6f52" strokeWidth="5" />
        <path d="M218 14v70M170 49h96" stroke="#8a6f52" strokeWidth="3" />
        <rect x="30" y="76" width="150" height="48" rx="8" fill="#fbfaf7" />
        <rect x="38" y="64" width="46" height="22" rx="8" fill="#ffffff" />
        <rect x="30" y="100" width="150" height="24" rx="6" fill="#9db8e8" />
        <rect y="124" width="300" height="26" fill="#b08d6a" />
        <rect x="258" y="96" width="6" height="30" fill="#6b4f36" /><ellipse cx="261" cy="92" rx="16" ry="10" fill="#f6d98a" />
      </>)}
      {kind === "city" && (<>
        <defs><linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2a52" /><stop offset="0.7" stopColor="#6b6fa8" /><stop offset="1" stopColor="#e49a6b" /></linearGradient></defs>
        <rect width="300" height="150" fill={`url(#${g})`} />
        <g fill="#16224a">
          <rect x="20" y="70" width="40" height="80" /><rect x="66" y="48" width="34" height="102" /><rect x="106" y="82" width="44" height="68" />
          <rect x="156" y="40" width="38" height="110" /><rect x="200" y="74" width="40" height="76" /><rect x="246" y="58" width="40" height="92" />
        </g>
        <g fill="#f6d98a" opacity="0.85">
          <rect x="28" y="84" width="6" height="6" /><rect x="42" y="100" width="6" height="6" /><rect x="74" y="64" width="6" height="6" />
          <rect x="84" y="90" width="6" height="6" /><rect x="164" y="58" width="6" height="6" /><rect x="176" y="86" width="6" height="6" />
          <rect x="210" y="92" width="6" height="6" /><rect x="256" y="76" width="6" height="6" /><rect x="268" y="102" width="6" height="6" />
        </g>
      </>)}
    </svg>
  );
}

export default function DesktopHome({ entries, friends, name, go }) {
  const ms = lastMonths(6);
  const all = () => true;
  const open = entries.filter((e) => e.status !== "Settled");
  const owe = open.filter((e) => e.paid_by === "friend");
  const owed = open.filter((e) => e.paid_by === "me");

  const sTotal = series(entries, all, ms);
  const sOwe = series(entries, (e) => e.paid_by === "friend" && e.status !== "Settled", ms);
  const sOwed = series(entries, (e) => e.paid_by === "me" && e.status !== "Settled", ms);

  const hr = new Date().getHours();
  const hello = hr < 12 ? "Good Morning" : hr < 17 ? "Good Afternoon" : "Good Evening";

  const total = sumA(entries);
  const cats = [...CATS.map((c) => [c[0], c[2]]), ["Others", "#b9c3d8"]].map(([n, color]) => ({
    name: n, color, value: sumA(entries.filter((e) => catOf(e) === n)),
  }));
  const C = 2 * Math.PI * 52;
  let acc = 0;
  const maxBar = Math.max(...sTotal, 1);
  const topIdx = sTotal.indexOf(Math.max(...sTotal));

  const groups = friends.slice(0, 3).map((f, i) => {
    const list = entries.filter((e) => e.friend === f.name && e.status !== "Settled");
    const net = sumA(list.filter((e) => e.paid_by === "me")) - sumA(list.filter((e) => e.paid_by === "friend"));
    return { f, i, net };
  });
  const recent = entries.slice(0, 4);

  return (
    <div className="dh">
      <div className="dh-left">
        <h1 className="dh-hello">{hello}, {name}! <span>👋</span></h1>
        <p className="dh-sub">Split smarter. Spend better.</p>

        <div className="dh-stats">
          <Stat icon="wallet" tint={["#e3ecff", "#1d62f0"]} label="Total Expenses" value={R(total)} vals={sTotal} color="#1d62f0" id="sp1" />
          <Stat icon="users" tint={["#efe6ff", "#6a3fd8"]} label="You Owe" value={R(sumA(owe))} vals={sOwe} color="#ef6a8a" id="sp2" badUp />
          <Stat icon="gift" tint={["#dcf5e6", "#16a34a"]} label="You're Owed" value={R(sumA(owed))} vals={sOwed} color="#22b866" id="sp3" />
        </div>

        <section className="dh-card dh-sec">
          <div className="dh-sh"><h2>Your Groups</h2><button type="button" onClick={() => go("Groups")}>See all →</button></div>
          <div className="dh-groups">
            {groups.map(({ f, i, net }) => (
              <button type="button" className="dh-g" key={f.id} onClick={() => go("Groups")}>
                <div className="dh-g-pic"><Cover kind={kindFor(f.name, i)} uid={f.id} /></div>
                <div className="dh-g-av">
                  <span style={{ background: hue(f.name) }}>{ini(f.name)}</span>
                  <span style={{ background: "#12327f" }}>Y</span>
                </div>
                <b>{f.name}</b>
                <small>{f.linked_user_id ? "Linked friend" : "Friend"}</small>
                <span className={"dh-chip " + (net > 0 ? "get" : net < 0 ? "owe" : "ok")}>
                  {net > 0 ? `You're owed ${R(net)}` : net < 0 ? `You owe ${R(-net)}` : "All settled"}
                </span>
              </button>
            ))}
            <button type="button" className="dh-g dh-g-new" onClick={() => go("Groups")}>
              <span className="dh-plus"><Ic n="plus" s={26} /></span>
              <span>Create<br />New Group</span>
            </button>
          </div>
        </section>

        <section className="dh-card dh-sec">
          <div className="dh-sh"><h2>Spending Overview</h2><span className="dh-mut">Last 6 Months</span></div>
          {total === 0 ? (
            <p className="dh-empty">Add an expense to see where your money goes.</p>
          ) : (
            <div className="dh-spend">
              <div className="dh-donutwrap">
                <svg viewBox="0 0 140 140" className="dh-donut" aria-hidden="true">
                  <circle cx="70" cy="70" r="52" fill="none" stroke="var(--tile)" strokeWidth="20" />
                  {cats.map((c) => {
                    const len = (c.value / total) * C;
                    const el = (
                      <circle key={c.name} cx="70" cy="70" r="52" fill="none" stroke={c.color} strokeWidth="20"
                        strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />
                    );
                    acc += len;
                    return el;
                  })}
                </svg>
                <div className="dh-donut-c"><b>{R(total)}</b><small>Total</small></div>
              </div>
              <div className="dh-legend">
                {cats.map((c) => (
                  <div key={c.name}>
                    <i style={{ background: c.color }} /><span>{c.name}</span>
                    <b>{Math.round((c.value / total) * 100)}%</b><em>{R(c.value)}</em>
                  </div>
                ))}
              </div>
              <div className="dh-bars">
                {sTotal.map((v, i) => (
                  <div key={i} className={"dh-bar" + (i === topIdx ? " top" : "")}>
                    {i === topIdx && <span className="tip">{R(v)}</span>}
                    <u style={{ height: Math.max(4, (v / maxBar) * 100) + "%" }} />
                    <small>{ms[i].label}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="dh-right">
        <div className="dh-hero">
          <div>
            <h3>Split. Settle. Done.</h3>
            <p>Create a group and start splitting expenses in seconds.</p>
            <button type="button" onClick={() => go("Groups")}>Create Group <Ic n="arrow" s={16} /></button>
          </div>
          <svg viewBox="0 0 120 100" aria-hidden="true">
            <g transform="rotate(-14 60 55)">
              <rect x="18" y="26" width="84" height="56" rx="14" fill="#2f7bff" />
              <rect x="18" y="26" width="84" height="22" rx="11" fill="#5b9bff" />
              <rect x="70" y="46" width="32" height="20" rx="8" fill="#1b4fd0" />
              <circle cx="82" cy="56" r="4" fill="#fff" />
            </g>
          </svg>
        </div>

        <section className="dh-card dh-sec dh-act">
          <div className="dh-sh"><h2>Recent Activity</h2><button type="button" onClick={() => go("Payments")}>See all →</button></div>
          {recent.length === 0 && <p className="dh-empty">Nothing here yet.</p>}
          {recent.map((e) => {
            const settled = e.status === "Settled";
            const mine = e.paid_by === "me";
            return (
              <div className="dh-a" key={e.id}>
                <span className="dh-av" style={{ background: hue(e.friend) }}>{ini(mine ? "Y" : e.friend)}</span>
                <div>
                  <b>{settled ? `${e.friend} settled ${R(e.amount)}` : mine ? `You paid ${R(e.amount)}` : `${e.friend} paid ${R(e.amount)}`}</b>
                  <small>{e.note || e.mode || "Payment"} · {ago(e)}</small>
                </div>
                <span className={"dh-badge " + (settled || !mine ? "g" : "b")}>
                  <Ic n={settled || !mine ? "up" : "plus"} s={15} />
                </span>
              </div>
            );
          })}
        </section>

        <section className="dh-card dh-sec">
          <div className="dh-sh"><h2>Quick Actions</h2></div>
          <div className="dh-qa">
            <button type="button" onClick={() => go("Expenses")}><span><Ic n="receipt" /></span>Add Expense</button>
            <button type="button" onClick={() => go("Groups")}><span><Ic n="users" /></span>Create Group</button>
            <button type="button" onClick={() => go("Settlements")}><span><Ic n="bolt" /></span>Settle Up</button>
            <button type="button" className="wide" onClick={() => go("Analytics")}><span><Ic n="chart" /></span>View Analytics</button>
          </div>
        </section>
      </div>
    </div>
  );
}
