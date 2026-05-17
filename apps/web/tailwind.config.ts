import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Slate refinada para texto e bordas
        slate: {
          25: "#FCFDFE",
          50: "#F8FAFC",
          100: "#F1F5F9",
          150: "#E8EEF5",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
        // Brand: azul vibrante mais saturado para CTAs altamente visíveis
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
        // Mantém navy para compat com componentes existentes (alias para slate)
        navy: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        danger: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ["var(--font-inter)", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      backgroundImage: {
        "grid-slate":
          "linear-gradient(to right, rgb(241 245 249 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(241 245 249 / 0.6) 1px, transparent 1px)",
        "brand-gradient":
          "linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #1E40AF 100%)",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.18), transparent 70%)",
      },
      boxShadow: {
        "xs": "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        "sm": "0 1px 2px 0 rgba(15, 23, 42, 0.06)",
        "md": "0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)",
        "lg": "0 12px 24px -8px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.06)",
        "xl": "0 24px 48px -16px rgba(15, 23, 42, 0.16)",
        "brand": "0 4px 14px 0 rgba(37, 99, 235, 0.35)",
        "brand-lg": "0 10px 28px -4px rgba(37, 99, 235, 0.4)",
        "ring": "0 0 0 4px rgba(59, 130, 246, 0.12)",
        "inner-soft": "inset 0 0 0 1px rgba(15, 23, 42, 0.04)",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        md: "0.5rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
