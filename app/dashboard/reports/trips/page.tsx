"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

const PRINT_STYLE = `
@media print {
  @page { size: A4 landscape; margin: 1.2cm; }
  table thead tr { background: none !important; }
  table thead th { color: #000 !important; border-bottom: 2px solid #000 !important; }
  table tbody tr { background: none !important; }
  table tbody td { color: #000 !important; }
  table tfoot tr { background: none !important; border-top: 2px solid #000 !important; }
  table tfoot td { color: #000 !important; }
}
`;

interface VisitRecord {
  id: string;
  result?: string;
  orderAmount?: number | null;
  createdAt: string;
  user?: { id: string; fullName: string };
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
}

interface UserStat {
  userId: string;
  fullName: string;
  total: number;
  buy: number;
  noBuy: number;
  notFound: number;
  amount: number;
}

export default function TripReportPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getVisits({ limit: 9999 } as any)
      .then((res: any) => setVisits(res?.data ?? (Array.isArray(res) ? res : [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const monthVisits = useMemo(
    () => visits.filter((v) => v.createdAt.startsWith(month)),
    [visits, month]
  );

  const userStats = useMemo<UserStat[]>(() => {
    const map = new Map<string, UserStat>();
    for (const v of monthVisits) {
      const uid = v.user?.id ?? "__unknown";
      const name = v.user?.fullName ?? "ไม่ระบุ";
      if (!map.has(uid)) map.set(uid, { userId: uid, fullName: name, total: 0, buy: 0, noBuy: 0, notFound: 0, amount: 0 });
      const s = map.get(uid)!;
      s.total++;
      if (v.result === "buy") { s.buy++; s.amount += v.orderAmount ?? 0; }
      else if (v.result === "no_buy") s.noBuy++;
      else if (v.result === "not_found") s.notFound++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [monthVisits]);

  const totals = useMemo(() => ({
    total: userStats.reduce((s, r) => s + r.total, 0),
    buy: userStats.reduce((s, r) => s + r.buy, 0),
    noBuy: userStats.reduce((s, r) => s + r.noBuy, 0),
    notFound: userStats.reduce((s, r) => s + r.notFound, 0),
    amount: userStats.reduce((s, r) => s + r.amount, 0),
  }), [userStats]);

  const buyRate = totals.total > 0 ? Math.round((totals.buy / totals.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <style>{PRINT_STYLE}</style>

      {/* Print header */}
      <div className="hidden print:block mb-4">
        <h2 className="text-lg font-bold text-gray-900">รายงานออกทริป</h2>
        <p className="text-sm text-gray-500">{formatMonth(month)}</p>
      </div>

      {/* Screen header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-800">รายงานออกทริป</h2>
          <p className="text-sm text-gray-400 mt-0.5">สรุปการออกทริปรายเดือนแยกตามเซล</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600 bg-white"
          />
          {!loading && userStats.length > 0 && (
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              พิมพ์
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 print:hidden">
        {[
          { label: "ออกทริปทั้งหมด", value: totals.total, sub: `${userStats.length} เซล` },
          { label: "ซื้อ", value: totals.buy, sub: `${buyRate}%` },
          { label: "ไม่ซื้อ", value: totals.noBuy, sub: totals.total > 0 ? `${Math.round((totals.noBuy / totals.total) * 100)}%` : "—" },
          { label: "ไม่พบ", value: totals.notFound, sub: totals.total > 0 ? `${Math.round((totals.notFound / totals.total) * 100)}%` : "—" },
          { label: "ยอดขายรวม", value: `฿${totals.amount.toLocaleString("th-TH")}`, sub: `จาก ${totals.buy} รายการ` },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-400 mb-2">{c.label}</p>
            {loading ? (
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded-lg" />
            ) : (
              <p className="text-2xl font-bold text-gray-800 tabular-nums">{c.value}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Print summary row */}
      <div className="hidden print:flex gap-10 mb-4 border-b pb-3">
        <div><p className="text-xs text-gray-500">ออกทริปทั้งหมด</p><p className="text-xl font-bold">{totals.total} ครั้ง</p></div>
        <div><p className="text-xs text-gray-500">ซื้อ</p><p className="text-xl font-bold">{totals.buy}</p></div>
        <div><p className="text-xs text-gray-500">ไม่ซื้อ</p><p className="text-xl font-bold">{totals.noBuy}</p></div>
        <div><p className="text-xs text-gray-500">ไม่พบ</p><p className="text-xl font-bold">{totals.notFound}</p></div>
        <div><p className="text-xs text-gray-500">ยอดขายรวม</p><p className="text-xl font-bold">฿{totals.amount.toLocaleString("th-TH")}</p></div>
        <div><p className="text-xs text-gray-500">อัตราซื้อ</p><p className="text-xl font-bold">{buyRate}%</p></div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: "2.5rem" }} />
              <col />
              <col style={{ width: "6rem" }} />
              <col style={{ width: "5rem" }} />
              <col style={{ width: "5rem" }} />
              <col style={{ width: "5rem" }} />
              <col style={{ width: "9rem" }} />
              <col style={{ width: "5.5rem" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 bg-green-600">
                <th className="text-left px-4 py-3 text-xs font-semibold text-white">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white">ชื่อเซล</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white">ออกทริป</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white">ซื้อ</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white">ไม่ซื้อ</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white">ไม่พบ</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-white">ยอดขาย (บาท)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white">อัตราซื้อ</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 bg-gray-200 animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && userStats.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    ไม่มีข้อมูลออกทริปในเดือนนี้
                  </td>
                </tr>
              )}
              {!loading && userStats.map((s, i) => {
                const rate = s.total > 0 ? Math.round((s.buy / s.total) * 100) : 0;
                return (
                  <tr key={s.userId} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}.</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{s.fullName}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-700">{s.total}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-700">{s.buy}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-700">{s.noBuy}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-700">{s.notFound}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-800">
                      {s.amount > 0 ? s.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-gray-700">{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
            {!loading && userStats.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td colSpan={2} className="px-4 py-3 text-sm text-gray-600">รวม {userStats.length} เซล</td>
                  <td className="px-4 py-3 text-center tabular-nums text-gray-800">{totals.total}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-gray-800">{totals.buy}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-gray-800">{totals.noBuy}</td>
                  <td className="px-4 py-3 text-center tabular-nums text-gray-800">{totals.notFound}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                    {totals.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-gray-800">{buyRate}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
