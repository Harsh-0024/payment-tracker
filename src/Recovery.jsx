import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

/* 1) Login ke neeche lagao: <ForgotLink />
      "Forgot password?" dabane par email box aata hai aur reset link email par jata hai. */
export function ForgotLink() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function send() {
    const e = email.trim();
    if (!e) {
      setMsg("Enter your email first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(e, {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    setMsg(error ? error.message : "Reset link sent. Check your email (and spam folder).");
  }

  if (!open) {
    return (
      <p style={{ textAlign: "center", marginTop: 14 }}>
        <a
          href="#"
          onClick={(ev) => {
            ev.preventDefault();
            setOpen(true);
          }}
        >
          Forgot password?
        </a>
      </p>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <label>Your account email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <button className="small" type="button" disabled={busy} onClick={send}>
          Send reset link
        </button>
        <button className="ghost" type="button" onClick={() => setOpen(false)}>
          Back to login
        </button>
      </div>
      {msg && <p className="sub" style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}

/* 2) Poori app ko wrap karo: <RecoveryGate><App /></RecoveryGate>
      Email ka reset link kholne par ye "Set new password" screen dikhata hai. */
export default function RecoveryGate({ children }) {
  const [recovering, setRecovering] = useState(
    typeof window !== "undefined" && window.location.hash.includes("type=recovery")
  );
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function save() {
    if (pw.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setMsg("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setDone(true);
    setMsg("Password updated. You are logged in.");
  }

  function finish() {
    window.location.hash = "";
    setRecovering(false);
  }

  if (!recovering) return children;

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 420 }}>
        <h3>Set a new password</h3>
        {!done && (
          <>
            <label>New password</label>
            <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <label>Confirm new password</label>
            <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <div style={{ marginTop: 16 }}>
              <button className="small" type="button" disabled={busy} onClick={save}>
                Update password
              </button>
            </div>
          </>
        )}
        {done && (
          <div style={{ marginTop: 16 }}>
            <button className="small" type="button" onClick={finish}>
              Continue to SplitPay
            </button>
          </div>
        )}
        {msg && <p className="sub" style={{ marginTop: 12 }}>{msg}</p>}
      </div>
    </div>
  );
}
