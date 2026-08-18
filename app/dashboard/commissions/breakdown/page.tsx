"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface SlipRecord {
  id: string;
  shopName: string;
  amount: number | null;
  details: string | null;
  slipUrl: string;
  slipStatus: string;
  createdAt: string;
  debtDeducted?: number | null;
}

interface AdjRecord {
  id: string;
  month: string;
  amount: number;
  type: string;
  note: string | null;
  createdAt: string;
  admin?: { fullName: string };
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface CommissionTier {
  min: number;
  max: number | null;
  rate: number;
}

const ADJ_TYPE_LABEL: Record<string, string> = {
  loan_help:      "ช่วยยอด",
  repayment:      "ชำระคืน",
  debt_carryover: "ยอดค้างยกมา",
};

function calcTierCommission(amount: number, tiers: CommissionTier[]) {
  if (!tiers.length) return { breakdown: [], total: 0 };
  // flat tier: หา tier สูงสุดที่ amount >= tier.min แล้วคิด rate นั้นกับยอดทั้งหมด
  let activeTier = tiers[0];
  for (const t of tiers) {
    if (amount >= t.min) activeTier = t;
  }
  const commission = Math.round(amount * activeTier.rate) / 100;
  return { breakdown: [{ ...activeTier, inRange: amount, commission }], total: commission };
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const thYear = y + 543;
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${months[m - 1]} ${thYear}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    dateFrom: `${ym}-01`,
    dateTo:   `${ym}-${String(last).padStart(2, "0")}`,
  };
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  verified:         { label: "QR ✓",     color: "bg-blue-50 text-blue-700" },
  approved:         { label: "อนุมัติ",   color: "bg-green-50 text-green-700" },
  pending_approval: { label: "รออนุมัติ", color: "bg-amber-50 text-amber-700" },
  rejected:         { label: "ปฏิเสธ",   color: "bg-red-50 text-red-600" },
};

