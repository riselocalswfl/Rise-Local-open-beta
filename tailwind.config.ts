import type { Config } from "tailwindcss";

export default {
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#7C9A67",
        secondary: "#E8C27E",
        accent: "#E37B40",
        bg: "#FDFBF7",
        text: "#2F2F2F",
      },
      fontFamily: {
        heading: ["Playfair Display", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 6px 20px rgba(0,0,0,.06)",
      },
      transitionDuration: {
        brand: "250ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
