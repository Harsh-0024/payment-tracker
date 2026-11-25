import { useState, useRef, useEffect } from "react";

const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");
const has = (q, words) => words.some((w) => q.includes(w));
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "");

// paid_by === "friend": dost ne diya, aapko dena hai. paid_by === "me": aapne diya, dost se lena hai.
function totals(entries) {
  const owe = {};
  const get = {};
  entries
    .filter((e) => e.status !== "Settled")
    .forEach((e) => {
      const a = Number(e.amount) || 0;
      if (e.paid_by === "friend") owe[e.friend] = (owe[e.friend] || 0) + a;
      else if (e.paid_by === "me") get[e.friend] = (get[e.friend] || 0) + a;
    });
  return { owe, get };
}

const sum = (o) => Object.values(o).reduce((s, v) => s + v, 0);
const lines = (o) =>
  Object.entries(o)
    .sort((a, b) => b[1] - a[1])
    .map(([n, v]) => `• ${n}: ${rupee(v)}`)
    .join("\n");

function entryLine(e) {
  const dir = e.paid_by === "friend" ? "aapko dena hai" : "aapko milega";
  const st = e.status === "Settled" ? "settled" : dir;
  return `• ${fmt(e.payment_date)} · ${e.friend} · ${rupee(e.amount)} (${st})${e.note ? " · " + e.note : ""}`;
}

const EXAMPLES =
  'Aap ye puch sakte ho:\n• "Total kitna dena hai?"\n• "Mujhe kitna milega?"\n• "Vapurab ka hisaab"\n• "Pending list"\n• "Recent payments"\n• "Sabse zyada kisko dena hai?"';

function answer(text, entries, friends) {
  const q = text.toLowerCase().trim();
  const { owe, get } = totals(entries);
  const names = Array.from(
    new Set([...friends.map((f) => f.name), ...entries.map((e) => e.friend)])
  )
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const name = names.find((n) => q.includes(n.toLowerCase()));

  const wantOwe = has(q, ["dena", "deni", "dun ", "owe", "pay karna"]);
  const wantGet = has(q, ["lena", "lene", "milega", "milne", "receive", "wapas"]);
  const tokens = q.split(/[^a-z]+/);

  if (tokens.length <= 3 && has(tokens.join(" "), ["hi", "hello", "hey", "namaste"])) {
    return "Namaste! Main aapke payments ka helper hu.\n\n" + EXAMPLES;
  }
  if (has(q, ["help", "madad", "kya puch", "kya kar sakta"])) return EXAMPLES;

  if (has(q, ["sabse zyada", "sabse jyada", "most", "highest"])) {
    const o = Object.entries(owe).sort((a, b) => b[1] - a[1])[0];
    const g = Object.entries(get).sort((a, b) => b[1] - a[1])[0];
    const out = [];
    if (o) out.push(`Sabse zyada aapko ${o[0]} ko dena hai: ${rupee(o[1])}`);
    if (g) out.push(`Sabse zyada ${g[0]} se milna hai: ${rupee(g[1])}`);
    return out.length ? out.join("\n") : "Abhi koi pending hisaab nahi hai.";
  }

  if (has(q, ["recent", "last", "history", "pichle", "latest"])) {
    const list = entries
      .filter((e) => !name || e.friend === name)
      .sort(
        (a, b) =>
          new Date(b.payment_date || 0) - new Date(a.payment_date || 0) || b.id - a.id
      )
      .slice(0, 5);
    if (!list.length) return "Abhi koi payment entry nahi mili.";
    return "Recent payments:\n" + list.map(entryLine).join("\n");
  }

  if (has(q, ["pending", "baki", "bacha", "unsettled", "list"])) {
    const list = entries
      .filter((e) => e.status !== "Settled" && (!name || e.friend === name))
      .slice(0, 10);
    if (!list.length) return "Koi pending payment nahi hai. Sab settled hai.";
    return "Pending payments:\n" + list.map(entryLine).join("\n");
  }

  if (name) {
    const o = owe[name] || 0;
    const g = get[name] || 0;
    if (wantOwe && !wantGet) {
      return o > 0 ? `Aapko ${name} ko ${rupee(o)} dena hai.` : `Aapko ${name} ko kuch nahi dena.`;
    }
    if (wantGet && !wantOwe) {
      return g > 0 ? `${name} se aapko ${rupee(g)} milna hai.` : `${name} se aapko kuch nahi milna.`;
    }
    if (!o && !g) return `${name} ke saath koi pending hisaab nahi hai.`;
    const out = [`${name} ka hisaab:`];
    if (o) out.push(`• Aapko dena hai: ${rupee(o)}`);
    if (g) out.push(`• Aapko milna hai: ${rupee(g)}`);
    const net = g - o;
    if (o && g) {
      out.push(net >= 0 ? `Net: ${name} aapko ${rupee(net)} dega.` : `Net: aapko ${name} ko ${rupee(-net)} dena hai.`);
    }
    return out.join("\n");
  }

  const both = (wantOwe && wantGet) || has(q, ["total", "balance", "net", "kul", "hisaab", "summary"]);
  if (wantOwe && !wantGet && !both) {
    const t = sum(owe);
    return t ? `Aapko total ${rupee(t)} dena hai.\n${lines(owe)}` : "Aapko kisi ko kuch nahi dena.";
  }
  if (wantGet && !wantOwe && !both) {
    const t = sum(get);
    return t ? `Aapko total ${rupee(t)} milna hai.\n${lines(get)}` : "Kisi se aapko kuch nahi milna.";
  }
  if (both) {
    const o = sum(owe);
    const g = sum(get);
    const net = g - o;
    const out = [`Aapko dena hai: ${rupee(o)}`, `Aapko milna hai: ${rupee(g)}`];
    out.push(
      net >= 0 ? `Net: aapko ${rupee(net)} milega.` : `Net: aapko ${rupee(-net)} dena hai.`
    );
    return out.join("\n");
  }

  return "Ye mujhe samajh nahi aaya.\n\n" + EXAMPLES;
}

