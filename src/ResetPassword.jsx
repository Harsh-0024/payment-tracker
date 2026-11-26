import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function ResetPassword({ onDone }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setMsg("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setMsg(error.message + " If the link has expired, ask for a new one.");
      return;
    }
    setDone(true);
  }

  return (
    <>
      <div className="topbar"><span className="brand">SplitPay</span></div>
      <div className="auth">
        <h1>Set a new password</h1>
        {done ? (
          <>
            <p className="sub">Your password has been changed.</p>
            <button className="primary" onClick={onDone}>Continue to SplitPay</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <label>New password</label>
            <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
            <label>Confirm new password</label>
            <input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            {msg && <p className="error">{msg}</p>}
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Please wait..." : "Save new password"}
            </button>
            <p className="switch">
              <button className="link" type="button" onClick={onDone}>Back to log in</button>
            </p>
          </form>
        )}
      </div>
    </>
  );
}