"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

interface SlipRow {
  id: string;
  shopName: string;
  amount: number | null;
  slipStatus: string;
  isProxy: boolean;
  createdAt: string;
  province?: string | null;
  district?: string | null;
}

interface UserSummary {
  userId: string;
  fullName: string;
  email: string;
  slipCount: number;
  totalAmount: number;
  proxyRate: number;
  proxyCommission: number;
  slips: SlipRow[];
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    verified:         { bg: "bg-green-100 text-green-700", text: "", label: "QR ผ่าน" },
    approved:         { bg: "bg-green-100 text-green-700", text: "", label: "อนุมัติ" },
    pending_approval: { bg: "bg-yellow-100 text-yellow-700", text: "", label: "รอยืนยัน" },
    rejected:         { bg: "bg-red-100 text-red-700", text: "", label: "ปฏิเสธ" },
  };
  const s = map[status] ?? { bg: "bg-gray-100 text-gray-600", text: "", label: status };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg}`}>{s.label}</span>;
}

function SlipDetailModal({
  user, month, proxyRate, onClose, onToggle,
}: {
  user: UserSummary; month: string; proxyRate: number; onClose: () => void; onToggle: (id: string, val: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{user.fullName}</h3>
            <p className="text-sm text-gray-400">{month} · {user.slipCount} รายการ · {proxyRate}%</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-500 uppercase">ร้าน</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">ยอด</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">สถานะ</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">เก็บแทน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {user.slips.map((s) => {
                const dt = new Date(s.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
                const loc = [s.district, s.province].filter(Boolean).join(" ");
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-gray-800">{s.shopName}</p>
                      {loc && <p className="text-xs text-gray-400">{loc}</p>}
                      <p className="text-xs text-gray-400">{dt}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-800 tabular-nums">
                      {s.amount != null ? `฿${fmt(s.amount)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={s.slipStatus} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onToggle(s.id, !s.isProxy)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          s.isProxy
                            ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                            : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {s.isProxy ? "เก็บแทน" : "ปกติ"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">ยอดรวม</span>
            <span className="font-bold text-gray-800">฿{fmt(user.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-500">ค่าคอมเก็บแทน ({proxyRate}%)</span>
            <span className="font-bold text-green-700">฿{fmt(user.proxyCommission)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProxyCommissionsPage() {
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<UserSummary[]>([]);
  const [proxyRate, setProxyRate] = useState(2);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserSummary | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.replace("/dashboard"); return; }
    const parsed = JSON.parse(u);
    const perms: any[] = parsed.permissions ?? [];
    const isAdmin = parsed.role === "admin";
    const perm = perms.find((p: any) => p.menu === "commissions");
    if (!isAdmin && !perm?.canView) { window.location.replace("/dashboard"); return; }
    setAuthorized(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProxyCommissions(month);
      setData(res.summary ?? []);
      setProxyRate(res.proxyRate ?? 2);
    } catch {
      toast("โหลดข้อมูลล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { if (authorized) load(); }, [authorized, load]);

  async function handleToggle(slipId: string, val: boolean) {
    try {
      await api.toggleSlipProxy(slipId, val);
      // update local state
      setData((prev) => prev.map((u) => ({
        ...u,
        slips: u.slips.map((s) => s.id === slipId ? { ...s, isProxy: val } : s),
        get totalAmount() {
          return this.slips.filter((s) => s.isProxy).reduce((sum, s) => sum + (s.amount ?? 0), 0);
        },
        get proxyCommission() {
          return Math.round(this.totalAmount * proxyRate) / 100;
        },
        get slipCount() { return this.slips.filter((s) => s.isProxy).length; },
      })));
      if (selected) {
        setSelected((prev) => prev ? {
          ...prev,
          slips: prev.slips.map((s) => s.id === slipId ? { ...s, isProxy: val } : s),
          totalAmount: prev.slips.map((s) => s.id === slipId ? { ...s, isProxy: val } : s)
            .filter((s) => s.isProxy).reduce((sum, s) => sum + (s.amount ?? 0), 0),
          proxyCommission: 0, // recalculated below
          slipCount: prev.slips.filter((s) => (s.id === slipId ? val : s.isProxy)).length,
        } : null);
      }
      toast(val ? "เปลี่ยนเป็นเก็บแทนแล้ว" : "เปลี่ยนเป็นปกติแล้ว", "success");
      load();
    } catch (err: any) {
      toast(err?.message || "ไม่สามารถแก้ไขได้", "error");
    }
  }

  const totalProxyCommission = data.reduce((sum, u) => sum + u.proxyCommission, 0);

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ค่าคอมเก็บแทน</h2>
          <p className="text-sm text-gray-400 mt-0.5">สลิปที่เซล์ทำเครื่องหมาย "เก็บแทน" · อัตรา {proxyRate}%</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Summary bar */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">จำนวนเซล์</p>
            <p className="text-2xl font-bold text-gray-800">{data.length} คน</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">ยอดรวมทั้งหมด</p>
            <p className="text-2xl font-bold text-gray-800">฿{fmt(data.reduce((s, u) => s + u.totalAmount, 0))}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">ค่าคอมรวม</p>
            <p className="text-2xl font-bold text-green-700">฿{fmt(totalProxyCommission)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">กำลังโหลด...</div>
        ) : data.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">ไม่มีสลิปเก็บแทนในเดือนนี้</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase">ชื่อเซล์</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase">จำนวน slip</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase">ยอดรวม</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase">อัตรา</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase">ค่าคอม</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((u) => (
                <tr key={u.userId} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(u)}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-800">{u.fullName}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-5 py-4 text-right text-gray-700 tabular-nums">{u.slipCount}</td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-800 tabular-nums">฿{fmt(u.totalAmount)}</td>
                  <td className="px-5 py-4 text-right text-gray-500 tabular-nums">{u.proxyRate}%</td>
                  <td className="px-5 py-4 text-right font-bold text-green-700 tabular-nums">฿{fmt(u.proxyCommission)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs text-gray-400">ดูรายการ →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <SlipDetailModal
          user={selected}
          month={month}
          proxyRate={proxyRate}
          onClose={() => setSelected(null)}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}
