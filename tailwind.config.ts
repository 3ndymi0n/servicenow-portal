import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "Inter", "system-ui", "sans-serif"],
        mono: ["DM Mono", "JetBrains Mono", "monospace"],
      },
      colors: {
        brand: "#00167f",

        // Static named colours — kept for chart / inline-style overrides
        "dark-bg":      "#060b18",
        "dark-surface": "#0d1526",
        "dark-card":    "#141f36",
        "dark-border":  "#3c5891",
        "dark-text":    "#dce8ff",
        "dark-dim":     "#7898cc",
        "dark-muted":   "#1a2d4a",
        "dark-blue":    "#4d8ef0",
        "dark-accent":  "#79b8ff",

        "light-bg":      "#f8fafc",
        "light-surface": "#ffffff",
        "light-card":    "#ffffff",
        "light-border":  "#cbd5e1",
        "light-text":    "#0f172a",
        "light-dim":     "#64748b",
        "light-muted":   "#f1f5f9",
        "light-blue":    "#2563eb",
        "light-accent":  "#1d4ed8",

        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#3b82f6",
        purple: "#a855f7",
        teal: "#14b8a6",

        role: {
          admin: "#f59e0b",
          analyst: "#3b82f6",
          viewer: "#6b8fd4",
          employee: "#14b8a6",
        },

        // Theme-aware aliases via CSS variables (used in globals.css)
        // RGB channel format lets Tailwind opacity modifiers work: bg-theme-blue/20
        theme: {
          bg:      "rgb(var(--bg) / <alpha-value>)",
          surface: "rgb(var(--surface) / <alpha-value>)",
          card:    "rgb(var(--card) / <alpha-value>)",
          border:  "rgb(var(--border) / <alpha-value>)",
          text:    "rgb(var(--text) / <alpha-value>)",
          dim:     "rgb(var(--dim) / <alpha-value>)",
          muted:   "rgb(var(--muted) / <alpha-value>)",
          blue:    "rgb(var(--blue) / <alpha-value>)",
          accent:  "rgb(var(--accent) / <alpha-value>)",
        },
      },

      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.18)",
        nav: "0 2px 8px rgba(0,0,0,0.25)",
        modal: "0 24px 64px rgba(0,0,0,0.5)",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },

      animation: {
        "fade-in": "fadeIn 0.25s ease forwards",
        pulse: "pulse 1.5s ease infinite",
      },

      borderRadius: {
        card: "10px",
        modal: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
