async function decode(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall back to the <img> method below
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function resizeImage(file, max, type, quality) {
  const name = (file.name || "").toLowerCase();
  if (/image\/hei[cf]/.test(file.type) || /\.(heic|heif)$/.test(name)) {
    throw new Error(
      "HEIC photos can't be read by the browser. Export it as JPG or PNG first (or take a screenshot), then upload."
    );
  }

  let img;
  try {
    img = await decode(file);
  } catch (e) {
    throw new Error(
      `Could not read ${file.name || "this file"} (${file.type || "unknown type"}). Try a JPG or PNG image.`,
      { cause: e }
    );
  }

  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  const scale = Math.min(1, max / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  if (img.close) img.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) {
    throw new Error("Could not process this image. Try a smaller JPG or PNG.");
  }
  return blob;
}