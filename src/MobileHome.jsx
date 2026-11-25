/* Phone home screen (matches the mockup): Total Balance, quick actions, recent activity */
const money = (n) => "₹" + Math.abs(Number(n)).toLocaleString("en-IN");

const QA_ICONS = {
  split: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>),
  add: (<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></>),
  settle: <path d="M4 8h14l-3-3M20 16H6l3 3" />,
  scan: (<><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M8 12h8" /></>),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

function Ic({ name, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {QA_ICONS[name]}
    </svg>
  );
}

export default function MobileHome({ entries, go }) {
  const open = entries.filter((e) => e.status !== "Settled");
  const youGet = open.filter((e) => e.paid_by === "me").reduce((s, e) => s + Number(e.amount), 0);
  const youOwe = open.filter((e) => e.paid_by === "friend").reduce((s, e) => s + Number(e.amount), 0);
  const net = youGet - youOwe;
  const recent = entries.slice(0, 6);

  const actions = [
    ["split", "Split Bill", "Expenses"],
    ["add", "Add Expense", "Expenses"],
    ["settle", "Settle Up", "Settlements"],
    ["scan", "Scan QR", "Groups"],
  ];

  return (
    <div className="mh">
      <button type="button" className="mh-bal" onClick={() => go("Settlements")}>
        <svg className="mh-wave" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 80c30-2 45-44 65-46s38 18 60 8 40-30 75-34v72z" />
        </svg>
        <span className="mh-bal-lbl">Total Balance</span>
        <span className="mh-bal-amt">{net < 0 ? "-" : ""}{money(net)}</span>
        <span className="mh-bal-sub">
          You get {money(youGet)} · You owe {money(youOwe)}
        </span>
        <span className="mh-bal-go"><Ic name="arrow" size={20} /></span>
      </button>

      <div className="mh-qa">
        {actions.map(([ic, label, page]) => (
          <button key={label} type="button" onClick={() => go(page)}>
            <span className="mh-qa-ic"><Ic name={ic} /></span>
            <span className="mh-qa-lbl">{label}</span>
          </button>
        ))}
      </div>

      <div className="mh-head">
        <h2>Recent Activity</h2>
        <button type="button" onClick={() => go("Payments")}>See All →</button>
      </div>

      {recent.length === 0 && (
        <p className="mh-empty">No expenses yet. Tap the + button to add your first one.</p>
      )}

      {recent.map((e) => {
        const mine = e.paid_by === "me";
        const settled = e.status === "Settled";
        return (
          <div className="mh-row" key={e.id}>
            <span className="mh-row-ic"><Ic name="split" size={22} /></span>
            <div className="mh-row-mid">
              <b>{e.note || e.mode || "Payment"}</b>
              <small>
                {mine ? `You paid` : `Paid by ${e.friend}`} · {new Date(e.payment_date).toLocaleDateString("en-IN")}
              </small>
            </div>
            <div className="mh-row-end">
              <b className={settled ? "mut" : mine ? "pos" : "neg"}>
                {mine ? "+" : "-"}{money(e.amount)}
              </b>
              <small>{settled ? "Settled" : e.friend}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
