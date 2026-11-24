import { useState, useEffect } from "react";
import "./dark.css";

const KEY = "splitpay-theme"; // "light" | "dark" | "system"

function read() {
  try {
    return localStorage.getItem(KEY) || "light";
  } catch {
    return "light";
  }
}

function resolve(mode) {
  if (mode === "system") {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function apply(mode) {
  document.documentElement.setAttribute("data-theme", resolve(mode));
}

export function setTheme(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // storage blocked: theme still changes for this visit
  }
  apply(mode);
  window.dispatchEvent(new Event("splitpay-theme"));
}

// App kholte hi saved theme lag jaye (main.jsx mein import karne par chalta hai)
apply(read());

export function useTheme() {
  const [mode, setMode] = useState(read());

  useEffect(() => {
    const on = () => setMode(read());
    window.addEventListener("splitpay-theme", on);
    return () => window.removeEventListener("splitpay-theme", on);
  }, []);

  useEffect(() => {
    if (mode !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => apply("system");
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [mode]);

  return { mode, dark: resolve(mode) === "dark" };
}