export default function ChatBot({ entries = [], friends = [] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState([
    {
      from: "bot",
      text: 'Namaste! Main aapke payments ka helper hu. Puchho, jaise "Total kitna dena hai?" ya "vapurab ka hisaab".',
    },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    if (open && endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  function ask(text) {
    const t = text.trim();
    if (!t) return;
    setMsgs((m) => [...m, { from: "me", text: t }, { from: "bot", text: answer(t, entries, friends) }]);
    setInput("");
  }

  const chips = [
    "Total kitna dena hai?",
    "Mujhe kitna milega?",
    "Pending list",
    "Recent payments",
    ...friends.slice(0, 3).map((f) => `${f.name} ka hisaab`),
  ];

  const blue = "#00baf2";
  const navy = "#002970";

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open chat"
          className="chat-fab"
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", right: 20, bottom: 20, zIndex: 1000,
            width: 56, height: 56, borderRadius: "50%", border: 0, cursor: "pointer",
            background: `linear-gradient(135deg, ${navy}, ${blue})`, color: "#fff",
            fontSize: 26, boxShadow: "0 8px 24px rgba(0,41,112,.35)",
          }}
        >
          💬
        </button>
      )}

      {open && (
        <div
          style={{
            position: "fixed", right: 16, bottom: 16, zIndex: 1000,
            width: "min(380px, calc(100vw - 32px))", height: "min(540px, 75vh)",
            background: "#fff", borderRadius: 18, overflow: "hidden",
            boxShadow: "0 12px 40px rgba(0,41,112,.3)", display: "flex", flexDirection: "column",
            color: "#0f172a",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${navy}, ${blue})`, color: "#fff",
              padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>SplitPay Helper</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Aapke payments ke sawal puchho</div>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: 0, color: "#fff", fontSize: 22, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, background: "#f4f8fb" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div
                  style={{
                    maxWidth: "85%", padding: "10px 13px", borderRadius: 14, fontSize: 14, lineHeight: 1.45,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    background: m.from === "me" ? blue : "#fff",
                    color: m.from === "me" ? "#fff" : "#0f172a",
                    boxShadow: m.from === "me" ? "none" : "0 1px 4px rgba(0,41,112,.1)",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div style={{ padding: "8px 10px 0", background: "#fff", display: "flex", gap: 6, overflowX: "auto" }}>
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => ask(c)}
                style={{
                  flex: "0 0 auto", border: `1px solid ${blue}`, background: "#fff", color: navy,
                  borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, padding: 10, background: "#fff" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask(input);
              }}
              placeholder="Apna sawal likho..."
              style={{
                flex: 1, border: "1px solid #cbd5e1", borderRadius: 999, padding: "10px 14px",
                fontSize: 14, outline: "none", background: "#fff", color: "#0f172a",
              }}
            />
            <button
              type="button"
              onClick={() => ask(input)}
              style={{
                border: 0, borderRadius: 999, background: blue, color: "#fff",
                padding: "0 18px", fontWeight: 800, cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
