/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: "#080c14",
          card: "rgba(13, 20, 35, 0.6)",
          cardBorder: "rgba(0, 240, 255, 0.15)",
          blue: "#00f0ff",
          green: "#00ff66",
          purple: "#bd00ff",
          red: "#ff0055",
          orange: "#ffaa00",
          gray: "#1c2638",
        }
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 15px rgba(0, 240, 255, 0.4)",
        glowGreen: "0 0 15px rgba(0, 255, 102, 0.4)",
        glowRed: "0 0 15px rgba(255, 0, 85, 0.4)",
        glowPurple: "0 0 15px rgba(189, 0, 255, 0.4)",
        innerGlow: "inset 0 0 15px rgba(0, 240, 255, 0.2)",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'orbit': 'orbit 20s linear infinite',
      },
      keyframes: {
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(10px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(10px) rotate(-360deg)' },
        }
      }
    },
  },
  plugins: [],
}
