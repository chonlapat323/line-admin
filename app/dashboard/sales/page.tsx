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
  provinces: Record<string, number>;
  visits: VisitRecord[];
}

const TRIP_LABEL: Record<string, string> = { plan: "ตามแผน", off_plan: "นอกแผน", swap: "สลับวัน" };
const RESULT_LABEL: Record<string, string> = { buy: "ซื้อ", no_buy: "ไม่ซื้อ", not_found: "ไม่พบ" };

function MiniBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ResultPill({ result }: { result?: string }) {
  if (!result) return <span className="text-gray-300 text-xs">—</span>;
  const cls =
    result === "buy" ? "bg-green-50 text-green-700"
    : result === "no_buy" ? "bg-red-50 text-red-600"
    : "bg-gray-100 text-gray-500";
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{RESULT_LABEL[result]}</span>;
}

export default function SalesPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.getVisits()
      .then((v) => setVisits(Array.isArray(v) ? v : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => filterByDateRange(visits, period, customFrom, customTo),
    [visits, period, customFrom, customTo]
  );

  const userStats = useMemo<UserStat[]>(() => {
    const map: Record<string, UserStat> = {};
    for (const v of filtered) {
      const key = v.user?.email || "unknown";
      if (!map[key]) {
        map[key] = {
          name: v.user?.fullName || "ไม่ระบุ",
          email: key,
          total: 0, buy: 0, noBuy: 0, notFound: 0,
          provinces: {},
          visits: [],
        };
      }
      const s = map[key];
      s.total++;
      if (v.result === "buy") s.buy++;
      else if (v.result === "no_buy") s.noBuy++;
      else if (v.result === "not_found") s.notFound++;
      s.provinces[v.province] = (s.provinces[v.province] || 0) + 1;
      s.visits.push(v);
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const range = getDateRange(period, customFrom, customTo);
  const periodLabel = range
    ? `${range.start.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} – ${range.end.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  const topProvinces = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of filtered) map[v.province] = (map[v.province] || 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">สถิติเซล</h2>
        <p className="text-sm text-gray-400 mt-0.5 h-5 transition-opacity duration-200" style={{ opacity: periodLabel ? 1 : 0 }}>
          {periodLabel || " "}
        </p>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0">
          {PERIOD_OPTIONS.map((p) => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
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
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main: user stats table */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ยอดแต่ละเซล</p>

          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-gray-200" />
                <div className="space-y-1.5"><div className="h-3.5 w-28 bg-gray-200 rounded" /><div className="h-3 w-20 bg-gray-200 rounded" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1,2,3].map(j => <div key={j} className="h-12 bg-gray-100 rounded-xl" />)}
              </div>
            </div>
          ))}

          {!loading && userStats.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              <p className="text-sm">ไม่มีข้อมูลในช่วงนี้</p>
            </div>
          )}

          {!loading && userStats.map((s) => {
            const buyRate = s.total > 0 ? Math.round((s.buy / s.total) * 100) : 0;
            const isOpen = expanded === s.email;
            const topProv = Object.entries(s.provinces).sort((a, b) => b[1] - a[1]).slice(0, 4);

            return (
              <div key={s.email} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <button className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : s.email)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400 hidden sm:block">{s.total} ครั้ง</span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-xs text-green-600 font-medium">ซื้อ</p>
                      <p className="text-2xl font-bold text-green-700 tabular-nums">{s.buy}</p>
                      <MiniBar value={s.buy} total={s.total} color="bg-green-500" />
                      <p className="text-xs text-green-500 mt-1">{buyRate}%</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                      <p className="text-xs text-red-500 font-medium">ไม่ซื้อ</p>
                      <p className="text-2xl font-bold text-red-600 tabular-nums">{s.noBuy}</p>
                      <MiniBar value={s.noBuy} total={s.total} color="bg-red-400" />
                      <p className="text-xs text-red-400 mt-1">{s.total > 0 ? Math.round((s.noBuy/s.total)*100) : 0}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 font-medium">ไม่พบ</p>
                      <p className="text-2xl font-bold text-gray-500 tabular-nums">{s.notFound}</p>
                      <MiniBar value={s.notFound} total={s.total} color="bg-gray-400" />
                      <p className="text-xs text-gray-400 mt-1">{s.total > 0 ? Math.round((s.notFound/s.total)*100) : 0}%</p>
                    </div>
                  </div>

                  {/* Province pills */}
                  {topProv.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {topProv.map(([prov, cnt]) => (
                        <span key={prov} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                          {prov} <span className="font-semibold text-gray-800">{cnt}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                {/* Expanded: visit history */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <div className="px-5 py-3 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ประวัติการเยี่ยม ({s.visits.length} รายการ)</p>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                      {s.visits.map((v) => (
                        <div key={v.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                          {v.imageUrls?.[0] ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
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
                            <p className="text-xs text-gray-300">
                              {new Date(v.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar: top provinces overall */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">จังหวัดยอดนิยม</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-gray-100 animate-pulse rounded-xl" />)}
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
                    <div className="w-full bg-gray-100 rounded-full h-1.5 ml-6">
                      <div className="bg-green-400 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${topProvinces[0][1] > 0 ? (cnt / topProvinces[0][1]) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary card */}
          {!loading && filtered.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">สรุปภาพรวม</p>
              {[
                { label: "เยี่ยมทั้งหมด", value: filtered.length, color: "text-gray-800" },
                { label: "ซื้อ", value: filtered.filter(v => v.result === "buy").length, color: "text-green-600" },
                { label: "ไม่ซื้อ", value: filtered.filter(v => v.result === "no_buy").length, color: "text-red-500" },
                { label: "ไม่พบ", value: filtered.filter(v => v.result === "not_found").length, color: "text-gray-400" },
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
                    {Math.round((filtered.filter(v => v.result === "buy").length / filtered.length) * 100)}%
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
