import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Own file so recharts loads only when the chart is shown (App lazy-loads it).
import { rupee } from "./people";
// Neighbouring slices in clearly different hues: Card and UPI were two blues side by side.
const COLORS = ["#4a6cf7", "#f8a53a", "#14b8a6", "#ef6a8a", "#8b5cf6", "#3ccf6e", "#94a3b8"];

export default function SpendingChart({ entries }) {
  const [by, setBy] = useState("mode");

  // Entries with no payment mode (added from a group or the quick add) were filed under the key
  // "undefined", which the legend printed as is.
  const NO_MODE = "Mode not set";
  const totals = {};
  entries.forEach((e) => {
    const key = by === "mode" ? e.mode || NO_MODE : e.friend || "Unnamed";
    totals[key] = (totals[key] || 0) + Number(e.amount);
  });
  // Nothing has a mode yet: a single 100% slice says nothing, so say how to fill it in instead.
  const noModes = by === "mode" && entries.length > 0 && Object.keys(totals).every((k) => k === NO_MODE);
  // Biggest first, so the colours and the legend read in order of size.
  const data = Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <div className="card">
      <h3>Payment breakdown</h3>
      <div className="seg" style={{ marginTop: 12 }}>
        <button type="button" className={by === "mode" ? "on" : ""}
          onClick={() => setBy("mode")}>By payment mode</button>
        <button type="button" className={by === "friend" ? "on" : ""}
          onClick={() => setBy("friend")}>By friend</button>
      </div>

      {data.length === 0 ? (
        <p className="sub" style={{ marginTop: 16, display: "block" }}>Add payments to see the chart.</p>
      ) : noModes ? (
        <p className="sub" style={{ marginTop: 16, display: "block" }}>
          None of your payments says how it was paid yet. Choose UPI, Cash or Card under "Paid
          via" when you add or edit one, and this chart splits them up. "By friend" works already.
        </p>
      ) : (
        <div style={{ width: "100%", height: 320, marginTop: 8 }}>
          <ResponsiveContainer>
            {/* Room above and below the pie, so the outside % labels aren't cut by the buttons or
                run into the legend on a phone. */}
            <PieChart margin={{ top: 24, bottom: 12 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius="70%"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => rupee(v)} />
              {/* The amount beside each name: the slices alone gave no figures on a phone. */}
              <Legend formatter={(value, entry) => `${value} ${rupee(entry.payload.value)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
