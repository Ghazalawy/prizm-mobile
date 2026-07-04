/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./lib/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#E65100",
          50: "#FFF3E0",
          100: "#FFE0B2",
          200: "#FFCC80",
          300: "#FFB74D",
          400: "#FFA726",
          500: "#E65100",
          600: "#BF360C",
          700: "#A52D00",
          800: "#8C2600",
          900: "#631B00",
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
      spacing: {
        "compact-1": "4px",
        "compact-2": "8px",
        "compact-3": "12px",
        "compact-4": "16px",
      },
    },
  },
  plugins: [],
};
