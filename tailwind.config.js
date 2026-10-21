/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0c4ca3",
          navyDark: "#083778",
          navyLight: "#1d63b8",
          gold: "#e5a812",
          goldDark: "#b88308",
          goldLight: "#fbbf24",
          inflow: "#1e3e23",
          inflowLight: "#285430",
          outflow: "#6b102b",
          outflowLight: "#881337",
          // Backwards compatibility
          blue: "#0c4ca3",
          blueDark: "#083778",
          green: "#285430",
          greenDark: "#1e3e23",
          red: "#881337",
          redDark: "#6b102b",
        },
      },
    },
  },
  plugins: [],
};
