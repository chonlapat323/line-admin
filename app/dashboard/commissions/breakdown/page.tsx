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

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  verified:         { label: "QR ✓",    color: "bg-blue-50 text-blue-700" },
  approved:         { label: "อนุมัติ",  color: "bg-green-50 text-green-700" },
  pending_approval: { label: "รออนุมัติ", color: "bg-amber-50 text-amber-700" },
  rejected:         { label: "ปฏิเสธ",  color: "bg-red-50 text-red-600" },
};

export default function BreakdownPage() {
  const params = useSearchParams();
  const router = useRouter();

  const initUserId = params.get("userId") ?? "";

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(initUserId);
  const [slips, setSlips] = useState<SlipRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tiers, setTiers] = useState<CommissionTier[]>([]);
  const [flatRate, setFlatRate] = useState(0);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [minAmt, setMinAmt] = useState<number | null>(null);
  const [maxAmt, setMaxAmt] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.getUsers(), api.getCommissionSettings()])
      .then(([u, s]) => {
        setUsers((u as User[]).filter((x: User) => x.role !== "admin"));
        setTiers((s as any).tiers ?? []);
        setFlatRate((s as any).rate ?? 0);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setLoading(true);
    setSlips([]);
    api.getSlipSubmissions({ filterUserId: selectedUserId, limit: 1000 })
      .then((res: any) => setSlips(res?.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  function resetFilters() {
    setDateFrom(""); setDateTo(""); setShopSearch(""); setMinAmt(null); setMaxAmt(null);
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const filtered = useMemo(() => {
    return slips.filter((s) => {
      if (shopSearch && !s.shopName.toLowerCase().includes(shopSearch.toLowerCase())) return false;
      if (dateFrom && new Date(s.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(s.createdAt) > new Date(dateTo + "T23:59:59")) return false;
      if (minAmt !== null && (s.amount ?? 0) < minAmt) return false;
      if (maxAmt !== null && (s.amount ?? 0) > maxAmt) return false;
      return true;
    });
  }, [slips, shopSearch, dateFrom, dateTo, minAmt, maxAmt]);

  const totalAll = filtered.reduce((s, r) => s + (r.amount ?? 0), 0);
  const commSlips = filtered.filter((s) => s.slipStatus === "verified" || s.slipStatus === "approved");
  const totalForComm = commSlips.reduce((s, r) => s + (r.amount ?? 0), 0);
  const { breakdown: tierBreakdown, total: commTotal } = calcTierCommission(totalForComm, tiers);
  const flatComm = tiers.length === 0 ? Math.round(totalForComm * flatRate) / 100 : 0;
  const hasFilters = !!(dateFrom || dateTo || shopSearch || minAmt !== null || maxAmt !== null);

  return (
    <div className="flex gap-4 min-h-[calc(100vh-5rem)]">
      {/* Left: user list */}
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
              onClick={() => { setSelectedUserId(u.id); resetFilters(); }}
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

      {/* Center: table */}
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
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {selectedUser ? selectedUser.fullName : "เลือกเซลจากรายการ"}
            </h2>
            {selectedUser && (
              <p className="text-sm text-gray-400 mt-0.5">
                {filtered.length} รายการ
                {hasFilters ? " (กรองแล้ว)" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                    <td colSpan={7} className="text-center py-20 text-gray-400 text-sm">
                      เลือกชื่อเซลจากรายการด้านซ้าย
                    </td>
                  </tr>
                )}
                {selectedUserId && loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-gray-400 text-sm">กำลังโหลด...</td>
                  </tr>
                )}
                {selectedUserId && !loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-gray-400 text-sm">ไม่มีรายการ</td>
                  </tr>
                )}
                {!loading && filtered.map((s, i) => {
                  const st = STATUS_LABEL[s.slipStatus] ?? { label: s.slipStatus, color: "bg-gray-100 text-gray-500" };
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}.</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{s.shopName}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">
                        {s.amount != null
                          ? s.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })
                          : "—"}
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
              {!loading && filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500">
                      {filtered.length} รายการ
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                      {totalAll.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Right: filters + summary */}
      <div className="w-56 flex-shrink-0 space-y-3 self-start sticky top-4">
        <div className="bg-pink-50 rounded-2xl border border-pink-100 p-4 space-y-4">
          <p className="font-semibold text-gray-700">ระบบค้นหา</p>

          {/* Date range */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">เลือกช่วงวันที่</label>
            <input
              type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-sm border border-pink-200 rounded-lg px-2 py-1.5 mb-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
            <input
              type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
          </div>

          {/* Shop search */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">ค้นจาก ชื่อร้าน</label>
            <input
              type="text" placeholder="ชื่อร้าน..." value={shopSearch}
              onChange={(e) => setShopSearch(e.target.value)}
              className="w-full text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
          </div>

          {/* Amount range */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">ค้นจาก ยอดเงินในสลิป (บาท)</label>
            <div className="flex gap-1 items-center">
              <input
                type="number" placeholder="ต่ำสุด" value={minAmt ?? ""}
                onChange={(e) => setMinAmt(e.target.value ? parseFloat(e.target.value) : null)}
                className="w-1/2 text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
              <span className="text-gray-400 text-xs">—</span>
              <input
                type="number" placeholder="สูงสุด" value={maxAmt ?? ""}
                onChange={(e) => setMaxAmt(e.target.value ? parseFloat(e.target.value) : null)}
                className="w-1/2 text-sm border border-pink-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="pt-2 border-t border-pink-200 space-y-3">
            <div>
              <p className="text-xs text-gray-500">ยอดสลิปรวมทั้งหมด (บาท)</p>
              <p className="text-2xl font-bold text-gray-800 tabular-nums">
                {totalAll.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Tier breakdown */}
            {tiers.length > 0 ? (
              tierBreakdown
                .filter((t) => t.commission > 0)
                .map((t, i) => (
                  <div key={i}>
                    <p className="text-xs text-gray-500">คอม {t.rate}%</p>
                    <p className="text-lg font-bold text-gray-800 tabular-nums">
                      {t.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
            ) : flatRate > 0 ? (
              <div>
                <p className="text-xs text-gray-500">คอม {flatRate}%</p>
                <p className="text-lg font-bold text-gray-800 tabular-nums">
                  {flatComm.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            ) : null}

            {(tiers.length > 0 || flatRate > 0) && (
              <div className="pt-2 border-t border-pink-200">
                <p className="text-xs text-gray-500">รวมค่าคอม (บาท)</p>
                <p className="text-xl font-bold text-green-700 tabular-nums">
                  {(tiers.length > 0 ? commTotal : flatComm).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  คำนวณจาก {commSlips.length} สลิป (QR ✓ + อนุมัติ)
                </p>
              </div>
            )}
          </div>

          {/* Reset */}
          <button
            onClick={resetFilters}
            className="w-full py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
          >
            รีเซ็ต
          </button>
        </div>
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
