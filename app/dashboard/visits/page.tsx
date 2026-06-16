"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

interface VisitRecord {
  id: string;
  shopName: string;
  province: string;
  district?: string;
  tripType?: string;
  customerType: string;
  visitType?: string;
  result?: string;
  details?: string;
  imageUrls: string[];
  createdAt: string;
  user?: { fullName: string; email: string };
}

const TRIP_LABEL: Record<string, string> = { plan: "ตามแผน", off_plan: "นอกแผน" };
const MISSION_LABEL: Record<string, string> = { tak: "ทัก", dem: "เดม" };
const RESULT_LABEL: Record<string, string> = { buy: "ซื้อ", no_buy: "ไม่ซื้อ", not_found: "ไม่พบ" };

const RESULT_FILTERS = [
  { value: "", label: "ทุกผล" },
  { value: "buy", label: "ซื้อ" },
  { value: "no_buy", label: "ไม่ซื้อ" },
  { value: "not_found", label: "ไม่พบ" },
];

function ResultBadge({ result }: { result?: string }) {
  if (!result) return null;
  const label = RESULT_LABEL[result] || result;
  const cls =
    result === "buy"
      ? "bg-green-50 text-green-700"
      : result === "no_buy"
      ? "bg-red-50 text-red-600"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function VisitsPage() {
  const { toast } = useToast();
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  useEffect(() => {
    api.getVisits()
      .then(setVisits)
      .catch(() => toast("โหลดข้อมูลล้มเหลว", "error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return visits.filter((v) => {
      const matchSearch = !q ||
        v.shopName.toLowerCase().includes(q) ||
        v.province.toLowerCase().includes(q) ||
        (v.user?.fullName.toLowerCase().includes(q) ?? false);
      const matchResult = !resultFilter || v.result === resultFilter;
      return matchSearch && matchResult;
    });
  }, [visits, search, resultFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ประวัติการเยี่ยมร้าน</h2>
          <p className="text-sm text-gray-400 mt-0.5">{visits.length} รายการทั้งหมด</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาร้าน, จังหวัด, เซล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
        </div>
        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-gray-600"
        >
          {RESULT_FILTERS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">รูป</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">ร้านค้า</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">เซล</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">ทริป</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">ภารกิจ</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">ผลตอบรับ</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">วันที่</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-4"><div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" /></td>
                <td className="px-5 py-4"><div className="h-3.5 w-32 bg-gray-200 animate-pulse rounded" /></td>
                <td className="px-5 py-4 hidden md:table-cell"><div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded" /></td>
                <td className="px-5 py-4 hidden lg:table-cell"><div className="h-5 w-16 bg-gray-200 animate-pulse rounded-full" /></td>
                <td className="px-5 py-4 hidden lg:table-cell"><div className="h-5 w-12 bg-gray-200 animate-pulse rounded-full" /></td>
                <td className="px-5 py-4"><div className="h-5 w-14 bg-gray-200 animate-pulse rounded-full" /></td>
                <td className="px-5 py-4 hidden md:table-cell"><div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded" /></td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center">
                  <div className="text-gray-400">
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    </svg>
                    <p className="text-sm font-medium">ไม่พบข้อมูลการเยี่ยม</p>
                    <p className="text-xs mt-1">{search ? "ลองค้นหาด้วยคำอื่น" : "ยังไม่มีการบันทึกการเยี่ยม"}</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading && filtered.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  {v.imageUrls?.[0] ? (
                    <button onClick={() => setPreviewImg(v.imageUrls[0])} className="focus:outline-none">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.imageUrls[0]} alt="" className="w-10 h-10 rounded-lg object-cover hover:opacity-80 transition-opacity" />
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  )}
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-800">{v.shopName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{v.district ? `${v.province} · ${v.district}` : v.province}</p>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className="text-gray-600">{v.user?.fullName || "-"}</span>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  <span className="text-xs text-gray-500">{v.tripType ? TRIP_LABEL[v.tripType] : "-"}</span>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  <span className="text-xs text-gray-500">{v.visitType ? MISSION_LABEL[v.visitType] : "-"}</span>
                </td>
                <td className="px-5 py-4">
                  <ResultBadge result={v.result} />
                </td>
                <td className="px-5 py-4 text-gray-400 text-xs hidden md:table-cell">
                  {new Date(v.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            แสดง {filtered.length} จาก {visits.length} รายการ
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewImg(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImg} alt="" className="max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
}
