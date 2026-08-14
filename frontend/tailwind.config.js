/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "deep-ink": "#130e30",
        "hi-yellow": "#ffe228",
        "moss-green": "#59e25d",
        fuchsia: "#e261e5",
        slate: "#5f5c6e",
        canvas: "#f9fbf2",
        "soft-meadow": "#eff2e5",
        charcoal: "#222222",
        onyx: "#000000",
      },
      fontFamily: {
        serif: [
          '"Hedvig Letters Serif"',
          "ui-serif",
          "Georgia",
          "Cambria",
          '"Times New Roman"',
          "Times",
          "serif",
        ],
        sans: [
          '"Inter"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        "3xl": "24px",
        pill: "1440px",
      },
      letterSpacing: {
        tightest: "-0.02em",
        tighter: "-0.01em",
      },
    },
  },
  plugins: [],
};

