"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

const PRINT_STYLE = `
@media print {
  @page { size: A4; margin: 1.2cm; }
  table thead tr { background: none !important; }
  table thead th { color: #000 !important; border-bottom: 2px solid #000 !important; }
  table tbody tr { background: none !important; }
  table tbody td { color: #000 !important; }
  table tfoot tr { background: none !important; border-top: 2px solid #000 !important; }
  table tfoot td { color: #000 !important; }
  span[class*="rounded-full"] { background: none !important; color: #000 !important; border: none !important; padding: 0 !important; }
}
`;

interface User { id: string; fullName: string; email: string; role: string; }
interface VisitRecord {
  id: string; shopName: string; province: string; district?: string;
  customerType: string; visitType?: string; result?: string;
  details?: string; orderAmount?: number | null; createdAt: string;
}
interface SlipRecord {
  id: string; shopName: string; amount: number | null;
  details: string | null; slipUrl: string; slipStatus: string;
  debtDeducted: number; createdAt: string;
}
interface CommissionTier { min: number; max: number | null; rate: number; }
interface CommissionSummaryRow {
  userId: string;
  totalAmount: number;
  adjustment: number;
  outstandingDebt: number;
  reachedThreshold: boolean;
  commission: number;
  visitCount: number;
  pendingCount: number;
}

const RESULT_LABEL: Record<string, { label: string; color: string }> = {
  buy:       { label: "ซื้อ",   color: "bg-green-50 text-green-700" },
  no_buy:    { label: "ไม่ซื้อ", color: "bg-red-50 text-red-600" },
  not_found: { label: "ไม่พบ",  color: "bg-gray-100 text-gray-500" },
};
const SLIP_STATUS: Record<string, { label: string; color: string }> = {
  verified:         { label: "QR ✓",    color: "bg-blue-50 text-blue-700" },
  approved:         { label: "อนุมัติ",  color: "bg-green-50 text-green-700" },
  pending_approval: { label: "รออนุมัติ", color: "bg-amber-50 text-amber-700" },
  rejected:         { label: "ปฏิเสธ",  color: "bg-red-50 text-red-600" },
};

function calcTierCommission(amount: number, tiers: CommissionTier[]) {
  if (!tiers.length) return { breakdown: [], total: 0 };
  let total = 0;
  const breakdown = tiers.map((t) => {
    const inRange = Math.max(0, Math.min(amount, t.max ?? Infinity) - t.min);
    const commission = inRange * (t.rate / 100);
    total += commission;
    return { ...t, inRange, commission };
  });
  return { breakdown, total };
}

