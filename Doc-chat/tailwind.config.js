export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "light-base": "#FAFAF9",
        "light-surface": "#FFFFFF",
        "light-border": "#E7E5E2",

        "dark-base": "#0C0B0F",
        "dark-surface": "#15141A",
        "dark-border": "#27252E",

        accent: "#6D5CE7",
        "accent-hover": "#5B4BD6",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
}