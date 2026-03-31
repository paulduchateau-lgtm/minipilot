import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext({ theme: "dark", toggle: () => {} });

// Chart palettes aligned with litechange-tokens.css v2.0
// Order: lite → signal → warm → quaternary
const CHART_PALETTES = {
  dark: {
    // lite-400 → signal-300 → warm-300 → lite-600 (per DA v2.0)
    colors: ["#B0D838","#7AB4D4","#E08A68","#84A422","#E8C46A","#68B474","#7AB4D4","#B0D838"],
    tooltip: {
      background: "#2A2B27",
      border: "1px solid rgba(232,230,225,0.12)",
      borderRadius: 6,
      color: "#E8E6E1",
      fontSize: 12,
      fontFamily: "'IBM Plex Mono', monospace",
    },
    axis: { fill: "#6B7260", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" },
    grid: "rgba(232,230,225,0.05)",
    lite:    "#B0D838",   // lite-400 (NOT 300 neon)
    signal:  "#7AB4D4",   // signal-300
    warm:    "#E08A68",   // warm-300
    warning: "#E8C46A",   // warning-300
    success: "#68B474",   // success-300
    purple:  "#8B7EC8",
  },
  light: {
    // lite-700 → signal-500 → warm-500 → lite-300
    colors: ["#6B8A1A","#4A90B8","#C45A32","#C8FF3C","#D4A03A","#3A8A4A","#4A90B8","#6B8A1A"],
    tooltip: {
      background: "#FFFFFF",
      border: "1px solid #E0DDD6",
      borderRadius: 6,
      color: "#1C1D1A",
      fontSize: 12,
      fontFamily: "'IBM Plex Mono', monospace",
    },
    axis: { fill: "#A8A69E", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" },
    grid: "#E0DDD6",
    lite:    "#6B8A1A",   // lite-700
    signal:  "#4A90B8",   // signal-500
    warm:    "#C45A32",   // warm-500
    warning: "#D4A03A",   // warning-500
    success: "#3A8A4A",   // success-500
    purple:  "#6B5EB8",
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("mp-theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mp-theme", theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === "dark" ? "light" : "dark"), []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useChartTheme() {
  const { theme } = useTheme();
  return CHART_PALETTES[theme];
}