export default function ReportsPage() {
  const [tab, setTab] = useState<"visits" | "commissions">("visits");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [tiers, setTiers] = useState<CommissionTier[]>([]);
  const [flatRate, setFlatRate] = useState(0);

  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  const [slips, setSlips] = useState<SlipRecord[]>([]);
  const [loadingSlips, setLoadingSlips] = useState(false);
  const [commMonth, setCommMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [commSummaryRow, setCommSummaryRow] = useState<CommissionSummaryRow | null>(null);
  const [adjLogs, setAdjLogs] = useState<any[]>([]);
  const [showAdjLog, setShowAdjLog] = useState(false);

  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [minAmt, setMinAmt] = useState<number | null>(null);
  const [maxAmt, setMaxAmt] = useState<number | null>(null);
  const [province, setProvince] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    Promise.all([api.getUsers(), api.getCommissionSettings()])
      .then(([u, s]: any[]) => {
        setUsers((u as User[]).filter((x) => x.role !== "admin"));
        setTiers(s.tiers ?? []);
        setFlatRate(s.rate ?? 0);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedUserId || tab !== "visits") return;
    setLoadingVisits(true);
    setVisits([]);
    api.getVisits({ filterUserId: selectedUserId, limit: 1000 } as any)
      .then((res: any) => setVisits(res?.data ?? res ?? []))
      .catch(console.error)
      .finally(() => setLoadingVisits(false));
  }, [selectedUserId, tab]);

  useEffect(() => {
    if (!selectedUserId || tab !== "commissions") return;
    setLoadingSlips(true);
    setSlips([]);
    setCommSummaryRow(null);
    const [y, m] = commMonth.split("-").map(Number);
    const df = new Date(y, m - 1, 1).toISOString().split("T")[0];
    const dt = new Date(y, m, 0).toISOString().split("T")[0];
    Promise.all([
      api.getSlipSubmissions({ filterUserId: selectedUserId, limit: 1000, dateFrom: df, dateTo: dt }),
      api.getCommissionSummary(commMonth),
    ]).then(([slipRes, summaryRes]: any[]) => {
      setSlips(slipRes?.data ?? []);
      const row = (summaryRes?.summary ?? []).find((r: any) => r.userId === selectedUserId) ?? null;
      setCommSummaryRow(row);
    }).catch(console.error)
      .finally(() => setLoadingSlips(false));
  }, [selectedUserId, tab, commMonth]);

  function openAdjLog() {
    api.getUserAdjustments(selectedUserId).then((data: any[]) => {
      setAdjLogs(data.filter((a) => a.month === commMonth && a.amount > 0));
      setShowAdjLog(true);
    }).catch(console.error);
  }

  function resetFilters() {
    setDateFrom(""); setDateTo(""); setShopSearch("");
    setMinAmt(null); setMaxAmt(null); setProvince(""); setResult("");
  }
  function selectUser(id: string) { setSelectedUserId(id); resetFilters(); }

  const selectedUser = users.find((u) => u.id === selectedUserId);

  // ── Visits filtered ─────────────────────────────────────────────────────────
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (shopSearch && !v.shopName.toLowerCase().includes(shopSearch.toLowerCase())) return false;
      if (province && v.province !== province) return false;
      if (result && v.result !== result) return false;
      if (dateFrom && new Date(v.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(v.createdAt) > new Date(dateTo + "T23:59:59")) return false;
      if (minAmt !== null && (v.orderAmount ?? 0) < minAmt) return false;
      if (maxAmt !== null && (v.orderAmount ?? 0) > maxAmt) return false;
      return true;
    });
  }, [visits, shopSearch, province, result, dateFrom, dateTo, minAmt, maxAmt]);

  const visitProvinces = useMemo(() => [...new Set(visits.map((v) => v.province))].sort(), [visits]);
  const visitTotalAmt = filteredVisits.reduce((s, v) => s + (v.orderAmount ?? 0), 0);
  const visitBuyCount = filteredVisits.filter((v) => v.result === "buy").length;
  const visitNoBuyCount = filteredVisits.filter((v) => v.result === "no_buy").length;

  // ── Slips filtered ───────────────────────────────────────────────────────────
  const filteredSlips = useMemo(() => {
    return slips.filter((s) => {
      if (shopSearch && !s.shopName.toLowerCase().includes(shopSearch.toLowerCase())) return false;
      if (dateFrom && new Date(s.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(s.createdAt) > new Date(dateTo + "T23:59:59")) return false;
      if (minAmt !== null && (s.amount ?? 0) < minAmt) return false;
      if (maxAmt !== null && (s.amount ?? 0) > maxAmt) return false;
      return true;
    });
  }, [slips, shopSearch, dateFrom, dateTo, minAmt, maxAmt]);

  const slipTotal = filteredSlips.reduce((s, r) => s + (r.amount ?? 0), 0);
  const commSlips = filteredSlips.filter((s) => s.slipStatus === "verified" || s.slipStatus === "approved");
  const commTotal = commSlips.reduce((s, r) => s + (r.amount ?? 0), 0);
  const { breakdown: tierBreakdown, total: commAmount } = calcTierCommission(commTotal, tiers);
  const flatComm = tiers.length === 0 ? Math.round(commTotal * flatRate) / 100 : 0;

  const loading = tab === "visits" ? loadingVisits : loadingSlips;

  return (
    <div className="flex gap-4 min-h-[calc(100vh-5rem)]">
      <style>{PRINT_STYLE}</style>

      {/* Left: user list */}
      <div className="w-44 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden self-start sticky top-4 print:hidden">
        <div className="px-3 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">รายชื่อเซล</p>
        </div>
        <div className="overflow-y-auto max-h-[75vh] p-2">
          {users.length === 0 && <p className="text-xs text-gray-400 text-center py-4">กำลังโหลด...</p>}
          {users.map((u) => (
            <button key={u.id} onClick={() => selectUser(u.id)}
              className={`w-full text-left px-3 py-2.5 text-sm rounded-xl mb-1 transition-colors ${
                selectedUserId === u.id ? "bg-blue-100 text-blue-800 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}>
              {u.fullName}
            </button>
          ))}
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h2 className="text-lg font-bold text-gray-900">{selectedUser?.fullName ?? ""}</h2>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>

        {/* Header + tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {selectedUser ? selectedUser.fullName : "รายงานรายบุคคล"}
            </h2>
            {selectedUser && (
              <p className="text-sm text-gray-400 mt-0.5">
                {tab === "visits" ? filteredVisits.length : filteredSlips.length} รายการ
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selectedUserId && (
              <button onClick={() => window.print()}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition-colors">
                พิมพ์
              </button>
            )}
            {tab === "commissions" && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-2 py-1">
                <button onClick={() => {
                  const [y, m] = commMonth.split("-").map(Number);
                  const d = new Date(y, m - 2, 1);
                  setCommMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 font-bold">‹</button>
                <span className="text-sm font-semibold text-gray-700 min-w-[6rem] text-center">
                  {new Date(commMonth + "-01").toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
                </span>
                <button onClick={() => {
                  const [y, m] = commMonth.split("-").map(Number);
                  const d = new Date(y, m, 1);
                  setCommMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 font-bold">›</button>
              </div>
            )}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {([["visits", "ประวัติการออกทริป"], ["commissions", "รายงานค่าคอม"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => { setTab(key); resetFilters(); }}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    tab === key ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              {/* Visits table */}
              {tab === "visits" && (
                <>
                  <colgroup>
                    <col style={{ width: "2.5rem" }} />
                    <col />
                    <col style={{ width: "7rem" }} />
                    <col style={{ width: "5rem" }} />
                    <col style={{ width: "4.5rem" }} />
                    <col style={{ width: "7rem" }} />
                    <col style={{ width: "7rem" }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-gray-100 bg-blue-600">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">ชื่อร้าน</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">จังหวัด</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">ลูกค้า</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">ผล</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-white">ยอด (บาท)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">วันที่</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedUserId && <tr><td colSpan={7} className="text-center py-20 text-gray-400 text-sm">เลือกชื่อเซลจากรายการด้านซ้าย</td></tr>}
                    {selectedUserId && loading && <tr><td colSpan={7} className="text-center py-20 text-gray-400">กำลังโหลด...</td></tr>}
                    {selectedUserId && !loading && filteredVisits.length === 0 && <tr><td colSpan={7} className="text-center py-20 text-gray-400">ไม่มีรายการ</td></tr>}
                    {!loading && filteredVisits.map((v, i) => {
                      const r = RESULT_LABEL[v.result ?? ""] ?? { label: v.result ?? "—", color: "bg-gray-100 text-gray-500" };
                      return (
                        <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}.</td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {v.shopName}
                            {v.district && <span className="text-xs text-gray-400 block">{v.district}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{v.province}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {v.customerType === "new" || v.customerType === "ใหม่" ? "ใหม่" : "เก่า"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {r.label}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">
                            {v.orderAmount ? v.orderAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(v.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {!loading && filteredVisits.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td colSpan={6} className="px-4 py-3 text-xs font-semibold text-gray-500">{filteredVisits.length} รายการ</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                          {visitTotalAmt.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </>
              )}

              {/* Commission table */}
              {tab === "commissions" && (
                <>
                  <thead>
                    <tr className="border-b border-gray-100 bg-blue-600">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">ชื่อร้าน</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-white">ยอด (บาท)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">หมายเหตุ</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">วันที่</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">สถานะ</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white print:hidden">สลิป</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedUserId && <tr><td colSpan={7} className="text-center py-20 text-gray-400 text-sm">เลือกชื่อเซลจากรายการด้านซ้าย</td></tr>}
                    {selectedUserId && loading && <tr><td colSpan={7} className="text-center py-20 text-gray-400">กำลังโหลด...</td></tr>}
                    {selectedUserId && !loading && filteredSlips.length === 0 && <tr><td colSpan={7} className="text-center py-20 text-gray-400">ไม่มีรายการ</td></tr>}
                    {!loading && filteredSlips.map((s, i) => {
                      const st = SLIP_STATUS[s.slipStatus] ?? { label: s.slipStatus, color: "bg-gray-100 text-gray-500" };
                      return (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}.</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{s.shopName}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">
                            {s.amount != null ? s.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{s.details || "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(s.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            {s.slipUrl ? (
                              <button onClick={() => setPreviewImg(s.slipUrl)} className="text-blue-500 hover:underline text-xs">ดูสลิป</button>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {!loading && filteredSlips.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500">{filteredSlips.length} รายการ</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                          {slipTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  )}
                </>
              )}
            </table>
          </div>
        </div>

        {/* Commission summary table */}
        {tab === "commissions" && selectedUserId && !loadingSlips && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:mt-4">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-sm font-bold text-gray-700">สรุปค่าคอม — {new Date(commMonth + "-01").toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</p>
            </div>
            {commSummaryRow ? (
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-50">
                    <td className="px-5 py-3 text-gray-500">ยอดสลิปสุทธิ (หักหนี้แล้ว)</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-800 tabular-nums">
                      ฿{(commSummaryRow.totalAmount - (commSummaryRow.adjustment ?? 0)).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {(commSummaryRow.adjustment ?? 0) > 0 && (
                    <tr className="border-b border-gray-50 hover:bg-blue-50/50 cursor-pointer" onClick={openAdjLog}>
                      <td className="px-5 py-3 text-blue-600 flex items-center gap-1.5">
                        + ยอดช่วยยอด (admin)
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">ดูรายละเอียด</span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-blue-600 tabular-nums">
                        +฿{commSummaryRow.adjustment.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <td className="px-5 py-3 font-bold text-gray-800">รวมยอดขาย</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-800 tabular-nums">
                      ฿{commSummaryRow.totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-50">
                    <td className="px-5 py-3 text-gray-500">สถานะ</td>
                    <td className="px-5 py-3 text-right">
                      {commSummaryRow.reachedThreshold
                        ? <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">✓ ถึงเป้า</span>
                        : <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">✗ ไม่ถึงเป้า</span>}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-50">
                    <td className="px-5 py-3 font-semibold text-green-700">ค่าคอม</td>
                    <td className="px-5 py-3 text-right font-bold text-green-700 tabular-nums text-base">
                      ฿{commSummaryRow.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {commSummaryRow.outstandingDebt > 0 && (
                    <tr>
                      <td className="px-5 py-3 text-orange-600">ยอดค้างคงเหลือ</td>
                      <td className="px-5 py-3 text-right font-semibold text-orange-600 tabular-nums">
                        ฿{commSummaryRow.outstandingDebt.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-sm text-gray-400 py-8">ไม่มีข้อมูลค่าคอมเดือนนี้</p>
            )}
          </div>
        )}

        {/* Print-only summary */}
        {tab === "visits" && filteredVisits.length > 0 && (
          <div className="hidden print:block mt-6 pt-4 border-t-2 border-gray-300">
            <p className="text-sm font-semibold text-gray-500 mb-3">สรุป</p>
            <div className="flex gap-10">
              <div><p className="text-xs text-gray-500">ออกทริปทั้งหมด</p><p className="text-2xl font-bold">{filteredVisits.length} ครั้ง</p></div>
              <div><p className="text-xs text-gray-500">ซื้อ</p><p className="text-2xl font-bold text-gray-800">{visitBuyCount}</p></div>
              <div><p className="text-xs text-gray-500">ไม่ซื้อ</p><p className="text-2xl font-bold text-gray-800">{visitNoBuyCount}</p></div>
              <div><p className="text-xs text-gray-500">ยอดขายรวม (บาท)</p><p className="text-2xl font-bold">{visitTotalAmt.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p></div>
            </div>
          </div>
        )}
        {tab === "commissions" && filteredSlips.length > 0 && (
          <div className="hidden print:block mt-6 pt-4 border-t-2 border-gray-300">
            <p className="text-sm font-semibold text-gray-500 mb-3">สรุปค่าคอม</p>
            <div className="flex gap-10 flex-wrap">
              <div><p className="text-xs text-gray-500">ยอดสลิปรวม (บาท)</p><p className="text-2xl font-bold">{slipTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p></div>
              {tiers.length > 0
                ? tierBreakdown.filter((t) => t.commission > 0).map((t, i) => (
                  <div key={i}><p className="text-xs text-gray-500">คอม {t.rate}%</p><p className="text-2xl font-bold">{t.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p></div>
                ))
                : flatRate > 0 && <div><p className="text-xs text-gray-500">คอม {flatRate}%</p><p className="text-2xl font-bold">{flatComm.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p></div>
              }
              <div className="border-l border-gray-300 pl-10">
                <p className="text-xs text-gray-500">รวมค่าคอม (บาท)</p>
                <p className="text-2xl font-bold text-green-700">{(tiers.length > 0 ? commAmount : flatComm).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right: filters + summary */}
      <div className="w-56 flex-shrink-0 space-y-3 self-start sticky top-4 print:hidden">
        <div className="bg-pink-50 rounded-2xl border border-pink-100 p-4 space-y-4">
          <p className="font-semibold text-gray-700">ระบบค้นหา</p>

          {/* Date range */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">ช่วงวันที่</label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); if (dateTo && e.target.value > dateTo) setDateTo(""); }}
              className="w-full text-sm border border-pink-200 rounded-lg px-2 py-1.5 mb-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400" />
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400" />
          </div>

          {/* Shop search */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">ชื่อร้าน</label>
            <input type="text" placeholder="ค้นหา..." value={shopSearch} onChange={(e) => setShopSearch(e.target.value)}
              className="w-full text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400" />
          </div>

          {/* Visits-only filters */}
          {tab === "visits" && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">จังหวัด</label>
                <select value={province} onChange={(e) => setProvince(e.target.value)}
                  className="w-full text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400">
                  <option value="">ทุกจังหวัด</option>
                  {visitProvinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">ผลการออกทริป</label>
                <select value={result} onChange={(e) => setResult(e.target.value)}
                  className="w-full text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400">
                  <option value="">ทั้งหมด</option>
                  <option value="buy">ซื้อ</option>
                  <option value="no_buy">ไม่ซื้อ</option>
                  <option value="not_found">ไม่พบ</option>
                </select>
              </div>
            </>
          )}

          {/* Commission-only: amount range */}
          {tab === "commissions" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">ยอดเงิน (บาท)</label>
              <div className="flex gap-1 items-center">
                <input type="number" placeholder="ต่ำสุด" value={minAmt ?? ""}
                  onChange={(e) => setMinAmt(e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-1/2 text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400" />
                <span className="text-gray-400 text-xs">—</span>
                <input type="number" placeholder="สูงสุด" value={maxAmt ?? ""}
                  onChange={(e) => setMaxAmt(e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-1/2 text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400" />
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="pt-2 border-t border-pink-200 space-y-3">
            {tab === "visits" && (
              <>
                <div>
                  <p className="text-xs text-gray-500">ออกทริปทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-800">{filteredVisits.length} <span className="text-sm font-normal text-gray-500">ครั้ง</span></p>
                </div>
                <div className="flex gap-3">
                  <div>
                    <p className="text-xs text-gray-500">ซื้อ</p>
                    <p className="text-lg font-bold text-gray-800">{visitBuyCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">ไม่ซื้อ</p>
                    <p className="text-lg font-bold text-gray-800">{visitNoBuyCount}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">ยอดขายรวม (บาท)</p>
                  <p className="text-xl font-bold text-gray-800 tabular-nums">
                    {visitTotalAmt.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </>
            )}

            {tab === "commissions" && (
              <>
                <div>
                  <p className="text-xs text-gray-500">ยอดขายรวม (บาท)</p>
                  <p className="text-2xl font-bold text-gray-800 tabular-nums">
                    {(commSummaryRow?.totalAmount ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </p>
                  {(commSummaryRow?.adjustment ?? 0) > 0 && (
                    <p className="text-xs text-blue-500 mt-0.5">รวมช่วยยอด +฿{commSummaryRow!.adjustment.toLocaleString("th-TH")}</p>
                  )}
                </div>
                <div className="pt-2 border-t border-pink-200">
                  <p className="text-xs text-gray-500">รวมค่าคอม (บาท)</p>
                  <p className="text-xl font-bold text-green-700 tabular-nums">
                    {(commSummaryRow?.commission ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </p>
                  {commSummaryRow && !commSummaryRow.reachedThreshold && (
                    <p className="text-xs text-gray-400 mt-0.5">ยังไม่ถึงเป้า</p>
                  )}
                </div>
                {(commSummaryRow?.outstandingDebt ?? 0) > 0 && (
                  <div>
                    <p className="text-xs text-orange-500">ยอดค้างคงเหลือ</p>
                    <p className="text-lg font-bold text-orange-600 tabular-nums">
                      ฿{commSummaryRow!.outstandingDebt.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <button onClick={resetFilters}
            className="w-full py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">
            รีเซ็ต
          </button>
        </div>
      </div>

      {/* Adjustment log popup */}
      {showAdjLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAdjLog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">ประวัติช่วยยอดขาย</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedUser?.fullName} · {new Date(commMonth + "-01").toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setShowAdjLog(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {adjLogs.length === 0
                ? <p className="text-center text-sm text-gray-400 py-8">ไม่มีข้อมูล</p>
                : (
                  <div className="space-y-3">
                    {adjLogs.map((log) => (
                      <div key={log.id} className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">เดือน {log.month}</span>
                          <span className="text-sm font-bold text-blue-700 tabular-nums">+฿{log.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                        </div>
                        {log.note && <p className="text-xs text-gray-500 mt-1">{log.note}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">โดย {log.admin?.fullName ?? "—"}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(log.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center">
              <span className="text-xs text-gray-500">{adjLogs.length} รายการ</span>
              <span className="text-sm font-bold text-blue-700">รวม +฿{adjLogs.reduce((s, a) => s + a.amount, 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Slip image preview */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setPreviewImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImg} alt="slip" className="max-w-sm max-h-[85vh] rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
