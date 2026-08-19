"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────
interface UserSummary {
  userId: string;
  user: { fullName: string; email: string; bankName?: string; bankAccount?: string };
  visitCount: number;
  slipAmount: number;       // ยอดสลิปสุทธิ
  adjustThisMonth: number;  // ยอดเติมเดือนนี้
  adjustCarryover: number;  // ยอดเติมยกมา
  totalAmount: number;      // ยอดคำนวณ = slipAmount + adjustThisMonth + adjustCarryover
  outstandingDebt: number;
  reachedThreshold: boolean;
  commission: number;
  pendingCount: number;
}
interface OverdueRow extends UserSummary {
  month: string;
  monthsAgo: number;
}
interface CommissionData {
  month: string;
  settings: { rate: number; threshold: number };
  summary: UserSummary[];
}
interface BreakdownVisit {
  id: string; shopName: string; province: string; district?: string;
  orderAmount: number; slipUrl?: string; slipStatus: string; transRef?: string; createdAt: string;
}
interface Payment {
  id: string; userId: string; month: string; amount: number; paidAt: string;
  note?: string; slipUrl?: string;
  user: { id: string; fullName: string; email: string; bankName?: string; bankAccount?: string };
  admin: { fullName: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
const STATUS_OPTS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "reached", label: "ต้องจ่าย" },
  { value: "not_reached", label: "ไม่ถึงเป้า" },
];
const SLIP_STATUS_LABEL: Record<string, string> = { verified: "QR ✓", approved: "อนุมัติแล้ว", "": "ข้อมูลเก่า" };

