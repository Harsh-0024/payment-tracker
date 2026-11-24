import { useState, useEffect } from "react";
import { ThemeSetting } from "./ThemeToggle";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "./supabaseClient";
import { openWhatsApp, syncUpi } from "./reminder";
   import DeleteAccount from "./DeleteAccount";
   import PhoneCard from "./PhoneCard";
   import { resizeImage } from "./imageTools";

export default function ProfilePage({ session, profiles }) {
  const uid = session.user.id;
  const me = profiles.find((p) => p.id === uid);
  const code = me ? me.friend_code : "";

  const [name, setName] = useState(session.user.user_metadata?.name || "");
  const [email, setEmail] = useState(session.user.email || "");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");
  const [qrMode, setQrMode] = useState("generated");
  const [qrPath, setQrPath] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [msg, setMsg] = useState({});
  const [copied, setCopied] = useState(false);

  const flash = (key, text) => setMsg((m) => ({ ...m, [key]: text }));

  async function signedUrl(bucket, path) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    return data ? data.signedUrl : "";
  }

  async function saveDetails(fields) {
    const { error } = await supabase
      .from("profile_details")
      .upsert({ user_id: uid, ...fields, updated_at: new Date().toISOString() });
    if (!error) await syncUpi();
    return error;
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profile_details")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      const d = data || {};
      setUpiId(d.upi_id || localStorage.getItem("upiId") || "");
      setUpiName(d.upi_name || localStorage.getItem("upiName") || "");
      setQrMode(d.qr_mode || "generated");
      setQrPath(d.qr_path || "");
      if (d.avatar_path) setAvatarUrl(await signedUrl("avatars", d.avatar_path));
      if (d.qr_path) setQrUrl(await signedUrl("qr", d.qr_path));
    })();
  }, [uid]);

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const blob = await resizeImage(file, 400, "image/jpeg", 0.85);
      const path = `${uid}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const err = await saveDetails({ avatar_path: path });
      if (err) throw err;
      setAvatarUrl(await signedUrl("avatars", path));
      flash("photo", "Photo updated ✅");
    } catch (err) {
      flash("photo", err.message);
    }
  }

  async function uploadQR(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const blob = await resizeImage(file, 900, "image/png", 1);
      const path = `${uid}/qr.png`;
      const { error: upErr } = await supabase.storage
        .from("qr")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;
      const err = await saveDetails({ qr_path: path, qr_mode: "image" });
      if (err) throw err;
      setQrPath(path);
      setQrMode("image");
      setQrUrl(await signedUrl("qr", path));
      flash("pay", "QR image uploaded ✅");
    } catch (err) {
      flash("pay", err.message);
    }
  }

  async function savePayment(e) {
    e.preventDefault();
    const id = upiId.trim();
    if (!/^[\w.-]{2,}@[A-Za-z]{2,}$/.test(id)) {
      flash("pay", "Enter a valid UPI ID, like name@bank");
      return;
    }
    if (qrMode === "image" && !qrPath) {
      flash("pay", "Upload your QR image first, or choose 'Generate from my UPI ID'.");
      return;
    }
    const err = await saveDetails({
      upi_id: id,
      upi_name: upiName.trim() || name,
      qr_mode: qrMode,
    });
    flash("pay", err ? err.message : "Payment details saved ✅");
  }

  async function saveName(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      flash("acct", "Name can't be empty.");
      return;
    }
    const r1 = await supabase.auth.updateUser({ data: { name: n } });
    const r2 = await supabase.rpc("update_my_name", { p_name: n });
    const err = r1.error || r2.error;
    flash("acct", err ? err.message : "Name updated ✅");
  }

  async function saveEmail(e) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    flash(
      "email",
      error ? error.message : "Check your inbox to confirm the new email address."
    );
  }

  async function savePassword(e) {
    e.preventDefault();
    if (newPw.length < 6) {
      flash("pw", "Password must be at least 6 characters.");
      return;
    }
    if (newPw !== newPw2) {
      flash("pw", "The two passwords don't match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (!error) {
      setNewPw("");
      setNewPw2("");
    }
    flash("pw", error ? error.message : "Password changed ✅");
  }

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function share() {
    openWhatsApp(
      null,
      `Add me on SplitPay! My ID is ${code}. Open Friends and paste my ID.`
    );
  }

  const link = upiId
    ? "upi://pay?pa=" + encodeURIComponent(upiId.trim()) +
      "&pn=" + encodeURIComponent(upiName || name) +
      "&cu=INR"
    : "";

  const note = (key) =>
    msg[key] ? (
      <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>{msg[key]}</p>
    ) : null;

  return (
    <>
      <h1>Profile</h1>
      <ThemeSetting />
      <p className="sub">Manage your account, payment details and QR code.</p>

      <div className="card">
        <h3>Profile photo</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
          {avatarUrl ? (
            <img className="avatar" src={avatarUrl} alt="Profile" />
          ) : (
            <div className="avatar">{(name || "?").charAt(0).toUpperCase()}</div>
          )}
          <label className="ghost" style={{ display: "inline-block", margin: 0, cursor: "pointer" }}>
            Upload photo
            <input type="file" accept="image/*" hidden onChange={uploadPhoto} />
          </label>
        </div>
        {note("photo")}
      </div>

      <div className="card">
        <h3>Account</h3>

        <form onSubmit={saveName}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <button className="primary" type="submit" style={{ marginTop: 16 }}>Save name</button>
        </form>
        {note("acct")}

        <form onSubmit={saveEmail}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="primary" type="submit" style={{ marginTop: 16 }}>Change email</button>
        </form>
        {note("email")}

        <form onSubmit={savePassword}>
          <label>New password</label>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <label>Confirm new password</label>
          <input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
          <button className="primary" type="submit" style={{ marginTop: 16 }}>Change password</button>
        </form>
        {note("pw")}
      </div>

         <PhoneCard session={session} />
      <form className="card" onSubmit={savePayment}>
        <h3>Payment details and QR</h3>
        <label>UPI ID</label>
        <input value={upiId} onChange={(e) => setUpiId(e.target.value)}
          placeholder="yourname@okhdfcbank" />
        <label>Name shown on the QR</label>
        <input value={upiName} onChange={(e) => setUpiName(e.target.value)}
          placeholder={name || "Your name"} />

        <label>Which QR should reminders use?</label>
        <div className="seg">
          <button type="button" className={qrMode === "generated" ? "on" : ""}
            onClick={() => setQrMode("generated")}>Generate from my UPI ID</button>
          <button type="button" className={qrMode === "image" ? "on" : ""}
            onClick={() => setQrMode("image")}>Use my own QR image</button>
        </div>

        {qrMode === "image" && (
          <div style={{ marginTop: 14 }}>
            <p className="sub" style={{ marginBottom: 10 }}>
              Save your QR from Google Pay or Paytm as an image, then upload it here.
            </p>
            <label className="ghost" style={{ display: "inline-block", margin: 0, cursor: "pointer" }}>
              Upload QR image
              <input type="file" accept="image/*" hidden onChange={uploadQR} />
            </label>
          </div>
        )}

        <div className="qr-box">
          {qrMode === "image" && qrUrl ? (
            <img src={qrUrl} alt="My payment QR" width={200} />
          ) : link ? (
            <QRCodeSVG value={link} size={180} />
          ) : (
            <span className="sub">Enter your UPI ID to see the QR</span>
          )}
        </div>

        <button className="primary" type="submit">Save payment details</button>
        {note("pay")}
      </form>

      <div className="card">
        <h3>Your SplitPay ID</h3>
        <p className="sub" style={{ margin: "8px 0 0" }}>
          Share this with friends so they can connect with you.
        </p>
        <div className="idbox">{code || "..."}</div>
           {code && <div className="qr-box"><QRCodeSVG value={"SPLITPAY:" + code} size={160} /></div>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="small" onClick={copy} disabled={!code}>
            {copied ? "Copied!" : "Copy ID"}
          </button>
          <button className="ghost" onClick={share} disabled={!code}>
            Share on WhatsApp
          </button>
        </div>
      </div>

         <DeleteAccount session={session} />
      <button className="ghost" style={{ marginTop: 24 }}
        onClick={() => supabase.auth.signOut()}>
        Log out
      </button>
    </>
  );
}