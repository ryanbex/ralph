import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Simpsons-inspired color palette
      colors: {
        simpson: {
          yellow: "#FFD90F",
          blue: "#70D1FE",
          green: "#D6E69F",
          red: "#F14C38",
          brown: "#8B5E34",
          white: "#FFFFFF",
          dark: "#1a1a2e",
        },
        // shadcn/ui semantic colors
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
      },
      // Pixel art fonts
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        "pixel-body": ['"VT323"', "monospace"],
      },
      // 8-bit shadow effects
      boxShadow: {
        pixel: "4px 4px 0px #8B5E34",
        "pixel-hover": "2px 2px 0px #8B5E34",
        "pixel-active": "0px 0px 0px #8B5E34",
        "pixel-yellow": "4px 4px 0px #FFD90F",
        "pixel-inset": "inset 4px 4px 0px rgba(0,0,0,0.2)",
      },
      // Pixel border widths
      borderWidth: {
        pixel: "4px",
      },
      // Retro border radius (none for true pixel look)
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        pixel: "0px",
      },
      // Animation keyframes for 8-bit effects
      keyframes: {
        "pixel-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "pixel-blink": {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
        "pixel-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
      },
      animation: {
        "pixel-bounce": "pixel-bounce 0.5s ease-in-out infinite",
        "pixel-blink": "pixel-blink 1s step-end infinite",
        "pixel-shake": "pixel-shake 0.3s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
