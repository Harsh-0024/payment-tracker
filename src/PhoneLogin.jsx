import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

function toE164(s) {
  const raw = String(s || "").trim();
  const d = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return "+" + d;
  if (d.length === 10) return "+91" + d;
  if (d.length === 11 && d.startsWith("0")) return "+91" + d.slice(1);
  if (d.length === 12 && d.startsWith("91")) return "+" + d;
  return "+" + d;
}
const isValid = (p) => /^\+[1-9]\d{9,14}$/.test(p);

export default function PhoneLogin() {
  const [step, setStep] = useState("enter");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const e164 = toE164(phone);

  async function sendCode(e) {
    if (e) e.preventDefault();
    if (!isValid(e164)) {
      setMsg("Enter a valid mobile number (10 digits for India, or add +country code).");
      return;
    }
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { data: name.trim() ? { name: name.trim() } : {} },
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setStep("verify");
    setCode("");
    setWait(60);
    setMsg(`Code sent to ${e164}.`);
  }

  async function verify(e) {
    e.preventDefault();
    if (code.trim().length < 4) {
      setMsg("Enter the code you received.");
      return;
    }
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code.trim(),
      type: "sms",
    });
    setBusy(false);
    if (error) setMsg(error.message);
  }

  return (
    <div className="sa-form">
      <h1>{step === "enter" ? "Log in with mobile" : "Enter the code"}</h1>
      <p className="sub">
        {step === "enter"
          ? "We will send a one-time code to your mobile number."
          : `Type the code sent to ${e164}.`}
      </p>

      {step === "enter" ? (
        <form onSubmit={sendCode}>
          <label>Your name (only for a new account)</label>
          <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ravi Sharma" />
          <label>Mobile number</label>
          <input inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210" required />
          {msg && <p className="error">{msg}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Please wait..." : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <label>One-time code</label>
          <input inputMode="numeric" autoComplete="one-time-code" value={code}
            onChange={(e) => setCode(e.target.value)} placeholder="123456" required />
          {msg && <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>{msg}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Please wait..." : "Verify and log in"}
          </button>
          <p className="switch">
            <button className="link" type="button" disabled={wait > 0 || busy} onClick={sendCode}>
              {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
            </button>
            {" · "}
            <button className="link" type="button" onClick={() => { setStep("enter"); setMsg(""); }}>
              Change number
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
