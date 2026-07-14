export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#4C6EF5",
          hover: "#3D5BD7",
          light: "#EAF0FF",
          dark: "#14213D",
        },
        "light-base": "#F5F5F4",
        "light-surface": "#FCFCFB",
        "light-border": "#E7E5E4",
        "dark-base": "#0F1115",
        "dark-surface": "#171A21",
        "dark-border": "#2B313D",
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