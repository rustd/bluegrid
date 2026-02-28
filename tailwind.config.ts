import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: "#050e1a",
          900: "#0a1628",
          800: "#0d2137",
          700: "#112840",
          600: "#1a3a5c",
          500: "#1e4976",
          400: "#2563a8",
        },
        teal: {
          400: "#2dd4bf",
          300: "#5eead4",
        },
        kelp: {
          high: "#06d6a0",
          mid: "#ffd166",
          low: "#ef476f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "ocean-gradient": "linear-gradient(135deg, #050e1a 0%, #0a1628 50%, #0d2137 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
