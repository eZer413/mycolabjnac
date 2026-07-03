import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Low-eye-strain dark palette (greenish-charcoal), tuned for night lab work.
        ink: {
          900: "#0a0e0d",
          800: "#111716",
          700: "#1a2220",
          600: "#243230",
          500: "#33403d",
        },
        moss: {
          400: "#7dd3a8",
          500: "#4fb487",
          600: "#3a9770",
        },
        status: {
          clean: "#4fb487",
          contaminated: "#e0603a",
          fruited: "#7b9de0",
          discarded: "#6b7773",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
