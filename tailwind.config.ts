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

        // These always resolve — used for explicit overrides
        "dark-bg": "#03071a",
        "dark-surface": "#060f2e",
        "dark-card": "#0a1640",
        "dark-border": "#142466",
        "dark-text": "#dce8ff",
        "dark-dim": "#6b8fd4",
        "dark-muted": "#1a2f6e",
        "dark-blue": "#3d6fd4",
        "dark-accent": "#5b9fff",

        "light-bg": "#d6dff5",
        "light-surface": "#eef2fc",
        "light-card": "#ffffff",
        "light-border": "#a0b0dc",
        "light-text": "#06124a",
        "light-dim": "#3a54a0",
        "light-muted": "#c8d4ee",
        "light-blue": "#00167f",
        "light-accent": "#0035cc",

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
        theme: {
          bg: "var(--bg)",
          surface: "var(--surface)",
          card: "var(--card)",
          border: "var(--border)",
          text: "var(--text)",
          dim: "var(--dim)",
          muted: "var(--muted)",
          blue: "var(--blue)",
          accent: "var(--accent)",
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
