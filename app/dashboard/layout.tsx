"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ fullName: string; email: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (!token || !u) { router.push("/login"); return; }
    setUser(JSON.parse(u));
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (!user) return null;

  const navItems = [
    { href: "/dashboard/send", label: "ส่งรูป" },
    { href: "/dashboard/connect", label: "เชื่อม LINE" },
    { href: "/dashboard/users", label: "Users" },
    { href: "/dashboard/history", label: "ประวัติ" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-800">BeautyUp LINE Admin</h1>
          <p className="text-xs text-gray-500">{user.fullName}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500">ออก</button>
      </header>
      <nav className="bg-white border-b px-6 flex gap-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              pathname.startsWith(item.href)
                ? "border-green-500 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}>
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="max-w-4xl mx-auto p-6">{children}</main>
    </div>
  );
}
