import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
    "./lib/**/*.{ts,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        wxViolet700: "var(--wx-violet)",
        wxViolet500: "var(--wx-violet-soft)",
        wxMagenta500: "var(--wx-magenta)",
        wxPink500: "var(--wx-pink)",
        wxRed500: "var(--wx-red)",
        wxOrange500: "var(--wx-orange)",
        wxBlue500: "var(--wx-blue)",
        wxBlue300: "var(--wx-blue-soft)",
        wxGreen500: "var(--wx-green)",
        wxIndigo900: "var(--wx-text-primary)",
        wxIndigo700: "var(--wx-text-primary)",
        wxIndigo500: "var(--wx-text-secondary)",
        wxBg: "var(--wx-bg)",
        wxSurface: "var(--wx-surface)",
        wxSurfaceElevated: "var(--wx-surface-elevated)",
        wxSurfaceSoft: "var(--wx-surface-soft)",
        wxSurfaceBlush: "var(--wx-surface-blush)",
        wxBorder: "var(--wx-border)",
        wxMuted: "var(--wx-text-muted)",
        academicEmerald: "var(--wx-legacy-strong)",
        warmIvory: "var(--wx-surface)",
        mutedCopper: "var(--wx-violet)",
        softTeal: "var(--wx-blue)",
        paleSage: "var(--wx-surface-soft)",
        charcoalInk: "var(--wx-text-primary)",
        slateText: "var(--wx-text-secondary)",
        sageBorder: "var(--wx-border)",
        deepCrimson: "var(--wx-red)",
        academicGreen: "var(--wx-green)"
      },
      boxShadow: {
        soft: "0 18px 52px rgba(7, 31, 51, 0.10)",
        lift: "0 16px 34px rgba(7, 31, 51, 0.13)"
      },
      backgroundImage: {
        "premium-band":
          "radial-gradient(circle at 78% 18%, rgba(184,44,224,.25), transparent 32%), linear-gradient(135deg, #16133F 0%, #1C2775 55%, #3C16EA 100%)",
        "soft-band": "var(--wx-soft-band)",
        "brand-spectrum":
          "linear-gradient(100deg, #5516F2 0%, #8534ED 24%, #B42CE0 46%, #E83874 70%, #E72D35 86%, #FA6A3E 100%)",
        "action-spectrum":
          "linear-gradient(100deg, #4B12DC 0%, #7627DA 28%, #A824C8 50%, #D72D69 74%, #D84315 100%)",
        "hero-spectrum": "var(--wx-page-canvas)"
      }
    }
  },
  plugins: []
};

export default config;
