// apps/web/tailwind.config.mjs
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--cp)",
        secondary: "var(--cs)",
        dark: "#1a1a2e",
        dark2: "#2d2248",
        ivory: "#fdfaf7",
        warm: "#f4f0ec",
        muted: "#8a8499",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        body: ["Jost", "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "24px",
        sm: "14px",
        xs: "10px",
      },
      boxShadow: {
        card: "0 8px 48px rgba(26,26,46,0.08), 0 2px 12px rgba(26,26,46,0.04)",
        hover:
          "0 20px 64px rgba(26,26,46,0.13), 0 4px 20px rgba(26,26,46,0.07)",
      },
    },
  },
  plugins: [typography],
};
