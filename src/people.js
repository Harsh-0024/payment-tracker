/* Small helpers shared by the desktop and phone screens: money, a group's cover picture,
   and a person's avatar colour and initial. Kept apart from the components so Fast Refresh works. */
export const R = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
export const kindFor = (name, i) => {
  if (/trip|travel|goa|tour|hill|manali|buddies|tour/i.test(name)) return "mountain";
  if (/cafe|coffee|chai|food|dinner|lunch|crew/i.test(name)) return "cafe";
  if (/room|flat|rent|home|house|pg|mate/i.test(name)) return "room";
  return ["city", "mountain", "cafe", "room"][i % 4];
};
const HUES = ["#1d62f0", "#6a5cf0", "#0ea5a4", "#e0862b", "#d9467a"];
export const hue = (s) => HUES[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
export const ini = (s) => String(s || "?").trim().charAt(0).toUpperCase();
