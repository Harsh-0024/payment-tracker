import { useState, useMemo } from "react";
import "./dashboard.css";
import { friendlyDate } from "./dates";

import { rupee } from "./people";
const COLORS = ["#4a6cf7", "#1aa0f6", "#f8a53a", "#3ccf6e", "#ef6a8a", "#14b8a6"];
const colorOf = (s) => COLORS[[...String(s || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

// Entry ke note se category pehchanna
const CATS = [
  ["Food & Dining", /food|dinner|lunch|breakfast|cafe|restaurant|pizza|meal|snack|tea|coffee|party/i, "#4a6cf7", "🍴"],
  ["Travel", /cab|taxi|uber|ola|fuel|petrol|bus|train|flight|metro|travel|trip|movie/i, "#1aa0f6", "🚗"],
  ["Accommodation", /hotel|stay|room|rent|hostel|booking/i, "#f8a53a", "🛏️"],
  ["Shopping", /shop|cloth|amazon|flipkart|mall|gift|buy|grocer/i, "#3ccf6e", "🛒"],
];
const OTHERS = ["Others", null, "#c8ccd8", "🧾"];
const catOf = (e) => CATS.find((c) => c[1].test(e.note || "")) || OTHERS;

function Avatar({ name }) {
  return (
    <div className="sp-av" style={{ background: colorOf(name) }}>
      {String(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function Donut({ parts, total }) {
  const R = 70;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="sp-donut">
      <svg width="170" height="170" viewBox="0 0 170 170">
        <circle cx="85" cy="85" r={R} fill="none" style={{ stroke: "var(--line)" }} strokeWidth="24" />
        {total > 0 &&
          parts.map(([name, value, color]) => {
            const len = (value / total) * C;
            const el = (
              <circle
                key={name}
                cx="85" cy="85" r={R} fill="none" stroke={color} strokeWidth="24"
                strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="mid">
        <b>{rupee(total)}</b>
        <span>Total Spend</span>
      </div>
    </div>
  );
}

export default function Dashboard({ entries = [], friends = [], groups = [], name = "", onNavigate = () => {} }) {
  const [range, setRange] = useState("month");

  const data = useMemo(() => {
    const pending = entries.filter((e) => e.status !== "Settled");
    let get = 0;
    let owe = 0;
    const per = {};
    pending.forEach((e) => {
      const a = Number(e.amount) || 0;
      if (e.paid_by === "friend") {
        owe += a;
        per[e.friend] = (per[e.friend] || 0) - a;
      } else if (e.paid_by === "me") {
        get += a;
        per[e.friend] = (per[e.friend] || 0) + a;
      }
    });

    const recent = [...entries]
      .sort((a, b) => new Date(b.payment_date || 0) - new Date(a.payment_date || 0) || b.id - a.id)
      .slice(0, 4);

    const now = new Date();
    const inRange = entries.filter((e) => {
      if (range === "all") return true;
      const d = new Date(e.payment_date || 0);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const sums = {};
    inRange.forEach((e) => {
      const c = catOf(e);
      sums[c[0]] = sums[c[0]] || { value: 0, color: c[2] };
      sums[c[0]].value += Number(e.amount) || 0;
    });
    const parts = Object.entries(sums)
      .map(([n, v]) => [n, v.value, v.color])
      .sort((a, b) => b[1] - a[1]);
    const total = parts.reduce((s, p) => s + p[1], 0);

    const settle = Object.entries(per)
      .filter(([, v]) => v !== 0)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3);

    return { get, owe, net: get - owe, recent, parts, total, settle };
  }, [entries, range]);

  const first = groups[0];

  return (
    <div className="sp-dash">
      <h1 className="sp-hi">Hi, {name || "there"}! 👋</h1>
      <p className="sp-hi-sub">Here&rsquo;s your expense summary</p>

      <div className="sp-row sp-top">
        <div className="sp-bal">
          <small>Your Net Balance</small>
          <div className="big">{rupee(Math.abs(data.net))}</div>
          <div className="sub">
            {data.net >= 0 ? `You will get ${rupee(data.net)}` : `You will pay ${rupee(-data.net)}`}
          </div>
          <svg width="110" height="90" viewBox="0 0 110 90" aria-hidden="true">
            <rect x="8" y="14" width="94" height="68" rx="16" fill="#4d8dff" />
            <rect x="8" y="14" width="94" height="68" rx="16" fill="none" stroke="#bcd6ff" strokeWidth="3" />
            <rect x="58" y="38" width="44" height="24" rx="12" fill="#2f6df0" />
            <circle cx="74" cy="50" r="5" fill="#fff" />
          </svg>
        </div>

        <div className="sp-get">
          <div className="sp-arrow">↗</div>
          <div className="lbl">You Get</div>
          <div className="val">{rupee(data.get)}</div>
        </div>

        <div className="sp-owe">
          <div className="sp-arrow">↓</div>
          <div className="lbl">You Owe</div>
          <div className="val">{rupee(data.owe)}</div>
        </div>

        <div className="sp-card sp-qa">
          <h3>Quick Actions</h3>
          <div className="sp-qa-grid">
            {[
              ["+", "Add Expense", "add"],
              ["👥", "Create Group", "groups"],
              ["▣", "Scan & Pay", "scan"],
              ["🔗", "Share Group", "share"],
            ].map(([ico, label, key]) => (
              <button key={key} type="button" className="sp-qa-btn" onClick={() => onNavigate(key)}>
                <span className="sp-qa-ico">{ico}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sp-row sp-mid">
        <div className="sp-card">
          <div className="sp-h">
            <h3>Recent Expenses</h3>
            <button type="button" className="sp-link" onClick={() => onNavigate("expenses")}>View All →</button>
          </div>
          {data.recent.length === 0 && <div className="sp-empty">No expenses yet. Add your first one.</div>}
          {data.recent.map((e) => {
            const c = catOf(e);
            return (
              <div className="sp-exp" key={e.id}>
                <div className="sp-ico" style={{ background: c[2] + "26" }}>{c[3]}</div>
                <div className="sp-main">
                  <div className="sp-t">{e.note || e.friend}</div>
                  <div className="sp-s">{e.friend}{e.payment_date ? " · " + friendlyDate(e.payment_date) : ""}</div>
                </div>
                <div className="sp-amt">
                  {rupee(e.amount)}
                  <small>{e.paid_by === "me" ? "You paid" : `Paid by ${e.friend}`}</small>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sp-card">
          <div className="sp-h">
            <h3>Expense Analytics</h3>
            <select className="sp-sel" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="month">This Month</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div className="sp-an">
            <Donut parts={data.parts} total={data.total} />
            <div className="sp-leg">
              {data.parts.length === 0 && <div className="sp-empty">No spending in this period.</div>}
              {data.parts.map(([n, v, color]) => (
                <div key={n}>
                  <i style={{ background: color }} />
                  {n}
                  <em>{Math.round((v / data.total) * 100)}%</em>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="sp-card sp-feat" style={{ padding: 0 }}>
            <div className="in">
              <h3>{first ? first.name : "Create a group"}</h3>
              <p>{first ? `${first.members || 0} members` : "Split bills with friends"}</p>
              <button type="button" className="sp-go" onClick={() => onNavigate("groups")}>→</button>
            </div>
            <div className="sp-avs">
              {friends.slice(0, 5).map((f) => <Avatar key={f.id} name={f.name} />)}
              <button type="button" className="sp-plus" onClick={() => onNavigate("friends")}>+</button>
            </div>
          </div>
        </div>
      </div>

      <div className="sp-row sp-bot">
        <div className="sp-card">
          <div className="sp-h">
            <h3>Your Groups</h3>
            <button type="button" className="sp-link" onClick={() => onNavigate("groups")}>View All →</button>
          </div>
          <div className="sp-groups">
            {groups.slice(0, 3).map((g) => (
              <button key={g.id || g.name} type="button" className="sp-g" onClick={() => onNavigate("groups")}>
                <div className="sp-gimg" style={{ background: colorOf(g.name) }}>{String(g.name).charAt(0).toUpperCase()}</div>
                <div>
                  <div className="sp-t">{g.name}</div>
                  <div className="sp-s">{g.members || 0} members</div>
                </div>
              </button>
            ))}
            <button type="button" className="sp-g sp-gnew" onClick={() => onNavigate("groups")}>
              <span style={{ fontSize: 24 }}>+</span>
              Create Group
            </button>
          </div>
        </div>

        <div className="sp-card sp-su">
          <h3>Settle Up</h3>
          <div className="sub">Clear your dues in one tap.</div>
          {data.settle.length === 0 && <div className="sp-empty">All settled. Nothing pending.</div>}
          {data.settle.map(([friend, v]) => (
            <div className="sp-su-row" key={friend}>
              <Avatar name={friend} />
              <div className="sp-main">
                <div className="sp-t">Settle with {friend}</div>
                <div className={v > 0 ? "sp-pos" : "sp-neg"}>{v > 0 ? "Get" : "Pay"} {rupee(Math.abs(v))}</div>
              </div>
              <button type="button" className="sp-btn" onClick={() => onNavigate("pay", friend)}>Settle Now</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
