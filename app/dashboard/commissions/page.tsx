"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface UserSummary {
  userId: string;
  user: { fullName: string; email: string };
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

export default function CommissionsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((m: string) => {
    setLoading(true);
    api.getCommissionSummary(m)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(month); }, [month]);

  const totalCommission = data?.summary.reduce((s, r) => s + r.commission, 0) ?? 0;
  const totalSales = data?.summary.reduce((s, r) => s + r.totalAmount, 0) ?? 0;
  const reachedCount = data?.summary.filter((r) => r.reachedThreshold).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ค่าคอมมิชชันรายเดือน</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            คำนวณจากยอด verified + approved เท่านั้น
          </p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
      </div>

      {/* Settings summary */}
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
            <p className="text-xs text-gray-400 mb-1">ยอดขายรวม</p>
            <p className="text-xl font-bold text-green-700">฿{totalSales.toLocaleString("th-TH")}</p>
          </div>
          <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-4">
            <p className="text-xs text-amber-600 mb-1">ค่าคอมรวมที่ต้องจ่าย</p>
            <p className="text-xl font-bold text-amber-700">฿{totalCommission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {!data?.settings.rate && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
          ⚠️ ยังไม่ได้ตั้งค่าอัตราค่าคอม — ไปตั้งค่าได้ที่ <a href="/dashboard/settings" className="underline font-semibold">ตั้งค่าระบบ</a>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">เซล</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">จำนวนออเดอร์</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ยอดขายรวม (บาท)</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ยอดขั้นต่ำ (บาท)</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">สถานะ</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ค่าคอม (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">กำลังคำนวณ...</td>
                </tr>
              )}
              {!loading && (!data?.summary.length) && (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <p className="text-2xl mb-2">📊</p>
                    <p className="text-sm font-semibold text-gray-600">ไม่มีข้อมูลยอดขายในเดือนนี้</p>
                    <p className="text-xs text-gray-400 mt-1">เฉพาะออเดอร์ที่ verified/approved เท่านั้น</p>
                  </td>
                </tr>
              )}
              {!loading && data?.summary.map((row, i) => (
                <tr key={row.userId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{row.user.fullName}</p>
                    <p className="text-xs text-gray-400">{row.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 font-medium">{row.visitCount}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    ฿{row.totalAmount.toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    ฿{(data.settings.threshold).toLocaleString("th-TH")}
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
                      ฿{row.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && (data?.summary.length ?? 0) > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-500">
                    รวม {data?.summary.length} คน · ถึงเป้า {reachedCount} คน
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    ฿{totalSales.toLocaleString("th-TH")}
                  </td>
                  <td />
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
