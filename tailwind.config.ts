import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        ink: "var(--text)",
        muted: "var(--text-muted)",
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
        },
        "brand-ink": "var(--brand-ink)",
        amber: {
          bg: "var(--amber-bg)",
          text: "var(--amber-text)",
        },
        danger: "var(--danger)",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-source-sans)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      fontSize: {
        base: "1.125rem",
        lg: "1.35rem",
        xl: "1.65rem",
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
