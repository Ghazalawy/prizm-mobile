/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./lib/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0284C7",
          50: "#E6F4FE",
          100: "#BAE0FC",
          200: "#7CC5F9",
          300: "#3DAAF5",
          400: "#0A91EA",
          500: "#0284C7",
          600: "#026DA3",
          700: "#01567F",
          800: "#013F5C",
          900: "#002838",
        },
        foreground: "#0F172A",
        muted: "#64748B",
        surface: {
          DEFAULT: "#F8FAFC",
          2: "#F1F5F9",
        },
        card: "#FFFFFF",
        success: "#16A34A",
        warning: "#F59E0B",
        destructive: "#EF4444",
      },
    },
  },
  plugins: [],
};