export default function BreakdownPage() {
  const params = useSearchParams();
  const router = useRouter();

  const initUserId = params.get("userId") ?? "";
  const initMonth  = params.get("month")  ?? new Date().toISOString().slice(0, 7);

  const [users, setUsers]                   = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(initUserId);
  const [selectedMonth, setSelectedMonth]   = useState(initMonth);
  const [slips, setSlips]                   = useState<SlipRecord[]>([]);
  const [adjs, setAdjs]                     = useState<AdjRecord[]>([]);
  const [loadingSlips, setLoadingSlips]     = useState(false);
  const [loadingAdjs, setLoadingAdjs]       = useState(false);
  const [tiers, setTiers]                   = useState<CommissionTier[]>([]);
  const [flatRate, setFlatRate]             = useState(0);
  const [previewImg, setPreviewImg]         = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getUsers(), api.getCommissionSettings()])
      .then(([u, s]) => {
        setUsers((u as User[]).filter((x: User) => x.role !== "admin"));
        setTiers((s as any).tiers ?? []);
        setFlatRate((s as any).rate ?? 0);
      })
      .catch(console.error);
  }, []);

  // Reload slips when user or month changes
  useEffect(() => {
    if (!selectedUserId) return;
    setLoadingSlips(true);
    setSlips([]);
    const { dateFrom, dateTo } = monthRange(selectedMonth);
    api.getSlipSubmissions({ filterUserId: selectedUserId, dateFrom, dateTo, limit: 1000 })
      .then((res: any) => setSlips(res?.data ?? []))
      .catch(console.error)
      .finally(() => setLoadingSlips(false));
  }, [selectedUserId, selectedMonth]);

  // Reload all adjustments when user changes; filter by month client-side
  useEffect(() => {
    if (!selectedUserId) return;
    setLoadingAdjs(true);
    api.getUserAdjustments(selectedUserId)
      .then((res: any) => setAdjs(Array.isArray(res) ? res : []))
      .catch(console.error)
      .finally(() => setLoadingAdjs(false));
  }, [selectedUserId]);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const monthAdjs = useMemo(
    () => adjs.filter((a) => a.month === selectedMonth),
    [adjs, selectedMonth],
  );

  const commSlips    = slips.filter((s) => s.slipStatus === "verified" || s.slipStatus === "approved");
  const totalSlip    = commSlips.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalAllSlip = slips.reduce((s, r) => s + (r.amount ?? 0), 0);

  // Only loan_help adjustments count toward the commission base (shown in adj table)
  const loanHelpAdjs    = monthAdjs.filter((a) => a.type === "loan_help");
  const adjustThisMonth = loanHelpAdjs.reduce((s, a) => s + a.amount, 0);

  // debtDeducted จาก slip เดือนนี้ต้องหักออกจากฐานค่าคอม
  const totalDeducted = commSlips.reduce((s, r) => s + (r.debtDeducted ?? 0), 0);

  const totalForComm = totalSlip - totalDeducted + adjustThisMonth;
  const { breakdown: tierBreakdown, total: commTotal } = calcTierCommission(totalForComm, tiers);
  const flatComm = tiers.length === 0 ? Math.round(totalForComm * flatRate) / 100 : 0;

  // ยอดค้างสะสม = ยอดช่วยก่อนเดือนนี้ทั้งหมด + ยอดหักคืนทั้งหมด (ทุกเดือน)
  const priorPositive = adjs.filter((a) => a.month < selectedMonth && a.amount > 0).reduce((s, a) => s + a.amount, 0);
  const allNegative   = adjs.filter((a) => a.amount < 0).reduce((s, a) => s + a.amount, 0);
  const outstandingDebt = Math.max(0, priorPositive + allNegative);

  // รายการที่มาของยอดค้าง: loan_help เดือนก่อน + repayment ทุกเดือน
  const priorLoanHelp = adjs.filter((a) => a.month < selectedMonth && a.amount > 0);
  const allRepayments = adjs.filter((a) => a.amount < 0);

  const todayYm = new Date().toISOString().slice(0, 7);

  return (
    <div className="flex gap-4 min-h-[calc(100vh-5rem)]">

      {/* ── Left: user list ── */}
      <div className="w-44 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden self-start sticky top-4">
        <div className="px-3 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">รายชื่อเซล</p>
        </div>
        <div className="overflow-y-auto max-h-[75vh] p-2">
          {users.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">กำลังโหลด...</p>
          )}
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className={`w-full text-left px-3 py-2.5 text-sm rounded-xl mb-1 transition-colors ${
                selectedUserId === u.id
                  ? "bg-blue-100 text-blue-800 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {u.fullName}
            </button>
          ))}
        </div>
      </div>

      {/* ── Center: content ── */}
      <div className="flex-1 min-w-0 space-y-4">

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

          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">
              {selectedUser ? selectedUser.fullName : "เลือกเซลจากรายการ"}
            </h2>
          </div>

          {/* Month picker */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1 shadow-sm">
            <button
              onClick={() => setSelectedMonth(prevMonth(selectedMonth))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[80px] text-center select-none">
              {monthLabel(selectedMonth)}
            </span>
            <button
              onClick={() => setSelectedMonth(nextMonth(selectedMonth))}
              disabled={selectedMonth >= todayYm}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Slip table ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">รายการสลิป</span>
            {!loadingSlips && slips.length > 0 && (
              <span className="text-xs text-gray-400">{slips.length} รายการ</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-blue-600">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white">ชื่อร้าน</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-white">ยอด</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white">หมายเหตุ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white">วันที่</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white">สถานะ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white">สลิป</th>
                </tr>
              </thead>
              <tbody>
                {!selectedUserId && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                      เลือกชื่อเซลจากรายการด้านซ้าย
                    </td>
                  </tr>
                )}
                {selectedUserId && loadingSlips && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">กำลังโหลด...</td>
                  </tr>
                )}
                {selectedUserId && !loadingSlips && slips.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400 text-sm">
                      ไม่มีรายการสลิปใน{monthLabel(selectedMonth)}
                    </td>
                  </tr>
                )}
                {!loadingSlips && slips.map((s, i) => {
                  const st = STATUS_LABEL[s.slipStatus] ?? { label: s.slipStatus, color: "bg-gray-100 text-gray-500" };
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}.</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{s.shopName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="font-semibold text-gray-800">
                          {s.amount != null
                            ? s.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })
                            : "—"}
                        </span>
                        {s.debtDeducted != null && s.debtDeducted > 0 && (
                          <span className="block text-[10px] text-orange-500 font-medium">
                            หักหนี้ −{s.debtDeducted.toLocaleString("th-TH")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.details || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleDateString("th-TH", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.slipUrl ? (
                          <button
                            onClick={() => setPreviewImg(s.slipUrl)}
                            className="text-blue-500 hover:underline text-xs"
                          >
                            ดูสลิป
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {!loadingSlips && slips.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500">
                      {slips.length} รายการ
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                      {totalAllSlip.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Adjustment section ── */}
        {selectedUserId && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">ยอดช่วยเหลือ / ปรับยอด</span>
              <span className="text-xs text-gray-400">{monthLabel(selectedMonth)}</span>
            </div>
            {loadingAdjs ? (
              <p className="text-center py-10 text-gray-400 text-sm">กำลังโหลด...</p>
            ) : loanHelpAdjs.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm">
                ไม่มีการช่วยยอดใน{monthLabel(selectedMonth)}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-violet-600">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">ประเภท</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-white">ยอด</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">หมายเหตุ</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">บันทึกโดย</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-white">วันที่บันทึก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanHelpAdjs.map((a, i) => (
                      <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}.</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            a.type === "loan_help"
                              ? "bg-violet-50 text-violet-700"
                              : a.type === "repayment"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {ADJ_TYPE_LABEL[a.type] ?? a.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          <span className={a.type === "repayment" ? "text-red-600" : "text-violet-700"}>
                            {a.type === "repayment" ? "−" : "+"}
                            ฿{Math.abs(a.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{a.note || "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{a.admin?.fullName ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(a.createdAt).toLocaleDateString("th-TH", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500">
                        {loanHelpAdjs.length} รายการ
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-violet-700">
                        {adjustThisMonth >= 0 ? "+" : ""}
                        ฿{adjustThisMonth.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Right: summary ── */}
      <div className="w-56 flex-shrink-0 space-y-3 self-start sticky top-4">
        <div className="bg-pink-50 rounded-2xl border border-pink-100 p-4 space-y-4">
          <p className="font-semibold text-gray-700">สรุป {monthLabel(selectedMonth)}</p>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">ยอดสลิปสุทธิ (QR ✓ + อนุมัติ)</p>
              <p className="text-xl font-bold text-gray-800 tabular-nums">
                ฿{totalSlip.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </p>
              {commSlips.length > 0 && (
                <p className="text-xs text-gray-400">{commSlips.length} สลิป</p>
              )}
            </div>

            {totalDeducted > 0 && (
              <div>
                <p className="text-xs text-gray-500">− หักหนี้เดือนนี้</p>
                <p className="text-xl font-bold text-orange-600 tabular-nums">
                  −฿{totalDeducted.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {adjustThisMonth !== 0 && (
              <div>
                <p className="text-xs text-gray-500">+ ยอดช่วยเดือนนี้</p>
                <p className="text-xl font-bold text-violet-700 tabular-nums">
                  +฿{adjustThisMonth.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-pink-200">
              <p className="text-xs text-gray-500">= ยอดคำนวณค่าคอม</p>
              <p className="text-2xl font-bold text-gray-800 tabular-nums">
                ฿{totalForComm.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </p>
            </div>

            {tiers.length > 0 ? (
              tierBreakdown
                .filter((t) => t.commission > 0)
                .map((t, i) => (
                  <div key={i}>
                    <p className="text-xs text-gray-500">คอม {t.rate}%</p>
                    <p className="text-lg font-bold text-gray-800 tabular-nums">
                      ฿{t.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
            ) : flatRate > 0 ? (
              <div>
                <p className="text-xs text-gray-500">คอม {flatRate}%</p>
                <p className="text-lg font-bold text-gray-800 tabular-nums">
                  ฿{flatComm.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            ) : null}

            {(tiers.length > 0 || flatRate > 0) && totalForComm > 0 && (
              <div className="pt-2 border-t border-pink-200">
                <p className="text-xs text-gray-500">รวมค่าคอม (บาท)</p>
                <p className="text-xl font-bold text-green-700 tabular-nums">
                  ฿{(tiers.length > 0 ? commTotal : flatComm).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ยอดค้างสะสม */}
        {(priorLoanHelp.length > 0 || allRepayments.length > 0) && (
          <div className={`rounded-2xl border p-4 space-y-2 ${outstandingDebt > 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}`}>
            <p className={`text-xs font-semibold ${outstandingDebt > 0 ? "text-orange-700" : "text-green-700"}`}>ยอดค้างสะสม</p>
            <p className={`text-xl font-bold tabular-nums ${outstandingDebt > 0 ? "text-orange-600" : "text-green-600"}`}>
              ฿{outstandingDebt.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${outstandingDebt > 0 ? "text-orange-500" : "text-green-600 font-medium"}`}>
              {outstandingDebt > 0 ? "จะถูกหักจากค่าคอมเดือนถัดไป" : "ชำระคืนครบแล้ว"}
            </p>
            {(priorLoanHelp.length > 0 || allRepayments.length > 0) && (
              <div className={`pt-2 border-t space-y-1 ${outstandingDebt > 0 ? "border-orange-200" : "border-green-200"}`}>
                <p className={`text-xs font-medium ${outstandingDebt > 0 ? "text-orange-600" : "text-green-700"}`}>รายละเอียด</p>
                {priorLoanHelp.map((a) => (
                  <div key={a.id} className={`flex justify-between text-xs ${outstandingDebt > 0 ? "text-orange-700" : "text-green-700"}`}>
                    <span>ช่วยยอด {a.month}</span>
                    <span className="tabular-nums font-medium">+฿{a.amount.toLocaleString("th-TH")}</span>
                  </div>
                ))}
                {allRepayments.map((a) => (
                  <div key={a.id} className="space-y-0.5">
                    <button
                      onClick={() => setSelectedMonth(a.month)}
                      className="w-full flex justify-between text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded px-1 -mx-1 transition-colors text-left"
                    >
                      <span className="underline underline-offset-2">หักคืน {a.month}</span>
                      <span className="tabular-nums font-medium text-red-500">-฿{Math.abs(a.amount).toLocaleString("th-TH")}</span>
                    </button>
                    {a.note && (
                      <p className="text-[10px] text-gray-400 px-1 leading-tight">{a.note}</p>
                    )}
                  </div>
                ))}
                <div className={`flex justify-between text-xs font-bold pt-1 border-t ${outstandingDebt > 0 ? "text-orange-800 border-orange-200" : "text-green-800 border-green-200"}`}>
                  <span>คงเหลือ</span>
                  <span className="tabular-nums">฿{outstandingDebt.toLocaleString("th-TH")}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slip image preview */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewImg(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImg}
            alt="slip"
            className="max-w-sm max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
