import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import { supabase } from "./supabaseClient";

const PREFIX = "SPLITPAY:";

export default function FriendScan({ profiles, myId, reload, setError }) {
  const me = profiles.find((p) => p.id === myId);
  const code = me ? me.friend_code : "";
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleText(text) {
    const t = String(text).trim();
    if (!t.startsWith(PREFIX)) {
      setStatus(
        "That QR code is not a SplitPay friend QR. Ask your friend to show the QR from their Profile or Friends page."
      );
      return;
    }
    const scanned = t.slice(PREFIX.length).trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(scanned)) {
      setStatus("This SplitPay QR looks invalid.");
      return;
    }
    if (scanned === code) {
      setStatus("That is your own QR code.");
      return;
    }
    setBusy(true);
    setStatus("Sending request...");
    const { data, error } = await supabase.rpc("send_friend_request", {
      p_code: scanned,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      setStatus("");
      return;
    }
    setError("");
    setStatus(data);
    reload();
  }

  useEffect(() => {
    if (!scanning) return;
    let stopped = false;
    let stream = null;
    let raf = null;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        const tick = () => {
          if (stopped) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
            const scale = Math.min(1, 640 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(img.data, img.width, img.height);
            if (result && result.data) {
              stopped = true;
              setScanning(false);
              handleText(result.data);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setScanning(false);
        setStatus(
          "Could not open the camera. Allow camera access for this site, or use 'Scan from image'."
        );
      }
    })();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  async function scanImage(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(img.data, img.width, img.height);
      if (!result) {
        setStatus("No QR code found in that image.");
        return;
      }
      handleText(result.data);
    } catch {
      setStatus("Could not read that image. Try a PNG or JPG screenshot.");
    }
  }

  return (
    <div className="card">
      <h3>Show or scan a friend QR</h3>
      <p className="sub" style={{ margin: "8px 0 0" }}>
        Show your QR to a friend, or scan theirs to send a friend request.
      </p>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <div className="qr-box" style={{ marginTop: 0 }}>
          {code ? (
            <QRCodeSVG value={PREFIX + code} size={150} />
          ) : (
            <span className="sub">Loading...</span>
          )}
        </div>
        <div>
          <div className="entry-meta">Your ID</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>{code || "..."}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        {!scanning ? (
          <button className="small" type="button" disabled={busy}
            onClick={() => { setStatus(""); setScanning(true); }}>
            Scan with camera
          </button>
        ) : (
          <button className="ghost" type="button" onClick={() => setScanning(false)}>
            Stop camera
          </button>
        )}
        <label className="ghost" style={{ display: "inline-block", margin: 0, cursor: "pointer" }}>
          Scan from image
          <input type="file" accept="image/*" hidden onChange={scanImage} />
        </label>
      </div>

      {scanning && (
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", maxWidth: 360, borderRadius: 16, marginTop: 16, background: "#000" }}
        />
      )}

      {status && (
        <p className="sub" style={{ marginTop: 12, marginBottom: 0 }}>{status}</p>
      )}
    </div>
  );
}