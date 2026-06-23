"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Visit {
  id: string;
  shopName: string;
  province: string;
  district?: string;
  customerType: string;
  details?: string;
  orderAmount: number;
  slipUrl?: string;
  slipStatus?: string;
  transRef?: string;
  createdAt: string;
}

const SLIP_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  verified:   { label: "QR ✓",      color: "bg-blue-50 text-blue-700" },
  approved:   { label: "อนุมัติแล้ว", color: "bg-green-50 text-green-700" },
  "":         { label: "ข้อมูลเก่า",  color: "bg-gray-100 text-gray-500" },
};

function thaiMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

export default function BreakdownPage() {
  const params = useSearchParams();
  const router = useRouter();

  const userId   = params.get("userId") ?? "";
  const month    = params.get("month") ?? "";
  const userName = params.get("name") ?? "พนักงาน";

  const [visits, setVisits]     = useState<Visit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [commRate, setCommRate] = useState(0);

  // Filters
  const [search, setSearch]         = useState("");
  const [province, setProvince]     = useState("");
  const [minAmt, setMinAmt]         = useState("");
  const [maxAmt, setMaxAmt]         = useState("");

  useEffect(() => {
    if (!userId || !month) return;
    Promise.all([
      api.getCommissionBreakdown(userId, month),
      api.getCommissionSettings(),
    ]).then(([v, s]) => {
      setVisits(v);
      setCommRate(s?.rate ?? 0);
    }).catch(console.error).finally(() => setLoading(false));
  }, [userId, month]);

  const provinces = useMemo(() =>
    [...new Set(visits.map((v) => v.province))].sort(),
    [visits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minAmt ? parseFloat(minAmt) : null;
    const max = maxAmt ? parseFloat(maxAmt) : null;
    return visits.filter((v) => {
      if (q && !v.shopName.toLowerCase().includes(q)) return false;
      if (province && v.province !== province) return false;
      if (min !== null && (v.orderAmount ?? 0) < min) return false;
      if (max !== null && (v.orderAmount ?? 0) > max) return false;
      return true;
    });
  }, [visits, search, province, minAmt, maxAmt]);

  const totalAmount = filtered.reduce((s, v) => s + (v.orderAmount ?? 0), 0);
  const commission  = Math.round(totalAmount * commRate) / 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{userName}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{thaiMonth(month)} · {visits.length} ออเดอร์</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">ยอดรวมทั้งหมด</p>
          <p className="text-2xl font-bold text-gray-800">
            ฿{totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{filtered.length} รายการ (กรองแล้ว)</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 font-medium mb-1">ค่าคอม {commRate}%</p>
          <p className="text-2xl font-bold text-amber-600">
            ฿{commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">คำนวณจากยอดที่กรอง</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search shop */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">ค้นหาชื่อร้าน</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                placeholder="ชื่อร้าน..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Province */}
          <div className="min-w-[160px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">จังหวัด</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full py-2.5 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-gray-700"
            >
              <option value="">ทุกจังหวัด</option>
              {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Amount range */}
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">ยอดขั้นต่ำ</label>
              <input
                type="number"
                placeholder="0"
                value={minAmt}
                onChange={(e) => setMinAmt(e.target.value)}
                className="w-28 py-2.5 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>
            <span className="text-gray-400 pb-2.5">—</span>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">ยอดสูงสุด</label>
              <input
                type="number"
                placeholder="ไม่จำกัด"
                value={maxAmt}
                onChange={(e) => setMaxAmt(e.target.value)}
                className="w-28 py-2.5 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Reset */}
          {(search || province || minAmt || maxAmt) && (
            <button
              onClick={() => { setSearch(""); setProvince(""); setMinAmt(""); setMaxAmt(""); }}
              className="py-2.5 px-4 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              รีเซ็ต
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">สลิป</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ชื่อร้าน</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ลูกค้า</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ยอด (บาท)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">หมายเหตุ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">วันที่</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">จังหวัด</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">สถานะสลิป</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">กำลังโหลด...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <p className="text-2xl mb-2">📋</p>
                    <p className="text-sm font-semibold text-gray-600">ไม่มีรายการ</p>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    {v.slipUrl ? (
                      <button onClick={() => setPreviewImg(v.slipUrl!)} className="focus:outline-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.slipUrl} alt="slip" className="w-10 h-10 object-cover rounded-lg border border-gray-100 hover:opacity-80" />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">—</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{v.shopName}</p>
                    {v.district && <p className="text-xs text-gray-400">{v.district}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      v.customerType === "new" || v.customerType === "ใหม่"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {v.customerType === "new" || v.customerType === "ใหม่" ? "ใหม่" : "เก่า"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    ฿{(v.orderAmount ?? 0).toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{v.details || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(v.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    <br />
                    <span className="text-gray-400">{new Date(v.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{v.province}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const s = SLIP_STATUS_LABEL[v.slipStatus ?? ""] ?? { label: v.slipStatus ?? "—", color: "bg-gray-100 text-gray-500" };
                      return (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
                          {s.label}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-500">
                    {filtered.length} รายการ
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    ฿{totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Slip preview */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setPreviewImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImg} alt="slip" className="max-w-sm max-h-[85vh] rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
