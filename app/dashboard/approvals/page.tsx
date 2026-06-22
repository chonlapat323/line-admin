"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface VisitRecord {
  id: string;
  shopName: string;
  province: string;
  district?: string;
  result?: string;
  orderAmount?: number | null;
  slipUrl?: string | null;
  slipStatus?: string | null;
  transRef?: string | null;
  createdAt: string;
  user?: { fullName: string; email: string };
}

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "รออนุมัติ",
  verified: "ยืนยัน QR",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
};

const STATUS_CLASS: Record<string, string> = {
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

function SlipThumb({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="slip" onClick={() => setOpen(true)}
        className="w-10 h-10 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-80 flex-shrink-0" />
      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="slip full" className="max-w-full max-h-full rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

function ApproveModal({ visit, onClose, onDone }: {
  visit: VisitRecord; onClose: () => void; onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(visit.orderAmount ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApprove() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError("กรุณากรอกยอดเงินที่ถูกต้อง"); return; }
    setLoading(true);
    try {
      await api.approveVisit(visit.id, "approve", amt);
      onDone();
    } catch { setError("เกิดข้อผิดพลาด กรุณาลองใหม่"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 mb-1">อนุมัติสลิป</h3>
        <p className="text-xs text-gray-400 mb-4">{visit.shopName} · {visit.user?.fullName}</p>
        {visit.slipUrl && (
          <div className="flex justify-center mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={visit.slipUrl} alt="slip" className="max-h-52 rounded-xl border border-gray-100 object-contain" />
          </div>
        )}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">ยอดเงิน (บาท)</label>
          <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }}
            placeholder="0.00" min="0" step="0.01"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button onClick={handleApprove} disabled={loading}
            className="flex-1 py-2.5 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl disabled:opacity-60">
            {loading ? "กำลังบันทึก..." : "อนุมัติ"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function ApprovalsPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [slipStatusFilter, setSlipStatusFilter] = useState("pending_approval");

  const [approvingVisit, setApprovingVisit] = useState<VisitRecord | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((p = 1) => {
    setLoading(true);
    api.getVisits({
      page: p, limit: PAGE_SIZE,
      search: search.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      slipStatus: slipStatusFilter || undefined,
      result: "buy",
    })
      .then((res) => { setVisits(res?.data ?? []); setTotal(res?.total ?? 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, dateFrom, dateTo, slipStatusFilter]);

  useEffect(() => {
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, dateFrom, dateTo, slipStatusFilter]);

  useEffect(() => { load(page); }, [page]);

  async function handleReject(id: string) {
    setRejectingId(id);
    try {
      await api.approveVisit(id, "reject");
      load(page);
    } catch { alert("เกิดข้อผิดพลาด"); }
    finally { setRejectingId(null); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pendingCount = slipStatusFilter === "pending_approval" ? total : visits.filter(v => v.slipStatus === "pending_approval").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">จัดการสลิปการชำระเงิน</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "กำลังโหลด..." : `${total} รายการ`}
            {slipStatusFilter === "pending_approval" && total > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">· รออนุมัติ {total} รายการ</span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
        {/* Row 1: Status chips */}
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { value: "pending_approval", label: "รออนุมัติ" },
            { value: "verified", label: "ยืนยัน QR" },
            { value: "approved", label: "อนุมัติแล้ว" },
            { value: "rejected", label: "ปฏิเสธ" },
            { value: "", label: "ทั้งหมด" },
          ].map((opt) => (
            <button key={opt.value} onClick={() => setSlipStatusFilter(opt.value)}
              className={`px-3.5 py-1.5 text-sm rounded-xl font-medium transition-colors ${
                slipStatusFilter === opt.value
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="border-t border-gray-100" />

        {/* Row 2: Search + date range */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${search ? "text-green-200" : "text-gray-400"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input type="text" placeholder="ค้นหาร้านค้า / ชื่อเซล..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${
                search ? "bg-green-500 text-white placeholder:text-green-200" : "bg-gray-100 text-gray-600 placeholder:text-gray-400"
              }`} />
          </div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className={`text-sm rounded-xl px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${
              dateFrom ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
            }`} />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className={`text-sm rounded-xl px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${
              dateTo ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
            }`} />
          {(search || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-12">สลิป</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ร้านค้า</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">เซล</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">จังหวัด</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ยอด (บาท)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">วันที่</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">สถานะ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</td>
                </tr>
              )}
              {!loading && visits.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="text-sm font-semibold text-gray-600">ไม่มีรายการ</p>
                  </td>
                </tr>
              )}
              {!loading && visits.map((v, i) => {
                const isPending = v.slipStatus === "pending_approval";
                const statusKey = v.slipStatus ?? "";
                return (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3">
                      {v.slipUrl
                        ? <SlipThumb url={v.slipUrl} />
                        : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400">—</div>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-sm">{v.shopName}</p>
                      {v.transRef && <p className="text-xs text-gray-400 font-mono mt-0.5">Ref: {v.transRef}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{v.user?.fullName || "—"}</p>
                      <p className="text-xs text-gray-400">{v.user?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {v.district ? `${v.province} · ${v.district}` : v.province}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-gray-800">
                        {v.orderAmount != null ? `฿${v.orderAmount.toLocaleString("th-TH")}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(v.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                      <br />
                      {new Date(v.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_CLASS[statusKey] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {STATUS_LABEL[statusKey] ?? statusKey}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isPending && (
                        <div className="flex gap-1.5">
                          <button onClick={() => setApprovingVisit(v)}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors whitespace-nowrap">
                            อนุมัติ
                          </button>
                          <button onClick={() => handleReject(v.id)} disabled={rejectingId === v.id}
                            className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap">
                            {rejectingId === v.id ? "..." : "ปฏิเสธ"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} จาก {total} รายการ
            </p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                ← ก่อนหน้า
              </button>
              <span className="px-3 py-1.5 text-xs text-gray-600 font-semibold">
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>

      {approvingVisit && (
        <ApproveModal
          visit={approvingVisit}
          onClose={() => setApprovingVisit(null)}
          onDone={() => { setApprovingVisit(null); load(page); }}
        />
      )}
    </div>
  );
}
