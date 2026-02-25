import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#13EC5B",
        "primary-dark": "#0fc44c",
        surface: "#0B120E",
        card: "#14221A",
        border: "#213428",
        "bg-main": "#020403",
        "bg-alt": "#080c0a",
        "bg-section": "#0f1c15",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-slow": "bounce 3s infinite",
        shimmer: "shimmer 2s infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        primary: "0 0 20px rgba(19,236,91,0.3)",
        "primary-sm": "0 0 15px rgba(19,236,91,0.4)",
        "card-hover": "0 8px 30px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
