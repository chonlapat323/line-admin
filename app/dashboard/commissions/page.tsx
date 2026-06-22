"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────
interface UserSummary {
  userId: string;
  user: { fullName: string; email: string; bankName?: string; bankAccount?: string };
  visitCount: number;
  totalAmount: number;
  reachedThreshold: boolean;
  commission: number;
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
const SLIP_STATUS_LABEL: Record<string, string> = { verified: "QR ✓", approved: "อนุมัติแล้ว" };

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
            <p className="text-xs text-gray-400 mt-0.5">เดือน {month} · เฉพาะที่ verified/approved</p>
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
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.slipStatus === "verified" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}`}>
                        {SLIP_STATUS_LABEL[v.slipStatus] ?? v.slipStatus}
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

// ─── History Tab ─────────────────────────────────────────────────────────────
function HistoryTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Filters
  const [historyMonth, setHistoryMonth] = useState(""); // "" = ทุกเดือน
  const [search, setSearch] = useState("");
  const [slipFilter, setSlipFilter] = useState("all"); // all | has_slip | no_slip

  useEffect(() => {
    setLoading(true);
    api.getCommissionPayments(historyMonth || undefined)
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
  }, [payments, search, slipFilter]);

  const total = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
        {/* Row 1: Month picker */}
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setHistoryMonth("")}
            className={`px-3.5 py-1.5 text-sm rounded-xl font-medium transition-colors ${
              historyMonth === "" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            ทุกเดือน
          </button>
          <input
            type="month"
            value={historyMonth}
            onChange={(e) => setHistoryMonth(e.target.value)}
            className={`px-3 py-1.5 text-sm rounded-xl font-medium border-0 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors ${
              historyMonth ? "bg-green-500 text-white [color-scheme:dark]" : "bg-gray-100 text-gray-600"
            }`}
          />
        </div>
        <div className="border-t border-gray-100" />
        {/* Row 2: Slip filter + search */}
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
        </div>
        <div className="border-t border-gray-100" />
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${search ? "text-green-200" : "text-gray-400"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input type="text" placeholder="ค้นหาชื่อเซล..."
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
                      {payments.length === 0 ? (historyMonth ? `ยังไม่มีการบันทึกการจ่ายในเดือน ${historyMonth}` : "ยังไม่มีประวัติการจ่ายเลย") : "ไม่พบรายการที่ตรงกับ filter"}
                    </p>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    {p.slipUrl ? (
                      <button onClick={() => setPreviewImg(p.slipUrl!)} className="focus:outline-none">
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

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function CommissionsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<"calc" | "history">("calc");

  const [statusFilter, setStatusFilter] = useState("reached");
  const [search, setSearch] = useState("");

  const [breakdownUser, setBreakdownUser] = useState<UserSummary | null>(null);
  const [payingRow, setPayingRow] = useState<UserSummary | null>(null);

  const load = useCallback((m: string) => {
    setLoading(true);
    Promise.all([api.getCommissionSummary(m), api.getCommissionPayments(m)])
      .then(([summary, pays]) => { setData(summary); setPayments(pays); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(month); }, [month]);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ค่าคอมมิชชันรายเดือน</h2>
          <p className="text-sm text-gray-400 mt-0.5">คำนวณจากยอด verified + approved เท่านั้น</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="bg-gray-100 rounded-xl px-3 py-1.5 text-sm border-0 focus:ring-2 focus:ring-green-400 focus:outline-none text-gray-600 font-medium" />
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-red-700 font-medium">
            มีเซล <span className="font-bold">{missingBankCount} คน</span> ถึงเป้าแต่ยังไม่กรอกข้อมูลธนาคาร
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ key: "calc", label: "คำนวณ" }, { key: "history", label: `ประวัติการจ่าย${payments.length > 0 ? ` (${payments.length})` : ""}` }].map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key as "calc" | "history")}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${activeTab === t.key ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: History */}
      {activeTab === "history" && <HistoryTab />}

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
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ออเดอร์</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ยอดขายรวม</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">สถานะ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ค่าคอม</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">การจ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">กำลังคำนวณ...</td></tr>}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-16">
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
                      <tr key={row.userId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
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
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setBreakdownUser(row)}
                            className="text-gray-700 font-medium hover:text-green-600 hover:underline transition-colors">
                            {row.visitCount}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">฿{row.totalAmount.toLocaleString("th-TH")}</td>
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
                            ) : (
                              <button onClick={() => setPayingRow(row)}
                                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors whitespace-nowrap">
                                บันทึกการจ่าย
                              </button>
                            )
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
                      <td className="px-4 py-3 text-right font-semibold text-gray-600">{filtered.reduce((s, r) => s + r.visitCount, 0)}</td>
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
      {breakdownUser && (
        <BreakdownModal
          userId={breakdownUser.userId} month={month} user={breakdownUser.user}
          onClose={() => setBreakdownUser(null)} />
      )}
      {payingRow && (
        <PayModal
          row={payingRow} month={month}
          onClose={() => setPayingRow(null)}
          onDone={() => { setPayingRow(null); load(month); }} />
      )}
    </div>
  );
}
