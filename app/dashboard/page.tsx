"use client";
import { useEffect, useState, useMemo } from "react";
import { PERIOD_OPTIONS, Period, filterByDateRange, formatThaiDate, getDateRange } from "@/lib/date-filter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

interface Log {
  id: string;
  details: { title: string };
  status: string;
  createdAt: string;
  targetUser?: { fullName: string };
}

interface User {
  id: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/line/history`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([u, l]) => {
        setUsers(Array.isArray(u) ? u : []);
        setLogs(Array.isArray(l) ? l : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = useMemo(
    () => filterByDateRange(logs, period, customFrom, customTo),
    [logs, period, customFrom, customTo]
  );
  const filteredUsers = useMemo(
    () => filterByDateRange(users, period, customFrom, customTo),
    [users, period, customFrom, customTo]
  );

  const successCount = filteredLogs.filter((l) => l.status === "success").length;
  const failedCount = filteredLogs.filter((l) => l.status === "failed").length;
  const successRate = filteredLogs.length > 0 ? Math.round((successCount / filteredLogs.length) * 100) : 0;
  const recentLogs = filteredLogs.slice(0, 5);

  const range = getDateRange(period, customFrom, customTo);
  const periodLabel = range
    ? `${range.start.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} – ${range.end.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  const statCards = [
    {
      label: "ผู้ใช้ใหม่",
      value: filteredUsers.length,
      sub: `จากทั้งหมด ${users.length} คน`,
      color: "text-blue-600",
      iconBg: "bg-blue-50",
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "ส่งทั้งหมด",
      value: filteredLogs.length,
      sub: "รายการในช่วงนี้",
      color: "text-gray-800",
      iconBg: "bg-gray-100",
      icon: (
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
    },
    {
      label: "สำเร็จ",
      value: successCount,
      sub: `คิดเป็น ${successRate}%`,
      color: "text-green-600",
      iconBg: "bg-green-50",
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "ล้มเหลว",
      value: failedCount,
      sub: failedCount > 0 ? "ต้องตรวจสอบ" : "ไม่มีข้อผิดพลาด",
      color: failedCount > 0 ? "text-red-500" : "text-gray-400",
      iconBg: failedCount > 0 ? "bg-red-50" : "bg-gray-100",
      icon: (
        <svg className={`w-5 h-5 ${failedCount > 0 ? "text-red-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header — fixed height, no shift */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">ภาพรวม</h2>
        <p className="text-sm text-gray-400 mt-0.5 h-5 transition-opacity duration-200" style={{ opacity: periodLabel ? 1 : 0 }}>
          {periodLabel || " "}
        </p>
      </div>

      {/* Period filter — date range slides in on the same row */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                period === p.value
                  ? "bg-white text-green-700 shadow-sm font-semibold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range — slides in to the right, same row */}
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out flex-shrink-0"
          style={{ maxWidth: period === "custom" ? "320px" : "0px", opacity: period === "custom" ? 1 : 0 }}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600 bg-white"
            />
            <span className="text-gray-300 text-lg font-light">—</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              min={customFrom}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Stats — fixed height cards, skeleton matches value height */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-gray-400">{card.label}</p>
              <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                {card.icon}
              </div>
            </div>
            {/* Fixed height so skeleton never shifts layout */}
            <div className="h-9 flex items-center">
              {loading ? (
                <div className="h-7 w-14 bg-gray-200 animate-pulse rounded-lg" />
              ) : (
                <p className={`text-3xl font-bold tabular-nums leading-none ${card.color}`}>{card.value}</p>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Rate bar — always rendered, bar width animates */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">อัตราความสำเร็จ</p>
          <p className="text-sm font-bold tabular-nums text-green-600">{loading ? "—" : `${successRate}%`}</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: loading ? "0%" : `${successRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-gray-400">
            {loading ? (
              <span className="inline-block h-3 w-20 bg-gray-200 animate-pulse rounded" />
            ) : (
              `สำเร็จ ${successCount} รายการ`
            )}
          </p>
          <p className="text-xs text-gray-400">
            {loading ? (
              <span className="inline-block h-3 w-20 bg-gray-200 animate-pulse rounded" />
            ) : (
              `ล้มเหลว ${failedCount} รายการ`
            )}
          </p>
        </div>
      </div>

      {/* Recent logs */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">การส่งล่าสุด</h3>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">ชื่อสินค้า</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">ส่งถึง</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">วันที่</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5"><div className="h-3.5 w-32 bg-gray-200 animate-pulse rounded" /></td>
                    <td className="px-5 py-3.5 hidden md:table-cell"><div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded" /></td>
                    <td className="px-5 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-28 bg-gray-200 animate-pulse rounded" /></td>
                    <td className="px-5 py-3.5"><div className="h-6 w-14 bg-gray-200 animate-pulse rounded-full" /></td>
                  </tr>
                ))}
              {!loading && recentLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                    ไม่มีประวัติในช่วงเวลานี้
                  </td>
                </tr>
              )}
              {!loading &&
                recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-800">{log.details?.title || "—"}</td>
                    <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">
                      {log.targetUser?.fullName || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell whitespace-nowrap">
                      {formatThaiDate(log.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      {log.status === "success" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          สำเร็จ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          ล้มเหลว
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
