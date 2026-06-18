"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { filterByDateRange, PERIOD_OPTIONS, type Period } from "@/lib/date-filter";
import type { MapPin } from "@/components/visits-map";
import { PROVINCE_CENTROIDS } from "@/lib/province-centroids";

const VisitsMap = dynamic(() => import("@/components/visits-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
      <span className="text-sm text-gray-400">กำลังโหลดแผนที่...</span>
    </div>
  ),
});

interface VisitRecord {
  id: string;
  shopName: string;
  province: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  tripType?: string;
  customerType: string;
  visitType?: string;
  result?: string;
  details?: string;
  orderAmount?: number | null;
  imageUrls: string[];
  createdAt: string;
  user?: { fullName: string; email: string };
}

type PeriodFilter = Period | "all";

const TRIP_LABEL: Record<string, string> = { plan: "ตามแผน", off_plan: "นอกแผน" };
const MISSION_LABEL: Record<string, string> = { tak: "ทัก", dem: "เดม", tel: "โทร" };
const RESULT_LABEL: Record<string, string> = { buy: "ซื้อ", no_buy: "ไม่ซื้อ", not_found: "ไม่พบ" };

const PERIOD_OPTS: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  ...PERIOD_OPTIONS,
];

const SELECT_CLS =
  "text-sm border border-gray-200 rounded-xl bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-gray-600 min-w-[110px]";

function ResultBadge({ result }: { result?: string }) {
  if (!result) return null;
  const cls =
    result === "buy"
      ? "bg-green-50 text-green-700"
      : result === "no_buy"
      ? "bg-red-50 text-red-600"
      : "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {RESULT_LABEL[result] ?? result}
    </span>
  );
}

