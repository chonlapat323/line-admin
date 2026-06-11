import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeautyUp LINE Admin",
  description: "ระบบส่งรูปเข้า LINE Group",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
