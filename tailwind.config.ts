import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * shadcn/ui (new-york, zinc) + `hsl(var(--*))`.
 * 레거시 ping-ui 토큰(`ping/*`)은 기존 화면 호환용으로 유지.
 */
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        ping: "var(--radius-8)",
        "ping-lg": "var(--radius-16)",
        "ping-shell": "var(--radius-24)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        "code-inner": {
          DEFAULT: "hsl(var(--code-inner-bg))",
          foreground: "hsl(var(--code-inner-fg))",
        },
        "dongban-cyan": "#0097A9",
        "dongban-dark": "#41273B",
        "dongban-mint": "#6BBBAE",
        ping: {
          bg: "var(--ping-bg)",
          surface: "var(--ping-surface)",
          text: "var(--ping-text)",
          muted: "var(--ping-muted)",
          hint: "var(--ping-ui-text-hint)",
          primary: "var(--ping-primary)",
          "primary-dark": "var(--ping-primary-dark)",
          field: "var(--ping-field-fill)",
          tint: "var(--ping-tint-bg)",
          "tint-border": "var(--ping-tint-border)",
          /** `legacy-html/index.html` Tailwind CDN `ping` 팔레트(제목/본문/테두리 등) */
          title: "var(--ping-ui-text)",
          body: "var(--ping-ui-text-sub)",
          caption: "var(--ping-ui-text-hint)",
          canvas: "var(--ping-bg)",
          sub: "var(--ping-bg-sub)",
          line: "var(--ping-ui-muted-fill)",
        },
      },
      boxShadow: {
        "ping-xs": "var(--shadow-ping-xs)",
        "ping-sm": "var(--shadow-ping-sm)",
        shell: "var(--ping-shadow-shell)",
        float: "var(--ping-shadow-float)",
      },
      fontFamily: {
        sans: [
          "var(--font-ping-ui)",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        ping: [
          "var(--font-ping-ui)",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
