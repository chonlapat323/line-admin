// ─── Typography Reference ─────────────────────────────────────────────────────
// Scale ถูก define ใน tailwind.config.ts → แก้ที่นั่นที่เดียวเพื่อ update ทั้ง project
//
// วิธีใช้:
//   import { ty } from "@/lib/typography"
//   <h1 className={ty.pageTitle}>...</h1>
//   <p  className={ty.description}>...</p>
//
// หรือใช้ Tailwind class ตรงๆ ก็ได้:
//   <h1 className="text-page-title font-bold">...</h1>

export const ty = {
  // ── Display & Headings ──────────────────────────────────────────────────────
  /** 32px — ตัวเลขสถิติขนาดใหญ่, hero stat */
  display:    "text-display",

  /** 26px — ชื่อหน้า (h1 ของแต่ละ page) */
  pageTitle:  "text-page-title font-bold",

  /** 20px — หัวข้อ section, modal title (h2) */
  section:    "text-section font-semibold",

  /** 17px — หัวข้อ card, widget, panel (h3) */
  heading:    "text-heading font-semibold",

  /** 15px — หัวข้อรอง, label กลุ่ม (h4) */
  subheading: "text-subheading font-semibold",

  // ── Body & Content ──────────────────────────────────────────────────────────
  /** 15px — เนื้อหาทั่วไป, ข้อความใน table */
  body:        "text-body",

  /** 14px — คำอธิบาย, secondary text, placeholder */
  description: "text-description text-gray-500",

  // ── Small Roles ─────────────────────────────────────────────────────────────
  /** 13px — label form, column header ตาราง */
  label:   "text-label font-medium",

  /** 12px — timestamp, badge, hint, metadata */
  caption: "text-caption text-gray-400",
} as const;
