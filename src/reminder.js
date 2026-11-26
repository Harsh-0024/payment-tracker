import { supabase } from "./supabaseClient";

const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");
const sum = (list) => list.reduce((s, e) => s + Number(e.amount), 0);
const fmtDate = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const UPI_KEYS = ["upiId", "upiName", "qrMode", "qrPath"];

export function getUpi() {
  return {
    id: localStorage.getItem("upiId") || "",
    name: localStorage.getItem("upiName") || "",
  };
}

// Copies your saved payment details from the database into this browser
export async function syncUpi() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase
      .from("profile_details")
      .select("upi_id, upi_name, qr_mode, qr_path")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error || !data) return;
    const put = (k, v) => (v ? localStorage.setItem(k, v) : localStorage.removeItem(k));
    put("upiId", data.upi_id);
    put("upiName", data.upi_name);
    put("qrMode", data.qr_mode);
    put("qrPath", data.qr_path);
  } catch {
    // ignore
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (!session) {
    UPI_KEYS.forEach((k) => localStorage.removeItem(k));
  } else if (["INITIAL_SESSION", "SIGNED_IN", "USER_UPDATED"].includes(event)) {
    // setTimeout avoids calling Supabase directly inside this callback
    setTimeout(syncUpi, 0);
  }
});

export function cleanPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return d;
}

export function buildMessage({ friend, entries, entry, myName }) {
  const mine = entries.filter((e) => e.friend === friend && e.paid_by === "me");
  const pendingMine = mine.filter((e) => e.status !== "Settled");
  const theyPaid = sum(
    entries.filter(
      (e) => e.friend === friend && e.paid_by === "friend" && e.status !== "Settled"
    )
  );

  const total = sum(mine);
  const received = sum(mine.filter((e) => e.status === "Settled"));
  const pending = sum(pendingMine);
  const net = pending - theyPaid;

  const dues = pendingMine.map((e) => e.due_date).filter(Boolean).sort();
  const due = (entry && entry.due_date) || dues[0];

  const upi = getUpi();
  const lines = [
    `Hi ${friend}! 👋`,
    `Payment reminder from ${myName || "me"}.`,
    "",
    `💸 Total I paid for you: ${rupee(total)}`,
    `✅ Already received: ${rupee(received)}`,
    `⏳ Not paid yet: ${rupee(pending)}`,
  ];

  if (theyPaid > 0) {
    // When what they paid for me covers what they owe, "Net amount to pay: ₹0" asked them to pay
    // nothing in a message asking them to pay; say who owes whom instead.
    const settle = Math.round(net * 100) / 100;
    lines.push(
      `🔁 You paid for me: ${rupee(theyPaid)}`,
      settle > 0
        ? `👉 Net amount to pay: ${rupee(settle)}`
        : settle === 0
          ? "👉 That evens out: nothing to pay."
          : `👉 After that, I owe you ${rupee(-settle)}.`
    );
  }
  if (entry) {
    lines.push(
      "",
      `🧾 Latest: ${rupee(entry.amount)}${entry.note ? " for " + entry.note : ""}`
    );
  }
  if (due) lines.push(`📅 Please pay by: ${fmtDate(due)}`);
  if (upi.id) {
    lines.push("", `Pay via UPI: ${upi.id}`, "My payment QR is in the next message 👇");
  }
  return lines.join("\n");
}

export function openWhatsApp(phone, text) {
  const p = cleanPhone(phone);
  const base = p ? "https://wa.me/" + p : "https://wa.me/";
  window.open(base + "?text=" + encodeURIComponent(text), "_blank");
}

export async function shareQR(upiId, upiName) {
  let blob = null;

  // Use the QR image you uploaded (Google Pay / Paytm), if you chose that
  const qrPath = localStorage.getItem("qrPath");
  if (localStorage.getItem("qrMode") === "image" && qrPath) {
    const { data } = await supabase.storage.from("qr").download(qrPath);
    if (data) blob = data;
  }

  // Otherwise generate a standard UPI QR from your UPI ID
  if (!blob) {
    const link =
      "upi://pay?pa=" + encodeURIComponent(upiId) +
      "&pn=" + encodeURIComponent(upiName) +
      "&cu=INR";
    const { default: QRCode } = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(link, { width: 600, margin: 2 });
    blob = await (await fetch(dataUrl)).blob();
  }

  const file = new File([blob], "payment-qr.png", { type: blob.type || "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "Payment QR" });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payment-qr.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}