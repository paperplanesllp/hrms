/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* PREMIUM PROFESSIONAL PALETTE */
        brand: {
          dark: "#020617",           // Richer deep navy (Dark Mode background)
          card: "#0f172a",           // Surface color for cards in dark mode
          accent: "#F59E0B",         // Electric Gold - Primary action & highlights
          "accent-alt": "#10B981",   // Emerald - Secondary accent
          pale: "#FFFFFF",           // White - Light mode background
          light: "#F9FAFB",          // Minimal light gray
        },
        /* Semantic Status Colors */
        "slate": {
          50: "#F9FAFB",
          100: "#F3F4F6",
          150: "#F1F5F9",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      fontSize: {
        "heading-xl": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "700", letterSpacing: "-0.02em" }],
        "heading-lg": ["1.5rem", { lineHeight: "1.875rem", fontWeight: "600", letterSpacing: "-0.01em" }],
        "heading-md": ["1.25rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        "body-base": ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "body-xs": ["0.75rem", { lineHeight: "1.5", fontWeight: "500" }],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        none: "none",
        xs: "0 1px 2px 0 rgba(2, 6, 23, 0.05)",
        sm: "0 2px 4px 0 rgba(2, 6, 23, 0.08)",
        md: "0 4px 8px -1px rgba(2, 6, 23, 0.12)",
        lg: "0 8px 16px -2px rgba(2, 6, 23, 0.15), 0 4px 8px -1px rgba(2, 6, 23, 0.08)",
        xl: "0 16px 32px -4px rgba(2, 6, 23, 0.2), 0 8px 16px -2px rgba(2, 6, 23, 0.1)",
        "2xl": "0 24px 48px -8px rgba(2, 6, 23, 0.25)",
        "accent-glow": "0 0 20px -4px rgba(245, 158, 11, 0.4), 0 0 8px -2px rgba(245, 158, 11, 0.2)",
        "accent-alt-glow": "0 0 20px -4px rgba(16, 185, 129, 0.3), 0 0 8px -2px rgba(16, 185, 129, 0.15)",
        "elevation-1": "0 4px 12px rgba(2, 6, 23, 0.1)",
        "elevation-2": "0 8px 24px rgba(2, 6, 23, 0.15)",
        "elevation-3": "0 16px 40px rgba(2, 6, 23, 0.2)",
      },
      spacing: {
        grid: "0.5rem",  // 8px
        xs: "0.25rem",
        sm: "0.5rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "2.5rem",
        "3xl": "3rem",
      },
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
        "smooth-in": "cubic-bezier(0.4, 0, 1, 1)",
        "smooth-out": "cubic-bezier(0, 0, 0.2, 1)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
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
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.glass': {
          'backdrop-filter': 'blur(12px)',
          'background-color': 'rgba(2, 6, 23, 0.65)',
          'border': '1px solid rgba(245, 158, 11, 0.1)',
        },
        '.glass-light': {
          'backdrop-filter': 'blur(12px)',
          'background-color': 'rgba(255, 255, 255, 0.8)',
          'border': '1px solid rgba(226, 232, 240, 0.5)',
        },
        '.glass-dark': {
          'backdrop-filter': 'blur(12px)',
          'background-color': 'rgba(15, 23, 42, 0.8)',
          'border': '1px solid rgba(245, 158, 11, 0.15)',
        },
      });
    },
  ],
};

