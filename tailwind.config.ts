import type { Config } from "tailwindcss";

// ─── Typography Scale ─────────────────────────────────────────────────────────
// แก้ที่นี่ที่เดียว → effect ทั้ง project
// ใช้ใน JSX: className="text-page-title"  หรือ className="text-body"
//
// ┌─────────────────┬──────────┬──────────┬─────────────────────────────────┐
// │ Token           │ rem      │ px       │ ใช้กับ                          │
// ├─────────────────┼──────────┼──────────┼─────────────────────────────────┤
// │ text-display    │ 2rem     │ 32px     │ ตัวเลขสถิติขนาดใหญ่, hero       │
// │ text-page-title │ 1.625rem │ 26px     │ ชื่อหน้า (h1)                   │
// │ text-section    │ 1.25rem  │ 20px     │ หัวข้อ section (h2)             │
// │ text-heading    │ 1.0625rem│ 17px     │ หัวข้อ card/widget (h3)         │
// │ text-subheading │ 0.9375rem│ 15px     │ หัวข้อรอง, label กลุ่ม (h4)     │
// │ text-body       │ 0.9375rem│ 15px     │ เนื้อหาทั่วไป                   │
// │ text-description│ 0.875rem │ 14px     │ คำอธิบาย, secondary text        │
// │ text-label      │ 0.8125rem│ 13px     │ label form, header ตาราง        │
// │ text-caption    │ 0.75rem  │ 12px     │ timestamp, metadata, hint       │
// └─────────────────┴──────────┴──────────┴─────────────────────────────────┘

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    // ── fontSize อยู่ที่ theme.fontSize (ไม่ใช่ extend) เพื่อ override default Tailwind ──
    // แก้ที่นี่ที่เดียว → text-xs / text-sm / text-xl ฯลฯ ทั้ง project เปลี่ยน
    //
    // ┌──────────┬──────────┬──────────┐
    // │ Class    │ เดิม     │ ใหม่     │
    // ├──────────┼──────────┼──────────┤
    // │ text-xs  │ 12px     │ 14px     │  table header, caption, badge
    // │ text-sm  │ 14px     │ 16px     │  body text ทั่วไป, description
    // │ text-base│ 16px     │ 18px     │  body เน้น
    // │ text-lg  │ 18px     │ 20px     │  subheading, card label
    // │ text-xl  │ 20px     │ 24px     │  page title (h2)
    // │ text-2xl │ 24px     │ 28px     │  section title
    // │ text-3xl │ 30px     │ 36px     │  stat number, display
    // │ text-4xl │ 36px     │ 44px     │  hero stat
    // └──────────┴──────────┴──────────┘
    fontSize: {
      // ── Override default sizes ──────────────────────────────────────────────
      "xs":   ["1rem",      { lineHeight: "1.4" }],
      "sm":   ["1.125rem",  { lineHeight: "1.5" }],
      "base": ["1.25rem",   { lineHeight: "1.6" }],
      "lg":   ["1.5rem",    { lineHeight: "1.5" }],
      "xl":   ["1.75rem",   { lineHeight: "1.4" }],
      "2xl":  ["2rem",      { lineHeight: "1.3" }],
      "3xl":  ["2.5rem",    { lineHeight: "1.25" }],
      "4xl":  ["3rem",      { lineHeight: "1.2"  }],
      "5xl":  ["3.5rem",    { lineHeight: "1.1"  }],
      "6xl":  ["4rem",      { lineHeight: "1"    }],

      // ── Semantic tokens (สำหรับ component ใหม่) ──────────────────────────────
      "display":    ["2.75rem",  { lineHeight: "1.15", fontWeight: "700", letterSpacing: "-0.02em" }],
      "page-title": ["2.25rem",  { lineHeight: "1.25", fontWeight: "700", letterSpacing: "-0.01em" }],
      "section":    ["1.75rem",  { lineHeight: "1.3",  fontWeight: "600" }],
      "heading":    ["1.5rem",   { lineHeight: "1.35", fontWeight: "600" }],
      "subheading": ["1.25rem",  { lineHeight: "1.4",  fontWeight: "600" }],
      "body":       ["1.125rem", { lineHeight: "1.65" }],
      "description":["1rem",     { lineHeight: "1.6"  }],
      "label":      ["0.9375rem",{ lineHeight: "1.4",  fontWeight: "500" }],
      "caption":    ["0.875rem", { lineHeight: "1.4"  }],
    },
    extend: {},
  },
  plugins: [],
};
export default config;