// ─── Breakdown Modal ─────────────────────────────────────────────────────────
function BreakdownModal({ userId, month, user, onClose }: {
  userId: string; month: string;
  user: { fullName: string; email: string };
  onClose: () => void;
}) {
  const [visits, setVisits] = useState<BreakdownVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  useEffect(() => {
    api.getCommissionBreakdown(userId, month)
      .then(setVisits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, month]);

  const total = visits.reduce((s, v) => s + (v.orderAmount ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">รายการออเดอร์ — {user.fullName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">เดือน {month} · รายการที่นับเป็นค่าคอม</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">กำลังโหลด...</div>
          ) : visits.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">ไม่มีรายการ</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">สลิป</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">ร้านค้า</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">สถานะสลิป</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">เลข Ref</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">ยอด (บาท)</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">วันที่</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
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
                      <p className="text-xs text-gray-400">{v.district ? `${v.province} · ${v.district}` : v.province}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        v.slipStatus === "verified" ? "bg-blue-50 text-blue-700"
                        : v.slipStatus === "approved" ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                      }`}>
                        {SLIP_STATUS_LABEL[v.slipStatus ?? ""] ?? v.slipStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{v.transRef || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">฿{(v.orderAmount ?? 0).toLocaleString("th-TH")}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(v.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer total */}
        {!loading && visits.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between rounded-b-2xl">
            <span className="text-xs text-gray-500">{visits.length} รายการ</span>
            <span className="font-bold text-green-700">รวม ฿{total.toLocaleString("th-TH")}</span>
          </div>
        )}
      </div>

      {/* Slip preview */}
      {previewImg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImg} alt="slip" className="max-w-sm max-h-[85vh] rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ─── Pay Modal ───────────────────────────────────────────────────────────────
function PayModal({ row, month, onClose, onDone }: {
  row: UserSummary; month: string; onClose: () => void; onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setSlip(f);
    setSlipPreview(URL.createObjectURL(f));
  }

  async function handlePay() {
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("userId", row.userId);
      fd.append("month", month);
      fd.append("amount", String(row.commission));
      if (note) fd.append("note", note);
      if (slip) fd.append("slip", slip);
      await api.createCommissionPayment(fd);
      onDone();
    } catch { setError("เกิดข้อผิดพลาด กรุณาลองใหม่"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">บันทึกการจ่ายค่าคอม</h3>
          <p className="text-xs text-gray-400 mt-0.5">{row.user.fullName} · เดือน {month}</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Bank info */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">ธนาคาร</span>
              <span className="font-semibold text-gray-800">{row.user.bankName || <span className="text-red-400">ยังไม่กรอก</span>}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">เลขบัญชี</span>
              <span className="font-semibold text-gray-800 font-mono">{row.user.bankAccount || <span className="text-red-400">ยังไม่กรอก</span>}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5 mt-1.5">
              <span className="text-gray-500">ยอดที่จ่าย</span>
              <span className="font-bold text-amber-600 text-base">฿{row.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Slip upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">หลักฐานการโอน (ถ้ามี)</label>
            {slipPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slipPreview} alt="slip" className="w-full max-h-40 object-contain rounded-xl border border-gray-100" />
                <button onClick={() => { setSlip(null); setSlipPreview(null); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full shadow text-gray-500 text-xs flex items-center justify-center hover:bg-red-50 hover:text-red-500">✕</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-500 transition-colors">
                📎 เลือกรูปสลิปโอนเงิน
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">หมายเหตุ</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น โอนแล้ว 22/06/69"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
              ยกเลิก
            </button>
            <button onClick={handlePay} disabled={saving}
              className="flex-1 py-2.5 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl disabled:opacity-60">
              {saving ? "กำลังบันทึก..." : "✓ บันทึกการจ่าย"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Adjust Modal ────────────────────────────────────────────────────────────
function AdjustModal({ row, month, onClose, onDone }: {
  row: UserSummary; month: string; onClose: () => void; onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) { setError("กรุณาใส่ยอดที่ถูกต้อง"); return; }
    if (num > 50000) { setError("ช่วยยอดได้ไม่เกิน 50,000 บาทต่อครั้ง"); return; }
    setSaving(true); setError("");
    try {
      await api.createCommissionAdjustment({ userId: row.userId, month, amount: num, note: note || undefined });
      onDone();
    } catch { setError("เกิดข้อผิดพลาด กรุณาลองใหม่"); }
    finally { setSaving(false); }
  }

  const num = parseFloat(amount) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">ช่วยยอดขาย</h3>
          <p className="text-xs text-gray-400 mt-0.5">{row.user.fullName} · เดือน {month}</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">ยอดที่ช่วย (บาท)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="เช่น 50000"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
          </div>
          {num !== 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
              <p>เพิ่มยอดขายเดือนนี้ <span className="font-bold">+฿{Math.abs(num).toLocaleString("th-TH")}</span> ให้ {row.user.fullName}</p>
              <p className="text-orange-500 font-medium">ยอดนี้จะถูกหักคืนในการคำนวณเดือนหน้า (ไม่ใช่เดือนนี้)</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">หมายเหตุ</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ช่วยยอดเพื่อถึงเป้า"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl disabled:opacity-60">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Month Picker ─────────────────────────────────────────────────────────────
const MONTH_NAMES_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function MonthPicker({ value, onChange, maxValue }: { value: string; onChange: (v: string) => void; maxValue?: string }) {
  const [open, setOpen] = useState(false);
  const [pickYear, setPickYear] = useState(() => parseInt(value.split("-")[0]));
  const ref = useRef<HTMLDivElement>(null);

  const [curY, curM] = value.split("-").map(Number);
  const [maxY, maxM] = maxValue ? maxValue.split("-").map(Number) : [9999, 12];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function select(m: number) {
    onChange(`${pickYear}-${String(m).padStart(2, "0")}`);
    setOpen(false);
  }

  const label = new Date(value + "-01").toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setPickYear(curY); setOpen((o) => !o); }}
        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {label}
        <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setPickYear((y) => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-base">‹</button>
            <span className="text-sm font-bold text-gray-800">
              {new Date(pickYear, 0, 1).toLocaleDateString("th-TH", { year: "numeric" })}
            </span>
            <button onClick={() => setPickYear((y) => y + 1)}
              disabled={pickYear >= maxY}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-base disabled:opacity-30 disabled:cursor-not-allowed">›</button>
          </div>
          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTH_NAMES_TH.map((name, i) => {
              const m = i + 1;
              const isSelected = pickYear === curY && m === curM;
              const isDisabled = pickYear > maxY || (pickYear === maxY && m > maxM);
              return (
                <button key={m} onClick={() => !isDisabled && select(m)} disabled={isDisabled}
                  className={`py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isSelected ? "bg-green-500 text-white" :
                    isDisabled ? "text-gray-300 cursor-not-allowed" :
                    "hover:bg-green-50 text-gray-700"
                  }`}>
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Tab ─────────────────────────────────────────────────────────────

function HistoryTab() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  // Filters
  const [historyMonth, setHistoryMonth] = useState(getCurrentMonth());
  const [slipFilter, setSlipFilter] = useState("all");
  const [search, setSearch] = useState("");

  const currentMonth = getCurrentMonth();
  const isCurrentMonth = historyMonth === currentMonth;

  useEffect(() => {
    setSearch("");
    setLoading(true);
    api.getCommissionPayments(historyMonth)
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [historyMonth]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (slipFilter === "has_slip" && !p.slipUrl) return false;
      if (slipFilter === "no_slip" && p.slipUrl) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!p.user.fullName.toLowerCase().includes(q) && !p.user.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [payments, slipFilter, search]);

  const total = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
        <MonthPicker value={historyMonth} onChange={setHistoryMonth} maxValue={currentMonth} />
        <div className="border-t border-gray-100" />
        {/* Slip filter + search */}
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { value: "all", label: "ทั้งหมด" },
            { value: "has_slip", label: "มีสลิปโอน" },
            { value: "no_slip", label: "ไม่มีสลิป" },
          ].map((opt) => (
            <button key={opt.value} onClick={() => setSlipFilter(opt.value)}
              className={`px-3.5 py-1.5 text-sm rounded-xl font-medium transition-colors ${
                slipFilter === opt.value ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {opt.label}
            </button>
          ))}
          <div className="relative min-w-[180px]">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${search ? "text-green-200" : "text-gray-400"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input type="text" placeholder="ค้นหาชื่อ..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${
                search ? "bg-green-500 text-white placeholder:text-green-200" : "bg-gray-100 text-gray-600 placeholder:text-gray-400"
              }`} />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-xl hover:bg-gray-100">ล้าง</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">สลิปโอน</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">เซล</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ธนาคาร</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ยอดที่จ่าย</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">หมายเหตุ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">จ่ายโดย</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">วันที่จ่าย</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <p className="text-2xl mb-2">💸</p>
                    <p className="text-sm font-semibold text-gray-600">
                      {payments.length === 0 ? `ยังไม่มีการบันทึกการจ่ายในเดือน ${historyMonth}` : "ไม่พบรายการที่ตรงกับ filter"}
                    </p>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/dashboard/commissions/breakdown?userId=${p.userId}&month=${p.month}&name=${encodeURIComponent(p.user.fullName)}`)}
                  className="border-b border-gray-50 hover:bg-green-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    {p.slipUrl ? (
                      <button onClick={(e) => { e.stopPropagation(); setPreviewImg(p.slipUrl!); }} className="focus:outline-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.slipUrl} alt="proof" className="w-10 h-10 object-cover rounded-lg border border-gray-100 hover:opacity-80" />
                      </button>
                    ) : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">—</div>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{p.user.fullName}</p>
                    <p className="text-xs text-gray-400">{p.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {p.user.bankName ? (
                      <div>
                        <p className="text-sm font-medium text-gray-700">{p.user.bankName}</p>
                        <p className="text-xs text-gray-500 font-mono">{p.user.bankAccount}</p>
                      </div>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">฿{p.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.note || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.admin.fullName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(p.paidAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    <br />{new Date(p.paidAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-500">
                    แสดง {filtered.length} จาก {payments.length} รายการ
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">฿{total.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setPreviewImg(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImg} alt="proof" className="max-w-sm max-h-[85vh] rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

    </div>
  );
}

// ─── Adj Detail Modal ────────────────────────────────────────────────────────
interface AdjRecord {
  id: string; month: string; amount: number; note?: string; createdAt: string;
  admin: { fullName: string };
}

interface SlipBreakdown {
  id: string;
  shopName: string;
  amount: number;
  debtDeducted: number;
  netAmount: number;
  createdAt: string;
}

function AdjDetailModal({ row, currentMonth, onClose }: {
  row: UserSummary; currentMonth: string; onClose: () => void;
}) {
  const [records, setRecords] = useState<AdjRecord[]>([]);
  const [slips, setSlips] = useState<SlipBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getUserAdjustments(row.userId),
      api.getCommissionBreakdown(row.userId, currentMonth),
    ])
      .then(([adjs, breakdown]: [AdjRecord[], SlipBreakdown[]]) => {
        setRecords(adjs);
        setSlips(breakdown.filter((s) => (s.debtDeducted ?? 0) > 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [row.userId, currentMonth]);

  const positives = records.filter((r) => r.amount > 0);
  const thisMonth = positives.filter((r) => r.month === currentMonth);
  const carryover = positives.filter((r) => r.month < currentMonth);
  const totalPositive = positives.reduce((s, r) => s + r.amount, 0);
  const totalDeducted = slips.reduce((s, r) => s + (r.debtDeducted ?? 0), 0);

  function fmtMonth(m: string) {
    const [y, mo] = m.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">ยอดช่วยยอด — {row.user.fullName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">ยอดรวมที่ช่วย ฿{totalPositive.toLocaleString("th-TH")}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && <p className="text-center text-sm text-gray-400 py-8">กำลังโหลด...</p>}

          {!loading && positives.length === 0 && slips.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">ไม่มีรายการ</p>
          )}

          {/* เดือนนี้ */}
          {thisMonth.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">
                ช่วยเดือนนี้ ({fmtMonth(currentMonth)})
              </p>
              <div className="space-y-2">
                {thisMonth.map((r) => (
                  <div key={r.id} className="flex items-start justify-between bg-blue-50 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm text-gray-700">{r.note || "—"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        โดย {r.admin.fullName} · {new Date(r.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-blue-600 whitespace-nowrap">+฿{r.amount.toLocaleString("th-TH")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ยกมา */}
          {carryover.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 mb-2 uppercase tracking-wide">
                ยกมาจากเดือนก่อน ({carryover.length} รายการ)
              </p>
              <div className="space-y-2">
                {carryover.map((r) => (
                  <div key={r.id} className="flex items-start justify-between bg-amber-50 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">{fmtMonth(r.month)}</p>
                      <p className="text-sm text-gray-700">{r.note || "—"}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        โดย {r.admin.fullName} · {new Date(r.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-amber-600 whitespace-nowrap">+฿{r.amount.toLocaleString("th-TH")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slip ที่ถูกหักยอดค้าง */}
          {slips.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-rose-600 mb-2 uppercase tracking-wide">
                หักคืนผ่าน Slip ({slips.length} รายการ)
              </p>
              <div className="space-y-2">
                {slips.map((s) => (
                  <div key={s.id} className="bg-rose-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm text-gray-700 font-medium">{s.shopName || "—"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(s.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-rose-600">−฿{(s.debtDeducted ?? 0).toLocaleString("th-TH")}</p>
                        <p className="text-xs text-gray-400">จาก ฿{s.amount.toLocaleString("th-TH")}</p>
                      </div>
                    </div>
                    {/* progress bar แสดงสัดส่วนที่หัก */}
                    <div className="mt-2 h-1.5 bg-rose-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.round(((s.debtDeducted ?? 0) / s.amount) * 100))}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      สุทธิจาก slip นี้ ฿{s.netAmount.toLocaleString("th-TH")}
                      {" "}({Math.round(((s.debtDeducted ?? 0) / s.amount) * 100)}% ถูกหัก)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer summary */}
        {!loading && (positives.length > 0 || slips.length > 0) && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl space-y-1.5">
            {thisMonth.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ยอดช่วยเดือนนี้</span>
                <span className="font-semibold text-blue-600">+฿{thisMonth.reduce((s, r) => s + r.amount, 0).toLocaleString("th-TH")}</span>
              </div>
            )}
            {carryover.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ยอดยกมา</span>
                <span className="font-semibold text-amber-600">+฿{carryover.reduce((s, r) => s + r.amount, 0).toLocaleString("th-TH")}</span>
              </div>
            )}
            {totalDeducted > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">หักคืนแล้ว (เดือนนี้)</span>
                <span className="font-semibold text-rose-600">−฿{totalDeducted.toLocaleString("th-TH")}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-gray-200 pt-1.5">
              <span className="font-semibold text-gray-700">ยอดค้างคงเหลือ</span>
              <span className={`font-bold ${row.outstandingDebt > 0 ? "text-orange-600" : "text-green-600"}`}>
                {row.outstandingDebt > 0 ? `฿${row.outstandingDebt.toLocaleString("th-TH")}` : "หักคืนครบแล้ว"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Report Tab ──────────────────────────────────────────────────────────────
function ReportTab({ payments: parentPayments, defaultMonth }: {
  payments: Payment[];
  defaultMonth: string;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<CommissionData | null>(null);
  const [payments, setPayments] = useState<Payment[]>(parentPayments);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getCommissionSummary(month), api.getCommissionPayments(month)])
      .then(([summary, pays]) => { setData(summary); setPayments(pays); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  const paidSet = useMemo(() => new Set(payments.map((p) => p.userId)), [payments]);
  // รายงานแสดงเฉพาะคนที่ถึงเป้าเท่านั้น
  const rows = (data?.summary ?? []).filter((r) => r.reachedThreshold);
  const monthLabel = new Date(month + "-01").toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  const totalSlip      = rows.reduce((s, r) => s + r.slipAmount, 0);
  const totalCarryover = rows.reduce((s, r) => s + r.adjustCarryover, 0);
  const totalThisMonth = rows.reduce((s, r) => s + r.adjustThisMonth, 0);
  const totalCalc      = rows.reduce((s, r) => s + r.totalAmount, 0);
  const totalComm      = rows.reduce((s, r) => s + r.commission, 0);
  const totalDebt      = rows.reduce((s, r) => s + r.outstandingDebt, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <p className="text-sm font-semibold text-gray-700">รายงานค่าคอมมิชชัน — {monthLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            สูตร: ยอดสลิปสุทธิ + ยอดช่วยยกมา + ยอดช่วยเดือนนี้ = ยอดคำนวณ → ×{data?.settings.rate ?? "?"}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker value={month} onChange={setMonth} />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            พิมพ์เอกสาร
          </button>
        </div>
      </div>

      {/* Print header — visible only on print */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">รายงานค่าคอมมิชชัน</h1>
        <p className="text-sm text-gray-500 mt-1">เดือน {monthLabel} · อัตรา {data?.settings.rate}% · ขั้นต่ำ ฿{data?.settings.threshold.toLocaleString("th-TH")}</p>
        <p className="text-xs text-gray-400 mt-0.5">สูตร: ยอดสลิปสุทธิ + ยอดช่วยยกมา + ยอดช่วยเดือนนี้ = ยอดคำนวณ × {data?.settings.rate}%</p>
      </div>

      {/* Legend — ยอดช่วยยอด คืออะไร */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700 space-y-1 print:hidden">
        <p><span className="font-semibold">ช่วยยกมา</span> = ยอด loan_help จากเดือนก่อนๆ สุทธิ (หักคืนที่ชำระไปแล้ว) → <span className="font-semibold">นับในสูตร</span></p>
        <p><span className="font-semibold">ช่วยเดือนนี้</span> = loan_help เฉพาะเดือนที่ดู → <span className="font-semibold">นับในสูตร</span>: สลิปสุทธิ + ยกมา + ช่วยเดือนนี้ = ยอดคำนวณ</p>
        <p><span className="font-semibold text-orange-600">ยอดค้าง</span> = ยอดรวมทั้งหมดที่ยังไม่ได้หักคืน → หักผ่าน slip เมื่อลูกค้าชำระ</p>
      </div>

      {/* Table — screen only */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">#</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">ชื่อเซล</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-600">ยอดสลิปสุทธิ</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-blue-500">+ช่วยยกมา</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-blue-500">+ช่วยเดือนนี้</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-800">=ยอดคำนวณ</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-amber-600">ค่าคอม</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-orange-500">ยอดค้าง*</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">ธนาคาร</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">กำลังโหลด...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">ไม่มีข้อมูล</td></tr>}
              {rows.map((row, i) => {
                const paid = paidSet.has(row.userId);
                const hasAdj = row.adjustCarryover > 0 || row.adjustThisMonth > 0;
                return (
                  <tr key={row.userId} className="border-b border-gray-50">
                    <td className="px-3 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{row.user.fullName}</p>
                        {paid
                          ? <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">จ่ายแล้ว</span>
                          : <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">รอจ่าย</span>}
                      </div>
                      <p className="text-xs text-gray-400">{row.user.email}</p>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700">฿{row.slipAmount.toLocaleString("th-TH")}</td>
                    <td className="px-3 py-3 text-right">
                      {row.adjustCarryover > 0 ? <span className="text-blue-500 font-medium">+฿{row.adjustCarryover.toLocaleString("th-TH")}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.adjustThisMonth > 0 ? <span className="text-blue-500 font-medium">+฿{row.adjustThisMonth.toLocaleString("th-TH")}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`px-3 py-3 text-right font-bold ${hasAdj ? "text-gray-900" : "text-gray-700"}`}>
                      ฿{row.totalAmount.toLocaleString("th-TH")}
                    </td>
                    <td className="px-3 py-3 text-right font-bold">
                      {row.commission > 0 ? <span className="text-amber-600">฿{row.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.outstandingDebt > 0 ? <span className="text-orange-500 font-medium">฿{row.outstandingDebt.toLocaleString("th-TH")}</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      {row.user.bankName
                        ? <div><p className="text-sm text-gray-700">{row.user.bankName}</p><p className="text-xs text-gray-400 font-mono">{row.user.bankAccount}</p></div>
                        : <span className="text-xs text-red-400 font-semibold">ยังไม่กรอก</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={2} className="px-3 py-3 text-xs font-semibold text-gray-500">รวม {rows.length} คน</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-700">฿{totalSlip.toLocaleString("th-TH")}</td>
                  <td className="px-3 py-3 text-right font-semibold text-blue-500">{totalCarryover > 0 ? `+฿${totalCarryover.toLocaleString("th-TH")}` : "—"}</td>
                  <td className="px-3 py-3 text-right font-semibold text-blue-500">{totalThisMonth > 0 ? `+฿${totalThisMonth.toLocaleString("th-TH")}` : "—"}</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-900">฿{totalCalc.toLocaleString("th-TH")}</td>
                  <td className="px-3 py-3 text-right font-bold text-amber-600">฿{totalComm.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-3 text-right font-semibold text-orange-500">{totalDebt > 0 ? `฿${totalDebt.toLocaleString("th-TH")}` : "—"}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Footnote — screen only */}
      <div className="text-xs text-gray-400 space-y-0.5 print:hidden">
        <p>* ยอดค้าง = ยอดที่ admin ช่วยยอดไว้ยังไม่หักคืน → จะถูกนำไปหักออกจากค่าคอมในเดือนถัดไปโดยอัตโนมัติ</p>
        <p>อัตราค่าคอม {data?.settings.rate}% คำนวณจากยอดคำนวณ เมื่อถึงขั้นต่ำ ฿{data?.settings.threshold.toLocaleString("th-TH")}</p>
      </div>

      {/* Print-only document — clean, no web design */}
      <div className="hidden print:block">
        <style>{`
          @page { size: A4 landscape; margin: 15mm 12mm; }
          @media print {
            .print-doc table { width: 100%; border-collapse: collapse; font-size: 10pt; font-family: 'TH Sarabun New', Sarabun, sans-serif; }
            .print-doc th { border: 1px solid #000; padding: 5px 7px; background: #f0f0f0; font-weight: 600; white-space: nowrap; }
            .print-doc td { border: 1px solid #888; padding: 5px 7px; white-space: nowrap; }
            .print-doc tfoot td { border-top: 2px solid #000; font-weight: 700; background: #f0f0f0; }
            .print-doc .text-right { text-align: right; }
            .print-doc .text-center { text-align: center; }
          }
        `}</style>
        <div className="print-doc">
          <table>
            <colgroup>
              <col style={{ width: "28px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "80px" }} />
              <col style={{ width: "85px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "80px" }} />
              <col style={{ width: "75px" }} />
              <col style={{ width: "80px" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="text-center">#</th>
                <th>ชื่อเซล</th>
                <th className="text-right">ยอดสลิปสุทธิ</th>
                <th className="text-right">+ช่วยยกมา</th>
                <th className="text-right">+ช่วยเดือนนี้</th>
                <th className="text-right">=ยอดคำนวณ</th>
                <th className="text-right">ค่าคอม</th>
                <th className="text-right">ยอดค้าง</th>
                <th className="text-center">สถานะ</th>
                <th>ธนาคาร / เลขบัญชี</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={10} className="text-center" style={{ padding: "12px" }}>ไม่มีข้อมูล</td></tr>
              )}
              {rows.map((row, i) => {
                const paid = paidSet.has(row.userId);
                return (
                  <tr key={row.userId}>
                    <td className="text-center" style={{ color: "#555" }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{row.user.fullName}</td>
                    <td className="text-right">฿{row.slipAmount.toLocaleString("th-TH")}</td>
                    <td className="text-right">{row.adjustCarryover > 0 ? `+฿${row.adjustCarryover.toLocaleString("th-TH")}` : "—"}</td>
                    <td className="text-right">{row.adjustThisMonth > 0 ? `+฿${row.adjustThisMonth.toLocaleString("th-TH")}` : "—"}</td>
                    <td className="text-right" style={{ fontWeight: 700 }}>฿{row.totalAmount.toLocaleString("th-TH")}</td>
                    <td className="text-right" style={{ fontWeight: 700 }}>฿{row.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                    <td className="text-right">{row.outstandingDebt > 0 ? `฿${row.outstandingDebt.toLocaleString("th-TH")}` : "—"}</td>
                    <td className="text-center">{paid ? "จ่ายแล้ว" : "รอจ่าย"}</td>
                    <td>
                      {row.user.bankName
                        ? `${row.user.bankName}  ${row.user.bankAccount ?? ""}`
                        : "ยังไม่กรอกบัญชี"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>รวม {rows.length} คน</td>
                <td className="text-right">฿{totalSlip.toLocaleString("th-TH")}</td>
                <td className="text-right">{totalCarryover > 0 ? `+฿${totalCarryover.toLocaleString("th-TH")}` : "—"}</td>
                <td className="text-right">{totalThisMonth > 0 ? `+฿${totalThisMonth.toLocaleString("th-TH")}` : "—"}</td>
                <td className="text-right">฿{totalCalc.toLocaleString("th-TH")}</td>
                <td className="text-right">฿{totalComm.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                <td className="text-right">{totalDebt > 0 ? `฿${totalDebt.toLocaleString("th-TH")}` : "—"}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          <p style={{ fontSize: "8pt", color: "#555", marginTop: "8px" }}>
            * ยอดค้าง = ยอดช่วยยอดที่ยังไม่หักคืน จะถูกหักออกจากค่าคอมเดือนถัดไปโดยอัตโนมัติ
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Overdue Tab ─────────────────────────────────────────────────────────────
function OverdueTab({ rows, loading, onRefresh }: {
  rows: OverdueRow[]; loading: boolean; onRefresh: () => void;
}) {
  const [payingRow, setPayingRow] = useState<OverdueRow | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm">
        กำลังโหลด...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
        <p className="text-3xl mb-3">✅</p>
        <p className="text-sm font-semibold text-gray-600">ไม่มียอดค้างจ่าย</p>
        <p className="text-xs text-gray-400 mt-1">ค่าคอมทุกเดือนถูกจ่ายครบแล้ว</p>
      </div>
    );
  }

  const totalOverdue = rows.reduce((s, r) => s + r.commission, 0);

  return (
    <>
      {/* Summary strip */}
      <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3">
        <span className="text-amber-600 text-lg">⚠</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800">
            มี {rows.length} รายการค้างจ่าย จาก {new Set(rows.map(r => r.month)).size} เดือน
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            รวมค่าคอมที่ยังไม่ได้จ่าย ฿{totalOverdue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-amber-500">
                <th className="text-left px-4 py-3 text-xs font-semibold text-white">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white whitespace-nowrap">เดือน</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white whitespace-nowrap">ค้างมา</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white">เซล</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white">ธนาคาร</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-white">ค่าคอม</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-white">การจ่าย</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const noBankInfo = !row.user.bankName || !row.user.bankAccount;
                return (
                  <tr key={`${row.userId}-${row.month}`}
                    className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {MONTH_NAMES_TH[parseInt(row.month.split("-")[1]) - 1]} {parseInt(row.month.split("-")[0]) + 543}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                        row.monthsAgo >= 3 ? "bg-red-100 text-red-700"
                        : row.monthsAgo === 2 ? "bg-orange-100 text-orange-700"
                        : "bg-amber-100 text-amber-700"
                      }`}>
                        {row.monthsAgo} เดือน
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{row.user.fullName}</p>
                      <p className="text-xs text-gray-400">{row.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {!noBankInfo ? (
                        <div>
                          <p className="text-sm font-medium text-gray-700">{row.user.bankName}</p>
                          <p className="text-xs text-gray-500 font-mono">{row.user.bankAccount}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-red-500 font-semibold">⚠ ยังไม่กรอก</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700 tabular-nums">
                      ฿{row.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setPayingRow(row)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                      >
                        บันทึกการจ่าย
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-500">
                  รวม {rows.length} รายการ
                </td>
                <td className="px-4 py-3 text-right font-bold text-amber-700 tabular-nums">
                  ฿{totalOverdue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {payingRow && (
        <PayModal
          row={payingRow}
          month={payingRow.month}
          onClose={() => setPayingRow(null)}
          onDone={() => { setPayingRow(null); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function CommissionsPage() {
  const month = getCurrentMonth();
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<"calc" | "history" | "report" | "overdue">("calc");
  const [overdueRows, setOverdueRows] = useState<OverdueRow[]>([]);
  const [loadingOverdue, setLoadingOverdue] = useState(false);

  const [statusFilter, setStatusFilter] = useState("reached");
  const [search, setSearch] = useState("");

  const router = useRouter();
  const [payingRow, setPayingRow] = useState<UserSummary | null>(null);
  const [adjustingRow, setAdjustingRow] = useState<UserSummary | null>(null);
  const [adjDetailRow, setAdjDetailRow] = useState<UserSummary | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.replace("/dashboard"); return; }
    const parsed = JSON.parse(u);
    const perms: any[] = parsed.permissions ?? [];
    const isLegacyAdmin = parsed.role === "admin";
    const perm = perms.find((p: any) => p.menu === "commissions");
    const canView = isLegacyAdmin || (perm?.canView ?? false);
    if (!canView) { window.location.replace("/dashboard"); return; }
    setCanEdit(isLegacyAdmin || (perm?.canEdit ?? false));
  }, []);

  function goBreakdown(userId: string, name: string) {
    router.push(`/dashboard/commissions/breakdown?userId=${userId}&month=${month}&name=${encodeURIComponent(name)}`);
  }

  const load = useCallback((m: string) => {
    setLoading(true);
    Promise.all([api.getCommissionSummary(m), api.getCommissionPayments(m)])
      .then(([summary, pays]) => { setData(summary); setPayments(pays); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadOverdue = useCallback(() => {
    setLoadingOverdue(true);
    api.getCommissionOverdue()
      .then((res: any) => setOverdueRows(Array.isArray(res) ? res : []))
      .catch(console.error)
      .finally(() => setLoadingOverdue(false));
  }, []);

  useEffect(() => { load(month); }, [month]);
  useEffect(() => { loadOverdue(); }, []);

  const paidSet = useMemo(() => new Set(payments.map((p) => p.userId)), [payments]);

  const filtered = useMemo(() => {
    if (!data?.summary) return [];
    return data.summary.filter((r) => {
      if (statusFilter === "reached" && !r.reachedThreshold) return false;
      if (statusFilter === "not_reached" && r.reachedThreshold) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!r.user.fullName.toLowerCase().includes(q) && !r.user.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, statusFilter, search]);

  const reachedCount = data?.summary.filter((r) => r.reachedThreshold).length ?? 0;
  const paidCount = payments.length;
  const unpaidCount = reachedCount - paidCount;
  const totalToPayAll = data?.summary.filter(r => r.reachedThreshold).reduce((s, r) => s + r.commission, 0) ?? 0;
  const missingBankCount = filtered.filter((r) => r.reachedThreshold && (!r.user.bankName || !r.user.bankAccount)).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ค่าคอมมิชชัน</h2>
          <p className="text-sm text-gray-400 mt-0.5">คำนวณจากยอด verified + approved + legacy (ไม่รวม pending / rejected)</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold border border-green-100">
          📅 {MONTH_NAMES_TH[parseInt(month.split("-")[1]) - 1]} {month.split("-")[0]}
        </span>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">อัตราค่าคอม</p>
            <p className="text-2xl font-bold text-gray-800">{data.settings.rate}%</p>
            <p className="text-xs text-gray-400 mt-1">ขั้นต่ำ ฿{data.settings.threshold.toLocaleString("th-TH")}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">ถึงเป้า / จ่ายแล้ว</p>
            <p className="text-xl font-bold text-gray-800">
              {reachedCount} <span className="text-gray-300">/</span> <span className="text-green-600">{paidCount}</span>
              <span className="text-sm font-normal text-gray-400 ml-1">คน</span>
            </p>
            {unpaidCount > 0 && <p className="text-xs text-amber-600 mt-1">รอจ่าย {unpaidCount} คน</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">ยอดรวมที่ต้องจ่าย</p>
            <p className="text-xl font-bold text-amber-600">฿{totalToPayAll.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-green-50 rounded-2xl border border-green-100 shadow-sm p-4">
            <p className="text-xs text-green-600 mb-1">จ่ายไปแล้ว</p>
            <p className="text-xl font-bold text-green-700">฿{payments.reduce((s, p) => s + p.amount, 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {missingBankCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3 print:hidden">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-red-700 font-medium">
            มีเซล <span className="font-bold">{missingBankCount} คน</span> ถึงเป้าแต่ยังไม่กรอกข้อมูลธนาคาร
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit print:hidden">
        {[
          { key: "calc",    label: "คำนวณ" },
          { key: "history", label: `ประวัติการจ่าย${payments.length > 0 ? ` (${payments.length})` : ""}` },
          { key: "report",  label: "รายงาน" },
          { key: "overdue", label: `ยอดค้างจ่าย${overdueRows.length > 0 ? ` (${overdueRows.length})` : ""}` },
        ].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key as "calc" | "history" | "report" | "overdue")}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              activeTab === t.key ? "bg-white shadow-sm text-gray-800"
              : t.key === "overdue" && overdueRows.length > 0 ? "text-amber-600 hover:text-amber-700"
              : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: History */}
      {activeTab === "history" && <div className="print:hidden"><HistoryTab /></div>}

      {/* Tab: Report */}
      {activeTab === "report" && (
        <ReportTab payments={payments} defaultMonth={month} />
      )}

      {/* Tab: Overdue */}
      {activeTab === "overdue" && (
        <OverdueTab rows={overdueRows} loading={loadingOverdue} onRefresh={loadOverdue} />
      )}

      {/* Tab: Calc */}
      {activeTab === "calc" && (
        <>
          {!data?.settings.rate && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-800">
              ⚠️ ยังไม่ได้ตั้งค่าอัตราค่าคอม — <a href="/dashboard/settings" className="underline font-semibold">ตั้งค่าระบบ</a>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
            <div className="flex gap-2 flex-wrap items-center">
              {STATUS_OPTS.map((opt) => (
                <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
                  className={`px-3.5 py-1.5 text-sm rounded-xl font-medium transition-colors ${statusFilter === opt.value ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {opt.label}
                  {opt.value === "reached" && reachedCount > 0 && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${statusFilter === "reached" ? "bg-white text-green-600" : "bg-green-500 text-white"}`}>{reachedCount}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex gap-2 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${search ? "text-green-200" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                <input type="text" placeholder="ค้นหาชื่อเซล..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${search ? "bg-green-500 text-white placeholder:text-green-200" : "bg-gray-100 text-gray-600 placeholder:text-gray-400"}`} />
              </div>
              {search && <button onClick={() => setSearch("")} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-xl hover:bg-gray-100">ล้าง</button>}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">เซล</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ธนาคาร</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">ยอดสลิปสุทธิ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-blue-500 whitespace-nowrap">+ช่วยยกมา</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-blue-500 whitespace-nowrap">+ช่วยเดือนนี้</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-orange-500 whitespace-nowrap">ยอดค้าง</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700 whitespace-nowrap">=ยอดคำนวณ</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">สถานะ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ค่าคอม</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">การจ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={11} className="text-center py-12 text-gray-400 text-sm">กำลังคำนวณ...</td></tr>}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-16">
                        <p className="text-2xl mb-2">📊</p>
                        <p className="text-sm font-semibold text-gray-600">ไม่มีข้อมูล</p>
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.map((row, i) => {
                    const noBankInfo = row.reachedThreshold && (!row.user.bankName || !row.user.bankAccount);
                    const paid = paidSet.has(row.userId);
                    const paidRecord = payments.find((p) => p.userId === row.userId);
                    return (
                      <tr key={row.userId} onClick={() => goBreakdown(row.userId, row.user.fullName)}
                        className="border-b border-gray-50 hover:bg-green-50/40 cursor-pointer transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{row.user.fullName}</p>
                          <p className="text-xs text-gray-400">{row.user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          {row.user.bankName && row.user.bankAccount ? (
                            <div>
                              <p className="text-sm font-medium text-gray-700">{row.user.bankName}</p>
                              <p className="text-xs text-gray-500 font-mono">{row.user.bankAccount}</p>
                            </div>
                          ) : (
                            <span className={`text-xs ${noBankInfo ? "text-red-500 font-semibold" : "text-gray-300"}`}>
                              {noBankInfo ? "⚠ ยังไม่กรอก" : "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <p className="font-medium text-gray-700">฿{row.slipAmount.toLocaleString("th-TH")}</p>
                          <p className="text-xs text-gray-400">{row.visitCount} สลิป</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.adjustCarryover > 0 ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAdjDetailRow(row); }}
                              className="text-blue-500 font-medium hover:text-blue-700 underline underline-offset-2"
                            >
                              +฿{row.adjustCarryover.toLocaleString("th-TH")}
                            </button>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div className="flex flex-col items-end gap-1">
                            {row.adjustThisMonth > 0 ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setAdjDetailRow(row); }}
                                className="text-blue-500 font-medium hover:text-blue-700 underline underline-offset-2"
                              >
                                +฿{row.adjustThisMonth.toLocaleString("th-TH")}
                              </button>
                            ) : <span className="text-gray-300">—</span>}
                            {canEdit && !paid && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setAdjustingRow(row); }}
                                className="text-xs text-blue-400 hover:text-blue-600 border border-blue-200 hover:border-blue-400 px-1.5 py-0.5 rounded transition-colors"
                              >
                                + ช่วยยอด
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.outstandingDebt > 0
                            ? <span className="text-orange-500 font-medium">฿{row.outstandingDebt.toLocaleString("th-TH")}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={`font-bold ${(row.adjustCarryover > 0 || row.adjustThisMonth > 0) ? "text-gray-900" : "text-gray-700"}`}>
                            ฿{row.totalAmount.toLocaleString("th-TH")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.reachedThreshold ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">✓ ถึงเป้า</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">✗ ไม่ถึงเป้า</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold text-base ${row.commission > 0 ? "text-amber-600" : "text-gray-300"}`}>
                            {row.commission > 0 ? `฿${row.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.reachedThreshold ? (
                            paid ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">✓ จ่ายแล้ว</span>
                                {paidRecord && <span className="text-xs text-gray-400">{new Date(paidRecord.paidAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>}
                              </div>
                            ) : row.pendingCount > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/approvals?userId=${row.userId}`); }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer">
                                  ⏳ รอยืนยัน {row.pendingCount} รายการ
                                </button>
                                <span className="text-xs text-gray-400">ยืนยันครบก่อนจ่าย</span>
                              </div>
                            ) : canEdit ? (
                              <button onClick={(e) => { e.stopPropagation(); setPayingRow(row); }}
                                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors whitespace-nowrap">
                                บันทึกการจ่าย
                              </button>
                            ) : <span className="text-gray-300 text-xs">—</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {!loading && filtered.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-500">รวม {filtered.length} คน</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">฿{filtered.reduce((s, r) => s + r.slipAmount, 0).toLocaleString("th-TH")}</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-500">
                        {filtered.some((r) => r.adjustCarryover > 0) ? `+฿${filtered.reduce((s, r) => s + r.adjustCarryover, 0).toLocaleString("th-TH")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-500">
                        {filtered.some((r) => r.adjustThisMonth > 0) ? `+฿${filtered.reduce((s, r) => s + r.adjustThisMonth, 0).toLocaleString("th-TH")}` : "—"}
                      </td>
                      <td />
                      <td className="px-4 py-3 text-right font-bold text-gray-800">฿{filtered.reduce((s, r) => s + r.totalAmount, 0).toLocaleString("th-TH")}</td>
                      <td />
                      <td className="px-4 py-3 text-right font-bold text-amber-600">฿{filtered.reduce((s, r) => s + r.commission, 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {payingRow && (
        <PayModal
          row={payingRow} month={month}
          onClose={() => setPayingRow(null)}
          onDone={() => { setPayingRow(null); load(month); }} />
      )}
      {adjustingRow && (
        <AdjustModal
          row={adjustingRow} month={month}
          onClose={() => setAdjustingRow(null)}
          onDone={() => { setAdjustingRow(null); load(month); }} />
      )}
      {adjDetailRow && (
        <AdjDetailModal
          row={adjDetailRow} currentMonth={month}
          onClose={() => setAdjDetailRow(null)} />
      )}
    </div>
  );
}
