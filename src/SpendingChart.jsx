import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Own file so recharts loads only when the chart is shown (App lazy-loads it).
const rupee = (n) => "₹" + Number(n).toLocaleString("en-IN");
const COLORS = ["#4a6cf7", "#1aa0f6", "#f8a53a", "#3ccf6e", "#ef6a8a", "#14b8a6", "#8aa7ff"];

export default function SpendingChart({ entries }) {
  const [by, setBy] = useState("mode");

  const totals = {};
  entries.forEach((e) => {
    const key = by === "mode" ? e.mode : e.friend;
    totals[key] = (totals[key] || 0) + Number(e.amount);
  });
  const data = Object.entries(totals).map(([name, value]) => ({ name, value }));

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
      ) : (
        <div style={{ width: "100%", height: 320, marginTop: 8 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={110}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => rupee(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
