/* Short dates for lists: "Today", "Yesterday", "Tomorrow", "24 Nov", or "24 Nov 2025" for another year. */

// "2026-11-24" is a calendar day: read it as local midnight, not UTC midnight
// (which is still the 23rd in places west of Greenwich).
const toDate = (x) => {
  if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)) {
    const [y, m, d] = x.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(x);
};

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function friendlyDate(x, now = new Date()) {
  const d = toDate(x);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.round((dayStart(now) - dayStart(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days === -1) return "Tomorrow";
  const opts = { day: "numeric", month: "short" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("en-IN", opts);
}

// The same, mid-sentence: "Due yesterday", "Due 1 Dec".
export const friendlyDateLower = (x, now) => {
  const s = friendlyDate(x, now);
  return /\d/.test(s) ? s : s.toLowerCase();
};
