"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { PERIOD_OPTIONS, Period, filterByDateRange, getDateRange } from "@/lib/date-filter";

interface VisitRecord {
  id: string;
  shopName: string;
  province: string;
  district?: string;
  tripType?: string;
  customerType: string;
  visitType?: string;
  result?: string;
  orderAmount?: number | null;
  imageUrls: string[];
  createdAt: string;
  user?: { fullName: string; email: string };
}

interface UserStat {
  name: string;
  email: string;
  total: number;
  buy: number;
  noBuy: number;
  notFound: number;
  totalAmount: number;
  provinces: Record<string, number>;
  visits: VisitRecord[];
}

const TRIP_LABEL: Record<string, string> = { plan: "ตามแผน", off_plan: "นอกแผน" };
const RESULT_LABEL: Record<string, string> = { buy: "ซื้อ", no_buy: "ไม่ซื้อ", not_found: "ไม่พบ" };
const PAGE_SIZE = 9;

const MEDAL = [
  { ring: "ring-2 ring-yellow-400", bg: "bg-yellow-50", badge: "bg-yellow-400 text-white", label: "text-yellow-600" },
  { ring: "ring-2 ring-gray-300",   bg: "bg-gray-50",   badge: "bg-gray-400 text-white",   label: "text-gray-500"   },
  { ring: "ring-2 ring-amber-500",  bg: "bg-amber-50",  badge: "bg-amber-500 text-white",  label: "text-amber-600"  },
];


function ResultPill({ result }: { result?: string }) {
  if (!result) return <span className="text-gray-300 text-xs">—</span>;
  const cls =
    result === "buy" ? "bg-green-50 text-green-700"
    : result === "no_buy" ? "bg-red-50 text-red-600"
    : "bg-gray-100 text-gray-500";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{RESULT_LABEL[result]}</span>;
}

