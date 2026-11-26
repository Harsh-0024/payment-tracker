import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <>
      <div className="topbar"><span className="brand">SplitPay</span></div>
      <div className="auth">
        <h1>Forgot password?</h1>
        <p className="sub">
          Enter your email and we will send you a link to set a new password.
        </p>
        {sent ? (
          <p className="sub">
            If an account exists for {email}, a reset link is on its way. Check your inbox and
            spam folder.
          </p>
        ) : (
          <form onSubmit={submit}>
            <label>Email</label>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {msg && <p className="error">{msg}</p>}
            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Please wait..." : "Send reset link"}
            </button>
          </form>
        )}
        <p className="switch">
          <button className="link" type="button" onClick={onBack}>Back to log in</button>
        </p>
      </div>
    </>
  );
}