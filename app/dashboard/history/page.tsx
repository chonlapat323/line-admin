"use client";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import { PERIOD_OPTIONS, Period, filterByDateRange, formatThaiDate, getDateRange } from "@/lib/date-filter";

interface Log {
  id: string;
  imageUrl: string;
  details: { title: string; price?: string; note?: string };
  status: string;
  errorMessage?: string;
  createdAt: string;
  targetUser?: { fullName: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "success", label: "สำเร็จ" },
  { value: "failed", label: "ล้มเหลว" },
];

export default function HistoryPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/line/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setLogs)
      .catch(() => toast("โหลดประวัติล้มเหลว", "error"))
      .finally(() => setLoading(false));
  }, []);

  const periodFiltered = useMemo(
    () => filterByDateRange(logs, period, customFrom, customTo),
    [logs, period, customFrom, customTo]
  );

  const tableFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return periodFiltered.filter((l) => {
      const matchSearch =
        !q ||
        l.details?.title?.toLowerCase().includes(q) ||
        l.targetUser?.fullName?.toLowerCase().includes(q);
      const matchStatus = !statusFilter || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [periodFiltered, search, statusFilter]);

  const successCount = periodFiltered.filter((l) => l.status === "success").length;
  const failedCount = periodFiltered.filter((l) => l.status === "failed").length;
  const successRate = periodFiltered.length > 0 ? Math.round((successCount / periodFiltered.length) * 100) : 0;

  const range = getDateRange(period, customFrom, customTo);
  const periodLabel = range
    ? `${range.start.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} – ${range.end.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  const statCards = [
    {
      label: "ส่งทั้งหมด",
      value: periodFiltered.length,
      color: "text-gray-800",
      barColor: "bg-gray-400",
      barWidth: 100,
    },
    {
      label: "สำเร็จ",
      value: successCount,
      color: "text-green-600",
      barColor: "bg-green-500",
      barWidth: successRate,
    },
    {
      label: "ล้มเหลว",
      value: failedCount,
      color: "text-red-500",
      barColor: "bg-red-500",
      barWidth: periodFiltered.length > 0 ? Math.round((failedCount / periodFiltered.length) * 100) : 0,
    },
    {
      label: "อัตราสำเร็จ",
      value: `${successRate}%`,
      color: successRate >= 80 ? "text-green-600" : successRate >= 50 ? "text-amber-500" : "text-red-500",
      barColor: successRate >= 80 ? "bg-green-500" : successRate >= 50 ? "bg-amber-400" : "bg-red-500",
      barWidth: successRate,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header — fixed height subtitle prevents shift */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">ประวัติการส่ง</h2>
        <p
          className="text-sm text-gray-400 mt-0.5 h-5 transition-opacity duration-200"
          style={{ opacity: periodLabel ? 1 : 0 }}
        >
          {periodLabel || " "}
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

      {/* Stat cards — fixed height, bar animates width */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 mb-2">{card.label}</p>
            {/* Fixed height container prevents skeleton→value shift */}
            <div className="h-9 flex items-center">
              {loading ? (
                <div className="h-7 w-14 bg-gray-200 animate-pulse rounded-lg" />
              ) : (
                <p className={`text-3xl font-bold tabular-nums leading-none ${card.color}`}>{card.value}</p>
              )}
            </div>
            <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ease-out ${card.barColor}`}
                style={{ width: loading ? "0%" : `${card.barWidth}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Search + Status filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้าหรือผู้ใช้..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-gray-600"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">รูปภาพ / ชื่อสินค้า</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">ราคา</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">ส่งถึง</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">วันที่</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
                      <div className="space-y-2">
                        <div className="h-3.5 w-32 bg-gray-200 animate-pulse rounded" />
                        <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell"><div className="h-3.5 w-16 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-4 hidden lg:table-cell"><div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-4 hidden lg:table-cell"><div className="h-3.5 w-28 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-4"><div className="h-6 w-16 bg-gray-200 animate-pulse rounded-full" /></td>
                </tr>
              ))}

            {!loading && tableFiltered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm font-medium text-gray-400">ไม่พบประวัติ</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {search || statusFilter ? "ลองเปลี่ยนตัวกรอง" : "ยังไม่มีการส่งภาพในช่วงเวลานี้"}
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              tableFiltered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                        {log.imageUrl ? (
                          <img
                            src={log.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 leading-tight">{log.details?.title || "—"}</p>
                        {log.errorMessage && (
                          <p className="text-xs text-red-400 mt-0.5 truncate max-w-[180px]" title={log.errorMessage}>
                            {log.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    {log.details?.price ? (
                      <span className="text-red-500 font-medium tabular-nums">฿{log.details.price}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500 hidden lg:table-cell">
                    {log.targetUser?.fullName || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs hidden lg:table-cell whitespace-nowrap">
                    {formatThaiDate(log.createdAt)}
                  </td>
                  <td className="px-5 py-4">
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

        {/* Footer — always rendered with fixed height */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between min-h-[44px]">
          <p className="text-xs text-gray-400">
            {loading ? (
              <span className="inline-block h-3 w-32 bg-gray-200 animate-pulse rounded" />
            ) : (
              `แสดง ${tableFiltered.length} จาก ${periodFiltered.length} รายการ`
            )}
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {loading ? <span className="inline-block h-3 w-8 bg-gray-200 animate-pulse rounded" /> : tableFiltered.filter((l) => l.status === "success").length}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {loading ? <span className="inline-block h-3 w-8 bg-gray-200 animate-pulse rounded" /> : tableFiltered.filter((l) => l.status === "failed").length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
