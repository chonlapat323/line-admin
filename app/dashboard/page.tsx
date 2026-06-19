"use client";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { PERIOD_OPTIONS, Period, filterByDateRange, formatThaiDate, getDateRange } from "@/lib/date-filter";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  user?: { fullName: string };
}

interface User {
  id: string;
  createdAt: string;
}

const RESULT_LABEL: Record<string, string> = { buy: "ซื้อ", no_buy: "ไม่ซื้อ", not_found: "ไม่พบ" };
const TRIP_LABEL: Record<string, string> = { plan: "ตามแผน", off_plan: "นอกแผน" };

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
      {RESULT_LABEL[result] || result}
    </span>
  );
}

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [tripFilter, setTripFilter] = useState("");
  const [visitTypeFilter, setVisitTypeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      api.getVisits({ limit: 9999 }),
    ])
      .then(([u, v]) => {
        setUsers(Array.isArray(u) ? u : []);
        setVisits(v?.data ?? (Array.isArray(v) ? v : []));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const provinces = useMemo(() => Array.from(new Set(visits.map((v) => v.province))).sort(), [visits]);
  const userNames = useMemo(() => Array.from(new Set(visits.map((v) => v.user?.fullName).filter(Boolean) as string[])).sort(), [visits]);

  const filteredVisits = useMemo(() => {
    let result = filterByDateRange(visits, period, customFrom, customTo);
    if (resultFilter) result = result.filter((v) => v.result === resultFilter);
    if (tripFilter) result = result.filter((v) => v.tripType === tripFilter);
    if (visitTypeFilter) result = result.filter((v) => v.visitType === visitTypeFilter);
    if (customerFilter) result = result.filter((v) => v.customerType === customerFilter);
    if (provinceFilter) result = result.filter((v) => v.province === provinceFilter);
    if (userFilter) result = result.filter((v) => v.user?.fullName === userFilter);
    return result;
  }, [visits, period, customFrom, customTo, resultFilter, tripFilter, visitTypeFilter, customerFilter, provinceFilter, userFilter]);
  const filteredUsers = useMemo(
    () => filterByDateRange(users, period, customFrom, customTo),
    [users, period, customFrom, customTo]
  );

  const buyCount = filteredVisits.filter((v) => v.result === "buy").length;
  const noBuyCount = filteredVisits.filter((v) => v.result === "no_buy").length;
  const notFoundCount = filteredVisits.filter((v) => v.result === "not_found").length;
  const buyRate = filteredVisits.length > 0 ? Math.round((buyCount / filteredVisits.length) * 100) : 0;
  const totalAmount = filteredVisits
    .filter((v) => v.result === "buy" && v.orderAmount != null)
    .reduce((s, v) => s + (v.orderAmount ?? 0), 0);

  const chartData = useMemo(() => {
    if (period === "today") {
      const hours = Array.from({ length: 17 }, (_, i) => ({ label: `${i + 6}:00`, visits: 0, amount: 0 }));
      for (const v of filteredVisits) {
        const idx = new Date(v.createdAt).getHours() - 6;
        if (idx >= 0 && idx < 17) {
          hours[idx].visits++;
          if (v.result === "buy" && v.orderAmount) hours[idx].amount += v.orderAmount;
        }
      }
      return hours;
    }
    const r = getDateRange(period, customFrom, customTo);
    if (!r) return [];
    const start = new Date(r.start); start.setHours(0, 0, 0, 0);
    const end = new Date(r.end); end.setHours(23, 59, 59, 999);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    const byWeek = diffDays > 31;
    const buckets: { label: string; key: string; visits: number; amount: number }[] = [];
    const d = new Date(start);
    while (d <= end) {
      buckets.push({ label: d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }), key: d.toISOString().split("T")[0], visits: 0, amount: 0 });
      d.setDate(d.getDate() + (byWeek ? 7 : 1));
    }
    for (const v of filteredVisits) {
      const vKey = new Date(v.createdAt).toISOString().split("T")[0];
      if (byWeek) {
        for (let i = buckets.length - 1; i >= 0; i--) {
          if (vKey >= buckets[i].key) { buckets[i].visits++; if (v.result === "buy" && v.orderAmount) buckets[i].amount += v.orderAmount; break; }
        }
      } else {
        const b = buckets.find((b) => b.key === vKey);
        if (b) { b.visits++; if (v.result === "buy" && v.orderAmount) b.amount += v.orderAmount; }
      }
    }
    return buckets;
  }, [filteredVisits, period, customFrom, customTo]);

  const recentVisits = filteredVisits.slice(0, 5);

  const range = getDateRange(period, customFrom, customTo);
  const periodLabel = range
    ? `${range.start.toLocaleDateString("th-TH", { day: "numeric", month: "short" })} – ${range.end.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}`
    : "";

  const visitStatCards = [
    {
      label: "เยี่ยมร้านทั้งหมด",
      value: filteredVisits.length,
      sub: `จากทั้งหมด ${visits.length} รายการ`,
      color: "text-green-600",
      iconBg: "bg-green-50",
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: "ซื้อ",
      value: buyCount,
      sub: `คิดเป็น ${buyRate}%`,
      color: "text-green-700",
      iconBg: "bg-green-50",
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "ไม่ซื้อ",
      value: noBuyCount,
      sub: filteredVisits.length > 0 ? `คิดเป็น ${Math.round((noBuyCount / filteredVisits.length) * 100)}%` : "—",
      color: "text-red-500",
      iconBg: "bg-red-50",
      icon: (
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "ไม่พบ",
      value: notFoundCount,
      sub: filteredVisits.length > 0 ? `คิดเป็น ${Math.round((notFoundCount / filteredVisits.length) * 100)}%` : "—",
      color: "text-gray-500",
      iconBg: "bg-gray-100",
      icon: (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "ยอดซื้อรวม",
      value: `฿${totalAmount.toLocaleString("th-TH")}`,
      sub: `จาก ${buyCount} รายการที่ซื้อ`,
      color: "text-green-700",
      iconBg: "bg-green-50",
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">ภาพรวม</h2>
        <p className="text-sm text-gray-400 mt-0.5 h-5 transition-opacity duration-200" style={{ opacity: periodLabel ? 1 : 0 }}>
          {periodLabel || " "}
        </p>
      </div>

      {/* Period filter */}
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
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out flex-shrink-0"
          style={{ maxWidth: period === "custom" ? "320px" : "0px", opacity: period === "custom" ? 1 : 0 }}
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600 bg-white" />
            <span className="text-gray-300 text-lg font-light">—</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} min={customFrom}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600 bg-white" />
          </div>
        </div>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: provinceFilter, set: setProvinceFilter, placeholder: "ทุกจังหวัด", options: provinces.map((p) => ({ value: p, label: p })) },
          { value: userFilter, set: setUserFilter, placeholder: "ทุกเซล", options: userNames.map((n) => ({ value: n, label: n })) },
          { value: resultFilter, set: setResultFilter, placeholder: "ทุกผล", options: [{ value: "buy", label: "ซื้อ" }, { value: "no_buy", label: "ไม่ซื้อ" }, { value: "not_found", label: "ไม่พบ" }] },
          { value: tripFilter, set: setTripFilter, placeholder: "ทุกทริป", options: [{ value: "plan", label: "ตามแผน" }, { value: "off_plan", label: "นอกแผน" }] },
          { value: visitTypeFilter, set: setVisitTypeFilter, placeholder: "ทุกภารกิจ", options: [{ value: "tak", label: "ทัก" }, { value: "dem", label: "เดม" }, { value: "tel", label: "โทร" }] },
          { value: customerFilter, set: setCustomerFilter, placeholder: "ทุกลูกค้า", options: [{ value: "new", label: "ลูกค้าใหม่" }, { value: "existing", label: "ลูกค้าเก่า" }] },
        ].map(({ value, set, placeholder, options }) => (
          <select key={placeholder} value={value} onChange={(e) => set(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-600 min-w-[110px]">
            <option value="">{placeholder}</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
      </div>

      {/* Visit stat cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">การเยี่ยมร้าน</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {visitStatCards.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-gray-400">{card.label}</p>
                <div className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                  {card.icon}
                </div>
              </div>
              <div className="h-9 flex items-center">
                {loading ? (
                  <div className="h-7 w-14 bg-gray-200 animate-pulse rounded-lg" />
                ) : (
                  <p className={`text-3xl font-bold tabular-nums leading-none ${card.color}`}>{card.value}</p>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{card.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Buy rate bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">อัตราการซื้อ</p>
          <p className="text-sm font-bold tabular-nums text-green-600">{loading ? "—" : `${buyRate}%`}</p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full transition-all duration-700 ease-out" style={{ width: loading ? "0%" : `${buyRate}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-gray-400">{loading ? <span className="inline-block h-3 w-24 bg-gray-200 animate-pulse rounded" /> : `ซื้อ ${buyCount} รายการ`}</p>
          <p className="text-xs text-gray-400">{loading ? <span className="inline-block h-3 w-24 bg-gray-200 animate-pulse rounded" /> : `ไม่ซื้อ/ไม่พบ ${noBuyCount + notFoundCount} รายการ`}</p>
        </div>
      </div>

      {/* Chart */}
      {!loading && chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">
            {period === "today" ? "เยี่ยมรายชั่วโมง" : "แนวโน้มการเยี่ยม"}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `฿${(v / 1000).toFixed(0)}k` : `฿${v}`} />
              <Tooltip
                formatter={(value, name) =>
                  name === "visits"
                    ? [`${value} ครั้ง`, "เยี่ยมร้าน"]
                    : [`฿${Number(value).toLocaleString("th-TH")}`, "ยอดซื้อ"]
                }
                contentStyle={{ borderRadius: "12px", border: "1px solid #f3f4f6", fontSize: "12px" }}
              />
              <Bar yAxisId="left" dataKey="visits" fill="#86efac" radius={[3, 3, 0, 0]} maxBarSize={40} />
              <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#16a34a" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 justify-end">
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-3 rounded-sm bg-green-200 inline-block" />จำนวนเยี่ยม</span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-4 h-0.5 bg-green-600 inline-block" />ยอดซื้อ</span>
          </div>
        </div>
      )}

      {/* User summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs text-gray-400">ผู้ใช้ในระบบ</p>
          {loading ? (
            <div className="h-6 w-20 bg-gray-200 animate-pulse rounded mt-1" />
          ) : (
            <p className="text-lg font-bold text-blue-600 tabular-nums">{users.length} คน</p>
          )}
        </div>
        {!loading && filteredUsers.length !== users.length && (
          <p className="text-xs text-gray-400 ml-2">({filteredUsers.length} ใหม่ในช่วงนี้)</p>
        )}
      </div>

      {/* Recent visits */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">การเยี่ยมร้านล่าสุด</h3>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">ร้านค้า</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">เซล</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">ทริป</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">วันที่</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">ผล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3.5"><div className="h-3.5 w-32 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-3.5 hidden md:table-cell"><div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-16 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-6 w-14 bg-gray-200 animate-pulse rounded-full" /></td>
                </tr>
              ))}
              {!loading && recentVisits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    ไม่มีการเยี่ยมร้านในช่วงเวลานี้
                  </td>
                </tr>
              )}
              {!loading && recentVisits.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-800">{v.shopName}</p>
                    <p className="text-xs text-gray-400">{v.district ? `${v.province} · ${v.district}` : v.province}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">
                    {v.user?.fullName || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell">
                    {v.tripType ? TRIP_LABEL[v.tripType] : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell whitespace-nowrap">
                    {formatThaiDate(v.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <ResultBadge result={v.result} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && recentVisits.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 text-right">
              แสดง {recentVisits.length} รายการล่าสุด ·{" "}
              <a href="/dashboard/visits" className="text-green-600 hover:underline font-medium">ดูทั้งหมด →</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
