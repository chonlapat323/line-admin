"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { getDateRange, PERIOD_OPTIONS, type Period } from "@/lib/date-filter";
import type { ProvinceStats } from "@/components/visits-map";
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

function selectCls(active: boolean) {
  return `text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400 border-0 cursor-pointer font-medium transition-colors min-w-[110px] ${
    active
      ? "bg-green-500 text-white"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
  }`;
}

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

const EMPTY_STATS = { total: 0, buy: 0, noBuy: 0, notFound: 0, totalAmount: 0 };

export default function VisitsPage() {
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.replace("/dashboard"); return; }
    const parsed = JSON.parse(u);
    const perms: any[] = parsed.permissions ?? [];
    const isLegacyAdmin = parsed.role === "admin" && !perms.length;
    const perm = perms.find((p: any) => p.menu === "visits");
    const canView = isLegacyAdmin || (perm?.canView ?? false);
    if (!canView) { window.location.replace("/dashboard"); return; }
    setAuthorized(true);
  }, []);

  // Filters
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [tripFilter, setTripFilter] = useState("");
  const [visitTypeFilter, setVisitTypeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");

  // UI
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [flyToProvince, setFlyToProvince] = useState<string | undefined>();
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // API response
  const [pageData, setPageData] = useState<{
    data: VisitRecord[]; total: number; page: number; totalPages: number;
    stats: typeof EMPTY_STATS;
  }>({ data: [], total: 0, page: 1, totalPages: 1, stats: EMPTY_STATS });
  const [provinceStatsData, setProvinceStatsData] = useState<Record<string, ProvinceStats>>({});

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch whenever filter or page changes
  const filterKey = `${period}|${customFrom}|${customTo}|${provinceFilter}|${resultFilter}|${tripFilter}|${visitTypeFilter}|${customerFilter}|${debouncedSearch}|${pageSize}`;
  const filterKeyRef = useRef(filterKey);

  useEffect(() => {
    let cancelled = false;
    let effectivePage = tablePage;

    if (filterKeyRef.current !== filterKey) {
      filterKeyRef.current = filterKey;
      effectivePage = 1;
      setTablePage(1);
    }

    const dateRange = (() => {
      if (period === "all") return {};
      const r = getDateRange(period as Period, customFrom, customTo);
      return r ? { dateFrom: r.start.toISOString(), dateTo: r.end.toISOString() } : {};
    })();

    setLoading(true);
    Promise.all([
      api.getVisits({
        page: effectivePage, limit: pageSize,
        province: provinceFilter || undefined,
        result: resultFilter || undefined,
        tripType: tripFilter || undefined,
        visitType: visitTypeFilter || undefined,
        customerType: customerFilter || undefined,
        search: debouncedSearch || undefined,
        ...dateRange,
      }),
      api.getVisitProvinceStats(dateRange),
    ])
      .then(([data, pStats]) => {
        if (!cancelled) { setPageData(data); setProvinceStatsData(pStats); }
      })
      .catch(() => { if (!cancelled) toast("โหลดข้อมูลล้มเหลว", "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tablePage, filterKey]);

  const provinces = useMemo(() => Object.keys(PROVINCE_CENTROIDS).sort(), []);

  const topProvinces = useMemo(() =>
    Object.entries(provinceStatsData)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, s]) => [name, s.total] as [string, number]),
  [provinceStatsData]);

  const stats = pageData.stats;
  const totalTablePages = pageData.totalPages;
  const pagedVisits = pageData.data;
  const provinceStats = provinceStatsData;

  if (!authorized) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ประวัติการเยี่ยมร้าน</h2>
          <p className="text-sm text-gray-400 mt-0.5">{pageData.total} รายการ{Object.values({ provinceFilter, resultFilter, tripFilter, visitTypeFilter, customerFilter, search: debouncedSearch }).some(Boolean) || period !== "all" ? " (กรอง)" : "ทั้งหมด"}</p>
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

      {/* Top 5 provinces */}
      {topProvinces.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
            Top {topProvinces.length} จังหวัด
          </p>
          <div className="flex flex-wrap gap-2">
            {topProvinces.map(([name, count], i) => {
              const active = provinceFilter === name;
              return (
                <button
                  key={name}
                  onClick={() => {
                    if (active) {
                      setProvinceFilter("");
                      setFlyToProvince(undefined);
                    } else {
                      setProvinceFilter(name);
                      setFlyToProvince(name);
                      setShowMap(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 cursor-pointer border transition-colors ${
                    active
                      ? "bg-green-600 border-green-700 hover:bg-green-700"
                      : "bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300"
                  }`}
                >
                  <span className={`text-xs font-bold w-4 text-center ${active ? "text-white" : "text-green-800"}`}>{i + 1}</span>
                  <svg className={`w-3 h-3 shrink-0 ${active ? "text-white" : "text-green-700"}`} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span className={`text-xs font-semibold ${active ? "text-white" : "text-green-800"}`}>{name}</span>
                  <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${active ? "bg-white text-green-700" : "bg-green-600 text-white"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-2.5">
        {/* Row 1: Period + custom date */}
        <div className="flex gap-2 flex-wrap items-center">
          {PERIOD_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3.5 py-1.5 text-sm rounded-xl font-medium transition-colors ${
                period === opt.value
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {period === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-sm bg-gray-100 rounded-xl px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600"
              />
              <span className="text-gray-400 text-sm">—</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-sm bg-gray-100 rounded-xl px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600"
              />
            </>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Row 2: Search + dropdowns */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${search ? "text-green-500" : "text-gray-400"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหาร้าน, จังหวัด, เซล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${
                search ? "bg-green-500 text-white placeholder:text-green-200" : "bg-gray-100 text-gray-600 placeholder:text-gray-400"
              }`}
            />
          </div>

          <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} className={selectCls(!!provinceFilter)}>
            <option value="">ทุกจังหวัด</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className={selectCls(!!resultFilter)}>
            <option value="">ทุกผล</option>
            <option value="buy">ซื้อ</option>
            <option value="no_buy">ไม่ซื้อ</option>
            <option value="not_found">ไม่พบ</option>
          </select>

          <select value={tripFilter} onChange={(e) => setTripFilter(e.target.value)} className={selectCls(!!tripFilter)}>
            <option value="">ทุกทริป</option>
            <option value="plan">ตามแผน</option>
            <option value="off_plan">นอกแผน</option>
          </select>

          <select value={visitTypeFilter} onChange={(e) => setVisitTypeFilter(e.target.value)} className={selectCls(!!visitTypeFilter)}>
            <option value="">ทุกภารกิจ</option>
            <option value="tak">ทัก</option>
            <option value="dem">เดม</option>
            <option value="tel">โทร</option>
          </select>

          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className={selectCls(!!customerFilter)}>
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
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "rgba(22,101,52,0.85)" }} />เยี่ยมมาก
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "rgba(134,239,172,0.65)" }} />เยี่ยมน้อย
              </span>
              <span className="text-gray-400">{Object.keys(provinceStatsData).length} จังหวัด</span>
            </div>
          </div>
          <VisitsMap provinceStats={provinceStats} flyToProvince={flyToProvince} />
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
            {!loading && pageData.total === 0 && (
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
              pagedVisits.map((v) => (
                <tr key={v.id} className="hover:bg-green-50/40 transition-colors cursor-pointer" onClick={() => setSelectedVisit(v)}>
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    {v.imageUrls?.[0] ? (
                      <button onClick={() => setPreviewImg(v.imageUrls[0])} className="focus:outline-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.imageUrls[0]} alt="" className="w-10 h-10 rounded-lg object-cover hover:opacity-80 transition-opacity" />
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
                    <p className="text-xs text-gray-400 mt-0.5">{v.district ? `${v.province} · ${v.district}` : v.province}</p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-gray-600">{v.user?.fullName || "-"}</td>
                  <td className="px-5 py-4 hidden md:table-cell text-xs text-gray-500">{v.tripType ? TRIP_LABEL[v.tripType] : "-"}</td>
                  <td className="px-5 py-4 hidden lg:table-cell text-xs text-gray-500">{v.visitType ? MISSION_LABEL[v.visitType] : "-"}</td>
                  <td className="px-5 py-4 hidden lg:table-cell text-xs font-semibold text-green-700">
                    {v.result === "buy" && v.orderAmount != null ? `฿${v.orderAmount.toLocaleString("th-TH")}` : "-"}
                  </td>
                  <td className="px-5 py-4"><ResultBadge result={v.result} /></td>
                  <td className="px-5 py-4 text-gray-400 text-xs hidden md:table-cell">
                    {new Date(v.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && pageData.total > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>แสดง {Math.min((tablePage - 1) * pageSize + 1, pageData.total)}–{Math.min(tablePage * pageSize, pageData.total)} จาก {pageData.total} รายการ</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setTablePage(1); }} className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-400">
                <option value={20}>20/หน้า</option>
                <option value={50}>50/หน้า</option>
                <option value={100}>100/หน้า</option>
              </select>
            </div>
            {totalTablePages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setTablePage((p) => Math.max(1, p - 1))} disabled={tablePage === 1} className="px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹</button>
                {Array.from({ length: totalTablePages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalTablePages || Math.abs(p - tablePage) <= 1)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-gray-400">…</span>
                    ) : (
                      <button key={item} onClick={() => setTablePage(item as number)} className={`px-2 py-1 rounded-lg text-xs transition-colors ${tablePage === item ? "bg-green-600 text-white font-semibold" : "text-gray-500 hover:bg-gray-200"}`}>{item}</button>
                    )
                  )}
                <button onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))} disabled={tablePage === totalTablePages} className="px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visit Detail Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedVisit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{selectedVisit.shopName}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{selectedVisit.district ? `${selectedVisit.province} · ${selectedVisit.district}` : selectedVisit.province}</p>
              </div>
              <button onClick={() => setSelectedVisit(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Details */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">เซล</p>
                  <p className="font-medium text-gray-700">{selectedVisit.user?.fullName || "-"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">วันที่</p>
                  <p className="font-medium text-gray-700">{new Date(selectedVisit.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">ทริป</p>
                  <p className="font-medium text-gray-700">{selectedVisit.tripType ? TRIP_LABEL[selectedVisit.tripType] || selectedVisit.tripType : "-"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">ลูกค้า</p>
                  <p className="font-medium text-gray-700">{selectedVisit.customerType || "-"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">ภารกิจ</p>
                  <p className="font-medium text-gray-700">{selectedVisit.visitType ? MISSION_LABEL[selectedVisit.visitType] || selectedVisit.visitType : "-"}</p>
                </div>
                <div className={`rounded-xl p-3 ${selectedVisit.result === "buy" ? "bg-green-50" : selectedVisit.result === "no_buy" ? "bg-red-50" : "bg-gray-50"}`}>
                  <p className="text-xs text-gray-400 mb-1">ผลตอบรับ</p>
                  <ResultBadge result={selectedVisit.result} />
                </div>
              </div>
              {selectedVisit.result === "buy" && selectedVisit.orderAmount != null && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm text-green-700 font-medium">ยอดสั่งซื้อ</span>
                  <span className="text-xl font-bold text-green-700">฿{selectedVisit.orderAmount.toLocaleString("th-TH")}</span>
                </div>
              )}
              {selectedVisit.details && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-2">บันทึก</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedVisit.details}</p>
                </div>
              )}
              {/* Image Gallery */}
              {selectedVisit.imageUrls?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">รูปภาพ ({selectedVisit.imageUrls.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedVisit.imageUrls.map((url, i) => (
                      <button key={i} onClick={() => { setSelectedVisit(null); setPreviewImg(url); }} className="aspect-square rounded-xl overflow-hidden focus:outline-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
