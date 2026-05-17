import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"Space Grotesk"', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        category: {
          tutorials: "hsl(var(--category-tutorials))",
          recipes: "hsl(var(--category-recipes))",
          education: "hsl(var(--category-education))",
          memes: "hsl(var(--category-memes))",
          music: "hsl(var(--category-music))",
          culture: "hsl(var(--category-culture))",
        },
      },
      borderRadius: {
        none: "0px",
        sm: "calc(var(--radius) - 8px)",
        DEFAULT: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 6px)",
        "2xl": "calc(var(--radius) + 12px)",
        "3xl": "calc(var(--radius) + 20px)",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 8px 24px rgba(15, 23, 42, 0.08)",
        md: "0 16px 40px rgba(15, 23, 42, 0.12)",
        lg: "0 24px 70px rgba(15, 23, 42, 0.16)",
        xl: "0 32px 90px rgba(15, 23, 42, 0.22)",
        "ambient": "0 30px 90px rgba(16, 185, 129, 0.16), 0 14px 50px rgba(59, 130, 246, 0.12)",
        "glow": "0 0 0 1px rgba(239, 255, 0, 0.24), 0 24px 80px rgba(239, 255, 0, 0.16)",
        "sm-dark": "0 8px 24px rgba(0, 0, 0, 0.32)",
        "md-dark": "0 16px 44px rgba(0, 0, 0, 0.38)",
        "lg-dark": "0 28px 80px rgba(0, 0, 0, 0.48)",
        "xl-dark": "0 36px 110px rgba(0, 0, 0, 0.6)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        pop: {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "50%": { transform: "translateY(-8px) scale(1.18)", opacity: "1" },
          "100%": { transform: "translateY(-14px) scale(0.98)", opacity: "0" },
        },
        "ambient-pan": {
          "0%, 100%": { transform: "translate3d(-2%, -1%, 0) scale(1)" },
          "50%": { transform: "translate3d(2%, 1%, 0) scale(1.04)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        pop: "pop 700ms ease-out both",
        "ambient-pan": "ambient-pan 16s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
