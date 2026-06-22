"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";

interface UserSummary {
  userId: string;
  user: { fullName: string; email: string; bankName?: string; bankAccount?: string };
  visitCount: number;
  totalAmount: number;
  reachedThreshold: boolean;
  commission: number;
}

interface CommissionData {
  month: string;
  settings: { rate: number; threshold: number };
  summary: UserSummary[];
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS_OPTS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "reached", label: "ต้องจ่าย" },
  { value: "not_reached", label: "ไม่ถึงเป้า" },
];

export default function CommissionsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters (client-side)
  const [statusFilter, setStatusFilter] = useState("reached");
  const [search, setSearch] = useState("");

  const load = useCallback((m: string) => {
    setLoading(true);
    api.getCommissionSummary(m)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(month); }, [month]);

  const filtered = useMemo(() => {
    if (!data?.summary) return [];
    return data.summary.filter((r) => {
      if (statusFilter === "reached" && !r.reachedThreshold) return false;
      if (statusFilter === "not_reached" && r.reachedThreshold) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!r.user.fullName.toLowerCase().includes(q) && !r.user.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, statusFilter, search]);

  const totalCommission = filtered.reduce((s, r) => s + r.commission, 0);
  const totalSales = filtered.reduce((s, r) => s + r.totalAmount, 0);
  const reachedCount = data?.summary.filter((r) => r.reachedThreshold).length ?? 0;
  const missingBankCount = filtered.filter((r) => r.reachedThreshold && (!r.user.bankName || !r.user.bankAccount)).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ค่าคอมมิชชันรายเดือน</h2>
          <p className="text-sm text-gray-400 mt-0.5">คำนวณจากยอด verified + approved เท่านั้น</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-gray-100 rounded-xl px-3 py-1.5 text-sm border-0 focus:ring-2 focus:ring-green-400 focus:outline-none text-gray-600 font-medium" />
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">อัตราค่าคอม</p>
            <p className="text-2xl font-bold text-gray-800">{data.settings.rate}%</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">ยอดขั้นต่ำ</p>
            <p className="text-xl font-bold text-gray-800">฿{data.settings.threshold.toLocaleString("th-TH")}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">เซลถึงเป้า</p>
            <p className="text-xl font-bold text-green-700">{reachedCount} คน</p>
          </div>
          <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-4">
            <p className="text-xs text-amber-600 mb-1">ค่าคอมรวมที่ต้องจ่าย</p>
            <p className="text-xl font-bold text-amber-700">฿{(data.summary.filter(r => r.reachedThreshold).reduce((s, r) => s + r.commission, 0)).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {/* Missing bank warning */}
      {missingBankCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-red-700 font-medium">
            มีเซล <span className="font-bold">{missingBankCount} คน</span> ที่ถึงเป้าแต่ยังไม่ได้กรอกข้อมูลธนาคาร — แจ้งให้กรอกใน Mobile App ก่อนจ่ายเงิน
          </p>
        </div>
      )}

      {!data?.settings.rate && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
          ⚠️ ยังไม่ได้ตั้งค่าอัตราค่าคอม — ไปตั้งค่าได้ที่ <a href="/dashboard/settings" className="underline font-semibold">ตั้งค่าระบบ</a>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
        {/* Row 1: Status chips */}
        <div className="flex gap-2 flex-wrap items-center">
          {STATUS_OPTS.map((opt) => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`px-3.5 py-1.5 text-sm rounded-xl font-medium transition-colors ${
                statusFilter === opt.value ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {opt.label}
              {opt.value === "reached" && data && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  statusFilter === "reached" ? "bg-white text-green-600" : "bg-green-500 text-white"
                }`}>{reachedCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="border-t border-gray-100" />

        {/* Row 2: Search */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${search ? "text-green-200" : "text-gray-400"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input type="text" placeholder="ค้นหาชื่อเซล..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${
                search ? "bg-green-500 text-white placeholder:text-green-200" : "bg-gray-100 text-gray-600 placeholder:text-gray-400"
              }`} />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">เซล</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ธนาคาร</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ออเดอร์</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ยอดขายรวม</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">สถานะ</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ค่าคอม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">กำลังคำนวณ...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <p className="text-2xl mb-2">📊</p>
                    <p className="text-sm font-semibold text-gray-600">ไม่มีข้อมูล</p>
                    <p className="text-xs text-gray-400 mt-1">เฉพาะออเดอร์ที่ verified/approved เท่านั้น</p>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((row, i) => {
                const noBankInfo = row.reachedThreshold && (!row.user.bankName || !row.user.bankAccount);
                return (
                  <tr key={row.userId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{row.user.fullName}</p>
                      <p className="text-xs text-gray-400">{row.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.user.bankName && row.user.bankAccount ? (
                        <div>
                          <p className="text-sm font-medium text-gray-700">{row.user.bankName}</p>
                          <p className="text-xs text-gray-500 font-mono">{row.user.bankAccount}</p>
                        </div>
                      ) : (
                        <span className={`text-xs ${noBankInfo ? "text-red-500 font-semibold" : "text-gray-300"}`}>
                          {noBankInfo ? "⚠ ยังไม่กรอก" : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">{row.visitCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      ฿{row.totalAmount.toLocaleString("th-TH")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.reachedThreshold ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          ✓ ถึงเป้า
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                          ✗ ไม่ถึงเป้า
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold text-base ${row.commission > 0 ? "text-amber-600" : "text-gray-300"}`}>
                        {row.commission > 0 ? `฿${row.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}` : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-500">
                    แสดง {filtered.length} คน
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-600">
                    {filtered.reduce((s, r) => s + r.visitCount, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    ฿{totalSales.toLocaleString("th-TH")}
                  </td>
                  <td />
                  <td className="px-4 py-3 text-right font-bold text-amber-600 text-base">
                    ฿{totalCommission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
