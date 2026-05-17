import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada no logo Refidim (navy + azul gradiente)
        navy: {
          50: "#F1F5FB",
          100: "#DDE6F4",
          200: "#B6C8E5",
          300: "#7E99CC",
          400: "#4D6AAA",
          500: "#2A4685",
          600: "#1A3267",
          700: "#142654",
          800: "#0F1B3D",
          900: "#0A1330",
          950: "#060C20",
        },
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#172554",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #60A5FA 0%, #2563EB 50%, #0F1B3D 100%)",
        "soft-radial":
          "radial-gradient(circle at 30% 20%, rgba(96, 165, 250, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(37, 99, 235, 0.1), transparent 50%)",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(15, 27, 61, 0.04), 0 4px 12px -2px rgba(15, 27, 61, 0.06)",
        elevated:
          "0 1px 2px 0 rgba(15, 27, 61, 0.04), 0 8px 24px -6px rgba(15, 27, 61, 0.12)",
        brand: "0 8px 24px -8px rgba(37, 99, 235, 0.5)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
