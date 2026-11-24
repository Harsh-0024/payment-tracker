import { setTheme, useTheme } from "./theme";

/* Chhota icon: Dashboard ke title ke paas lagao. floating dene par screen ke upar right mein tikta hai. */
export function ThemeIcon({ floating = false }) {
  const { dark } = useTheme();
  return (
    <button
      type="button"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle dark mode"
      onClick={() => setTheme(dark ? "light" : "dark")}
      style={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        border: dark ? "1px solid #334155" : "1px solid #cbd5e1",
        background: dark ? "#1e293b" : "rgba(255,255,255,0.9)",
        color: dark ? "#fbbf24" : "#002970",
        fontSize: 18,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        padding: 0,
        ...(floating ? { position: "fixed", top: 14, right: 16, zIndex: 900 } : {}),
      }}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

/* Settings: Profile page mein lagao */
export function ThemeSetting() {
  const { mode } = useTheme();
  const options = [
    ["light", "Light"],
    ["dark", "Dark"],
    ["system", "Auto"],
  ];
  return (
    <div className="card">
      <h3>Appearance</h3>
      <p className="sub" style={{ margin: "8px 0 12px" }}>
        Choose how SplitPay looks. Auto follows your phone or computer setting.
      </p>
      <div className="seg">
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mode === value ? "on" : ""}
            onClick={() => setTheme(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
