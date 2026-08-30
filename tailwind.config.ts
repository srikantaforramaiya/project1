import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        surface: "#0B0E11",
        "surface-elevated": "#111318",
        border: "#1C2027",
        "text-primary": "#F4F6F8",
        "text-secondary": "#9AA3AE",
        primary: { DEFAULT: "#A3FF12", foreground: "#0A0F00" },
        accent: "#00F5D4",
        success: "#4ADE80",
        warning: "#FBBF24",
        danger: "#FF5470"
      },
      boxShadow: {
        "neon-sm": "0 0 8px rgba(163,255,18,0.25)",
        neon: "0 0 20px rgba(163,255,18,0.35)",
        "neon-lg": "0 0 45px rgba(163,255,18,0.4)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pop": { "0%": { transform: "scale(0.9)" }, "60%": { transform: "scale(1.08)" }, "100%": { transform: "scale(1)" } }
      },
      animation: {
        "fade-in": "fade-in 0.35s ease both",
        pop: "pop 0.3s ease"
      }
    }
  },
  plugins: []
};
export default config;
