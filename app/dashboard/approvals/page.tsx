"use client";
import { useEffect, useState, useCallback } from "react";
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

function SlipImage({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="slip" onClick={() => setOpen(true)}
        className="w-20 h-20 object-cover rounded-xl border border-gray-100 cursor-pointer hover:opacity-90 flex-shrink-0" />
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
            <img src={visit.slipUrl} alt="slip" className="max-h-48 rounded-xl border border-gray-100 object-contain" />
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

export default function ApprovalsPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingVisit, setApprovingVisit] = useState<VisitRecord | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getVisits({ slipStatus: "pending_approval", limit: 100 })
      .then((res) => setVisits(res?.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReject(id: string) {
    setRejectingId(id);
    try {
      await api.approveVisit(id, "reject");
      load();
    } catch { alert("เกิดข้อผิดพลาด"); }
    finally { setRejectingId(null); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">รออนุมัติสลิป</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {loading ? "กำลังโหลด..." : `${visits.length} รายการรอการตรวจสอบ`}
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && visits.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm font-semibold text-gray-600">ไม่มีรายการรอการอนุมัติ</p>
          <p className="text-xs text-gray-400 mt-1">ทุกสลิปได้รับการตรวจสอบแล้ว</p>
        </div>
      )}

      {!loading && visits.length > 0 && (
        <div className="space-y-3">
          {visits.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                {v.slipUrl ? (
                  <SlipImage url={v.slipUrl} />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-gray-400">ไม่มีรูป</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{v.shopName}</p>
                      <p className="text-xs text-gray-400">{v.district ? `${v.province} · ${v.district}` : v.province}</p>
                      <p className="text-xs text-gray-500 mt-0.5">เซล: {v.user?.fullName || "—"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-amber-600">
                        ฿{(v.orderAmount ?? 0).toLocaleString("th-TH")}
                      </p>
                      <p className="text-xs text-gray-400">ยอดที่เซลกรอก</p>
                    </div>
                  </div>

                  {v.transRef && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">Ref: {v.transRef}</p>
                  )}
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(v.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setApprovingVisit(v)}
                      className="flex-1 py-2 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors">
                      อนุมัติ
                    </button>
                    <button onClick={() => handleReject(v.id)} disabled={rejectingId === v.id}
                      className="flex-1 py-2 text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40">
                      {rejectingId === v.id ? "กำลังปฏิเสธ..." : "ปฏิเสธ"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {approvingVisit && (
        <ApproveModal
          visit={approvingVisit}
          onClose={() => setApprovingVisit(null)}
          onDone={() => { setApprovingVisit(null); load(); }}
        />
      )}
    </div>
  );
}
