"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

type MenuPermission = {
  menu: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type StoredUser = {
  fullName: string;
  email: string;
  role: string;
  roleId?: string | null;
  roleLabel?: string;
  permissions?: MenuPermission[];
};

const navItems = [
  { href: "/dashboard", label: "ภาพรวม", icon: "📊", menu: "dashboard", exact: true },
  { href: "/dashboard/sales", label: "สถิติเซล", icon: "📈", menu: "sales" },
  { href: "/dashboard/visits", label: "ประวัติการเยี่ยม", icon: "🗂️", menu: "visits" },
  { href: "/dashboard/approvals", label: "จัดการสลิป", icon: "🧾", menu: "approvals" },
  { href: "/dashboard/commissions", label: "ค่าคอมมิชชัน", icon: "💰", menu: "commissions" },
  { href: "/dashboard/reports", label: "รายงานรายบุคคล", icon: "📋", menu: "reports" },
  { href: "/dashboard/users", label: "จัดการ Users", icon: "👥", menu: "users" },
  { href: "/dashboard/roles", label: "จัดการสิทธิ์", icon: "🔐", menu: "roles" },
  { href: "/dashboard/settings", label: "ตั้งค่า", icon: "⚙️", menu: "settings" },
];

function canViewMenu(user: StoredUser | null, menu: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions?.find((p) => p.menu === menu)?.canView ?? false;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (!token || !u) { router.push("/login"); return; }
    const parsed: StoredUser = JSON.parse(u);
    setUser(parsed);

    // Guard: if current path is not viewable, redirect to dashboard
    const currentNav = navItems.find((n) => n.exact ? pathname === n.href : pathname.startsWith(n.href));
    if (currentNav && currentNav.menu !== "dashboard") {
      if (!canViewMenu(parsed, currentNav.menu)) {
        router.replace("/dashboard");
      }
    }
  }, [router, pathname]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (!user) return null;

  const visibleNav = navItems.filter((item) => canViewMenu(user, item.menu));

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col fixed h-full z-10">
        <div className="px-6 py-5 border-b border-gray-700">
          <h1 className="text-base font-bold text-white">BeautyUp SALES</h1>
          <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-green-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
              {user.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <p className="text-xs font-semibold mt-0.5 text-green-400">
                {user.roleLabel ?? (user.role === "admin" ? "แอดมิน" : "ผู้ใช้ทั่วไป")}
              </p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full text-xs text-gray-400 hover:text-red-400 text-left transition-colors py-1">
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