function Avatar({ name, rank }: { name: string; rank?: number }) {
  const medal = rank !== undefined && rank < 3 ? MEDAL[rank] : null;
  return (
    <div className="relative flex-shrink-0">
      <div className={`w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-base font-bold text-green-700 ${medal?.ring ?? ""}`}>
        {name.charAt(0)}
      </div>
      {medal && (
        <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-black flex items-center justify-center ${medal.badge}`}>
          {rank! + 1}
        </span>
      )}
    </div>
  );
}

function LeaderboardCard({ s, rank, expanded, onToggle }: {
  s: UserStat; rank: number; expanded: boolean; onToggle: () => void;
}) {
  const medal = MEDAL[rank];
  const buyRate = s.total > 0 ? Math.round((s.buy / s.total) * 100) : 0;
  const topProv = Object.entries(s.provinces).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full min-w-0 ${medal.bg}`}>
      <button className="w-full text-left p-5 hover:opacity-90 transition-opacity" onClick={onToggle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={s.name} rank={rank} />
            <div>
              <p className="font-bold text-gray-800 text-sm">{s.name}</p>
              <p className="text-xs text-gray-400">{s.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-gray-800 tabular-nums">{s.total}</p>
            <p className="text-xs text-gray-400">ครั้ง</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/70 rounded-xl p-2.5 text-center">
            <p className="text-xs text-green-600 font-medium">ซื้อ</p>
            <p className="text-lg font-bold text-green-700 tabular-nums">{s.buy}</p>
            <p className="text-xs text-green-500">{buyRate}%</p>
          </div>
          <div className="bg-white/70 rounded-xl p-2.5 text-center">
            <p className="text-xs text-red-500 font-medium">ไม่ซื้อ</p>
            <p className="text-lg font-bold text-red-600 tabular-nums">{s.noBuy}</p>
            <p className="text-xs text-red-400">{s.total > 0 ? Math.round((s.noBuy / s.total) * 100) : 0}%</p>
          </div>
          <div className="bg-white/70 rounded-xl p-2.5 text-center">
            <p className="text-xs text-gray-500 font-medium">ไม่พบ</p>
            <p className="text-lg font-bold text-gray-600 tabular-nums">{s.notFound}</p>
            <p className="text-xs text-gray-400">{s.total > 0 ? Math.round((s.notFound / s.total) * 100) : 0}%</p>
          </div>
        </div>

        {s.totalAmount > 0 && (
          <p className="text-xs font-semibold text-green-700 mb-2">
            ยอดรวม ฿{s.totalAmount.toLocaleString("th-TH")}
          </p>
        )}

        {topProv.length > 0 && (
          <div className="flex gap-1.5 overflow-hidden">
            {topProv.map(([prov, cnt]) => (
              <span key={prov} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/80 text-gray-600 flex-shrink-0">
                {prov} <span className="font-bold text-gray-800">{cnt}</span>
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-3">
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && <VisitList visits={s.visits} total={s.visits.length} />}
    </div>
  );
}

function SaleRow({ s, rank, expanded, onToggle }: {
  s: UserStat; rank: number; expanded: boolean; onToggle: () => void;
}) {
  const buyRate = s.total > 0 ? Math.round((s.buy / s.total) * 100) : 0;
  const topProv = Object.entries(s.provinces).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full min-w-0">
      <button className="w-full text-left p-5 hover:opacity-90 transition-opacity" onClick={onToggle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-base font-bold text-green-700">
                {s.name.charAt(0)}
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-black flex items-center justify-center bg-gray-300 text-gray-700">
                {rank}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">{s.name}</p>
              <p className="text-xs text-gray-400">{s.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-gray-800 tabular-nums">{s.total}</p>
            <p className="text-xs text-gray-400">ครั้ง</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/70 rounded-xl p-2.5 text-center border border-gray-100">
            <p className="text-xs text-green-600 font-medium">ซื้อ</p>
            <p className="text-lg font-bold text-green-700 tabular-nums">{s.buy}</p>
            <p className="text-xs text-green-500">{buyRate}%</p>
          </div>
          <div className="bg-white/70 rounded-xl p-2.5 text-center border border-gray-100">
            <p className="text-xs text-red-500 font-medium">ไม่ซื้อ</p>
            <p className="text-lg font-bold text-red-600 tabular-nums">{s.noBuy}</p>
            <p className="text-xs text-red-400">{s.total > 0 ? Math.round((s.noBuy / s.total) * 100) : 0}%</p>
          </div>
          <div className="bg-white/70 rounded-xl p-2.5 text-center border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">ไม่พบ</p>
            <p className="text-lg font-bold text-gray-600 tabular-nums">{s.notFound}</p>
            <p className="text-xs text-gray-400">{s.total > 0 ? Math.round((s.notFound / s.total) * 100) : 0}%</p>
          </div>
        </div>

        {s.totalAmount > 0 && (
          <p className="text-xs font-semibold text-green-700 mb-2">
            ยอดรวม ฿{s.totalAmount.toLocaleString("th-TH")}
          </p>
        )}

        {topProv.length > 0 && (
          <div className="flex gap-1.5 overflow-hidden">
            {topProv.map(([prov, cnt]) => (
              <span key={prov} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 flex-shrink-0">
                {prov} <span className="font-bold text-gray-800">{cnt}</span>
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-3">
          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && <VisitList visits={s.visits} total={s.visits.length} />}
    </div>
  );
}

const VISIT_LIST_LIMIT = 20;

function VisitList({ visits, total }: { visits: VisitRecord[]; total: number }) {
  const shown = visits.slice(0, VISIT_LIST_LIMIT);
  return (
    <div className="border-t border-gray-100">
      <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ประวัติการออกทริป ({total} รายการ)</p>
        {total > VISIT_LIST_LIMIT && (
          <p className="text-xs text-gray-400">แสดง {VISIT_LIST_LIMIT} ล่าสุด</p>
        )}
      </div>
      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
        {shown.map((v) => (
          <div key={v.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
            {v.imageUrls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.imageUrls[0]} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{v.shopName}</p>
              <p className="text-xs text-gray-400">
                {v.district ? `${v.province} · ${v.district}` : v.province}
                {v.tripType ? ` · ${TRIP_LABEL[v.tripType]}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <ResultPill result={v.result} />
              {v.result === "buy" && v.orderAmount != null && (
                <p className="text-xs font-semibold text-green-600">฿{v.orderAmount.toLocaleString("th-TH")}</p>
              )}
              <p className="text-xs text-gray-300">
                {new Date(v.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalesPage() {
  const [authorized, setAuthorized] = useState(false);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.replace("/dashboard"); return; }
    const parsed = JSON.parse(u);
    const perms: any[] = parsed.permissions ?? [];
    const isLegacyAdmin = parsed.role === "admin" && !perms.length;
    const perm = perms.find((p: any) => p.menu === "sales");
    const canView = isLegacyAdmin || (perm?.canView ?? false);
    if (!canView) { window.location.replace("/dashboard"); return; }
    setAuthorized(true);
  }, []);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [resultFilter, setResultFilter] = useState("");
  const [tripFilter, setTripFilter] = useState("");
  const [visitTypeFilter, setVisitTypeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");

  useEffect(() => {
    api.getVisits({ limit: 9999 })
      .then((v) => setVisits(v?.data ?? (Array.isArray(v) ? v : [])))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const provinces = useMemo(() => Array.from(new Set(visits.map((v) => v.province))).sort(), [visits]);

  const filtered = useMemo(() => {
    let result = filterByDateRange(visits, period, customFrom, customTo);
    if (resultFilter) result = result.filter((v) => v.result === resultFilter);
    if (tripFilter) result = result.filter((v) => v.tripType === tripFilter);
    if (visitTypeFilter) result = result.filter((v) => v.visitType === visitTypeFilter);
    if (customerFilter) result = result.filter((v) => v.customerType === customerFilter);
    if (provinceFilter) result = result.filter((v) => v.province === provinceFilter);
    return result;
  }, [visits, period, customFrom, customTo, resultFilter, tripFilter, visitTypeFilter, customerFilter, provinceFilter]);

  const userStats = useMemo<UserStat[]>(() => {
    const map: Record<string, UserStat> = {};
    for (const v of filtered) {
      const key = v.user?.email || "unknown";
      if (!map[key]) {
        map[key] = {
          name: v.user?.fullName || "ไม่ระบุ",
          email: key,
          total: 0, buy: 0, noBuy: 0, notFound: 0,
          totalAmount: 0,
          provinces: {},
          visits: [],
        };
      }
      const s = map[key];
      s.total++;
      if (v.result === "buy") { s.buy++; s.totalAmount += v.orderAmount ?? 0; }
      else if (v.result === "no_buy") s.noBuy++;
      else if (v.result === "not_found") s.notFound++;
      s.provinces[v.province] = (s.provinces[v.province] || 0) + 1;
      s.visits.push(v);
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const displayStats = useMemo(() => {
    if (!search.trim()) return userStats;
    const q = search.toLowerCase();
    return userStats.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [userStats, search]);

  const leaderboard = displayStats.slice(0, 3);
  const restStats = displayStats.slice(3);
  const totalPages = Math.ceil(restStats.length / PAGE_SIZE);
  const pagedStats = restStats.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const range = getDateRange(period, customFrom, customTo);
  const periodLabel = range
    ? `${range.start.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} – ${range.end.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  const topProvinces = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of filtered) map[v.province] = (map[v.province] || 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  const handleToggle = (email: string) => setExpanded((e) => (e === email ? null : email));

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">สถิติเซล</h2>
        <p className="text-sm text-gray-400 mt-0.5 h-5 transition-opacity duration-200" style={{ opacity: periodLabel ? 1 : 0 }}>
          {periodLabel || " "}
        </p>
      </div>

      {/* Period filter + Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0">
          {PERIOD_OPTIONS.map((p) => (
            <button key={p.value} onClick={() => { setPeriod(p.value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                period === p.value ? "bg-white text-green-700 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-700"
              }`}>{p.label}</button>
          ))}
        </div>
        <div className="overflow-hidden transition-all duration-200 ease-in-out flex-shrink-0"
          style={{ maxWidth: period === "custom" ? "320px" : "0px", opacity: period === "custom" ? 1 : 0 }}>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600 bg-white" />
            <span className="text-gray-300 text-lg font-light">—</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} min={customFrom}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600 bg-white" />
          </div>
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input type="text" placeholder="ค้นหาเซล..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: provinceFilter, set: setProvinceFilter, placeholder: "ทุกจังหวัด", options: provinces.map((p) => ({ value: p, label: p })) },
          { value: resultFilter, set: setResultFilter, placeholder: "ทุกผล", options: [{ value: "buy", label: "ซื้อ" }, { value: "no_buy", label: "ไม่ซื้อ" }, { value: "not_found", label: "ไม่พบ" }] },
          { value: tripFilter, set: setTripFilter, placeholder: "ทุกทริป", options: [{ value: "plan", label: "ตามแผน" }, { value: "off_plan", label: "นอกแผน" }] },
          { value: visitTypeFilter, set: setVisitTypeFilter, placeholder: "ทุกภารกิจ", options: [{ value: "tak", label: "ทัก" }, { value: "dem", label: "เดม" }, { value: "tel", label: "โทร" }] },
          { value: customerFilter, set: setCustomerFilter, placeholder: "ทุกลูกค้า", options: [{ value: "new", label: "ลูกค้าใหม่" }, { value: "existing", label: "ลูกค้าเก่า" }] },
        ].map(({ value, set, placeholder, options }) => (
          <select key={placeholder} value={value}
            onChange={(e) => { set(e.target.value); setPage(1); }}
            className="text-sm border border-gray-200 rounded-xl bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600 min-w-[110px]">
            <option value="">{placeholder}</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
      </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Leaderboard */}
          {!loading && leaderboard.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">🏆 Leaderboard</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {leaderboard.map((s, i) => (
                  <LeaderboardCard key={s.email} s={s} rank={i}
                    expanded={expanded === s.email} onToggle={() => handleToggle(s.email)} />
                ))}
              </div>
            </div>
          )}

          {/* Rest of list */}
          {!loading && restStats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                อันดับที่ {leaderboard.length + 1}–{leaderboard.length + restStats.length}
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {pagedStats.map((s, i) => (
                  <SaleRow key={s.email} s={s} rank={leaderboard.length + (page - 1) * PAGE_SIZE + i + 1}
                    expanded={expanded === s.email} onToggle={() => handleToggle(s.email)} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-xs text-gray-400">
                    หน้า {page} / {totalPages} · {restStats.length} คน
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      ← ก่อนหน้า
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} className="text-gray-400 text-sm px-1">…</span>
                        ) : (
                          <button key={p} onClick={() => setPage(p as number)}
                            className={`w-8 h-8 text-sm rounded-xl font-medium transition-colors ${
                              page === p ? "bg-green-500 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}>
                            {p}
                          </button>
                        )
                      )}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      ถัดไป →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-gray-200" />
                <div className="space-y-1.5"><div className="h-3.5 w-28 bg-gray-200 rounded" /><div className="h-3 w-20 bg-gray-200 rounded" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((j) => <div key={j} className="h-12 bg-gray-100 rounded-xl" />)}
              </div>
            </div>
          ))}

          {!loading && displayStats.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <p className="text-sm">{search ? "ไม่พบเซลที่ค้นหา" : "ไม่มีข้อมูลในช่วงนี้"}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">จังหวัดยอดนิยม</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded-xl" />)}
              </div>
            ) : topProvinces.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-3">
                {topProvinces.map(([prov, cnt], i) => (
                  <div key={prov}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                        <p className="text-sm font-medium text-gray-700">{prov}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-800 tabular-nums">{cnt}</p>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5 ml-6">
                      <div className="bg-green-400 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${topProvinces[0][1] > 0 ? (cnt / topProvinces[0][1]) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!loading && filtered.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">สรุปภาพรวม</p>
              {[
                { label: "เยี่ยมทั้งหมด", value: filtered.length, color: "text-gray-800" },
                { label: "ซื้อ", value: filtered.filter((v) => v.result === "buy").length, color: "text-green-600" },
                { label: "ไม่ซื้อ", value: filtered.filter((v) => v.result === "no_buy").length, color: "text-red-500" },
                { label: "ไม่พบ", value: filtered.filter((v) => v.result === "not_found").length, color: "text-gray-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">อัตราซื้อรวม</p>
                  <p className="text-sm font-bold text-green-600">
                    {Math.round((filtered.filter((v) => v.result === "buy").length / filtered.length) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