export default function VisitsPage() {
  const { toast } = useToast();
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [tripFilter, setTripFilter] = useState("");
  const [visitTypeFilter, setVisitTypeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");

  // UI
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    api
      .getVisits()
      .then(setVisits)
      .catch(() => toast("โหลดข้อมูลล้มเหลว", "error"))
      .finally(() => setLoading(false));
  }, []);

  const provinces = useMemo(
    () => Array.from(new Set(visits.map((v) => v.province))).sort(),
    [visits]
  );

  const filtered = useMemo(() => {
    let result = visits;

    if (period !== "all") {
      result = filterByDateRange(result, period as Period, customFrom, customTo);
    }

    const q = search.toLowerCase();
    if (q) {
      result = result.filter(
        (v) =>
          v.shopName.toLowerCase().includes(q) ||
          v.province.toLowerCase().includes(q) ||
          (v.user?.fullName.toLowerCase().includes(q) ?? false)
      );
    }

    if (resultFilter) result = result.filter((v) => v.result === resultFilter);
    if (tripFilter) result = result.filter((v) => v.tripType === tripFilter);
    if (visitTypeFilter) result = result.filter((v) => v.visitType === visitTypeFilter);
    if (customerFilter) result = result.filter((v) => v.customerType === customerFilter);
    if (provinceFilter) result = result.filter((v) => v.province === provinceFilter);

    return result;
  }, [visits, period, customFrom, customTo, search, resultFilter, tripFilter, visitTypeFilter, customerFilter, provinceFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const buy = filtered.filter((v) => v.result === "buy").length;
    const noBuy = filtered.filter((v) => v.result === "no_buy").length;
    const notFound = filtered.filter((v) => v.result === "not_found").length;
    const totalAmount = filtered
      .filter((v) => v.result === "buy" && v.orderAmount != null)
      .reduce((s, v) => s + (v.orderAmount ?? 0), 0);
    return { total, buy, noBuy, notFound, totalAmount };
  }, [filtered]);

  const mapPins = useMemo<MapPin[]>(
    () =>
      filtered
        .map((v) => {
          const centroid = PROVINCE_CENTROIDS[v.province];
          if (!centroid) return null;
          return {
            id: v.id,
            lat: centroid.lat,
            lng: centroid.lng,
            shopName: v.shopName,
            result: v.result,
            province: v.province,
            date: new Date(v.createdAt).toLocaleDateString("th-TH", { dateStyle: "short" }),
            user: v.user?.fullName,
            orderAmount: v.orderAmount,
          };
        })
        .filter((p): p is MapPin => p !== null),
    [filtered]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ประวัติการเยี่ยมร้าน</h2>
          <p className="text-sm text-gray-400 mt-0.5">{visits.length} รายการทั้งหมด</p>
        </div>
        <button
          onClick={() => setShowMap((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          {showMap ? "ซ่อนแผนที่" : "แสดงแผนที่"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "ทั้งหมด", value: stats.total, cls: "text-gray-800" },
          { label: "ซื้อ", value: stats.buy, cls: "text-green-700" },
          { label: "ไม่ซื้อ", value: stats.noBuy, cls: "text-red-600" },
          { label: "ไม่พบ", value: stats.notFound, cls: "text-gray-500" },
          {
            label: "ยอดซื้อรวม",
            value: `฿${stats.totalAmount.toLocaleString("th-TH")}`,
            cls: "text-green-700",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
        {/* Period chips */}
        <div className="flex gap-2 flex-wrap items-center">
          {PERIOD_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3.5 py-1.5 text-sm rounded-xl font-medium transition-colors ${
                period === opt.value
                  ? "bg-green-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {period === "custom" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <span className="text-gray-400 text-sm">—</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          )}
        </div>

        {/* Type filters + search */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหาร้าน, จังหวัด, เซล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
            />
          </div>

          <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} className={SELECT_CLS}>
            <option value="">ทุกจังหวัด</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className={SELECT_CLS}>
            <option value="">ทุกผล</option>
            <option value="buy">ซื้อ</option>
            <option value="no_buy">ไม่ซื้อ</option>
            <option value="not_found">ไม่พบ</option>
          </select>

          <select value={tripFilter} onChange={(e) => setTripFilter(e.target.value)} className={SELECT_CLS}>
            <option value="">ทุกทริป</option>
            <option value="plan">ตามแผน</option>
            <option value="off_plan">นอกแผน</option>
          </select>

          <select value={visitTypeFilter} onChange={(e) => setVisitTypeFilter(e.target.value)} className={SELECT_CLS}>
            <option value="">ทุกภารกิจ</option>
            <option value="tak">ทัก</option>
            <option value="dem">เดม</option>
            <option value="tel">โทร</option>
          </select>

          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className={SELECT_CLS}>
            <option value="">ทุกลูกค้า</option>
            <option value="new">ลูกค้าใหม่</option>
            <option value="existing">ลูกค้าเก่า</option>
          </select>
        </div>
      </div>

      {/* Map */}
      {showMap && (
        <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="bg-white px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">แผนที่การเยี่ยม</span>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />ซื้อ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />ไม่ซื้อ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />ไม่พบ
              </span>
              <span className="text-gray-400">{mapPins.length} จุด</span>
            </div>
          </div>
          <VisitsMap pins={mapPins} />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">รูป</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">ร้านค้า</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">เซล</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">ทริป</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">ภารกิจ</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">ยอดสั่งซื้อ</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">ผลตอบรับ</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">วันที่</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4"><div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" /></td>
                  <td className="px-5 py-4"><div className="h-3.5 w-32 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-4 hidden md:table-cell"><div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-4 hidden md:table-cell"><div className="h-5 w-16 bg-gray-200 animate-pulse rounded-full" /></td>
                  <td className="px-5 py-4 hidden lg:table-cell"><div className="h-5 w-12 bg-gray-200 animate-pulse rounded-full" /></td>
                  <td className="px-5 py-4 hidden lg:table-cell"><div className="h-5 w-16 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-4"><div className="h-5 w-14 bg-gray-200 animate-pulse rounded-full" /></td>
                  <td className="px-5 py-4 hidden md:table-cell"><div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded" /></td>
                </tr>
              ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-14 text-center">
                  <div className="text-gray-400">
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    </svg>
                    <p className="text-sm font-medium">ไม่พบข้อมูลการเยี่ยม</p>
                    <p className="text-xs mt-1">ลองเปลี่ยน filter หรือช่วงเวลา</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    {v.imageUrls?.[0] ? (
                      <button onClick={() => setPreviewImg(v.imageUrls[0])} className="focus:outline-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={v.imageUrls[0]}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover hover:opacity-80 transition-opacity"
                        />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-800">{v.shopName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {v.district ? `${v.province} · ${v.district}` : v.province}
                    </p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-gray-600">
                    {v.user?.fullName || "-"}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-xs text-gray-500">
                    {v.tripType ? TRIP_LABEL[v.tripType] : "-"}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-xs text-gray-500">
                    {v.visitType ? MISSION_LABEL[v.visitType] : "-"}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-xs font-semibold text-green-700">
                    {v.result === "buy" && v.orderAmount != null
                      ? `฿${v.orderAmount.toLocaleString("th-TH")}`
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    <ResultBadge result={v.result} />
                  </td>
                  <td className="px-5 py-4 text-gray-400 text-xs hidden md:table-cell">
                    {new Date(v.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
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
          <img
            src={previewImg}
            alt=""
            className="max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
