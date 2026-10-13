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
          blue: "#1d4ed8",
          blueDark: "#1e40af",
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
