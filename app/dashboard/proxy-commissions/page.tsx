"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_NAMES_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SLIP_STATUS: Record<string, { cls: string; label: string }> = {
  verified:         { cls: "bg-blue-50 text-blue-700",     label: "QR ✓" },
  approved:         { cls: "bg-green-50 text-green-700",   label: "อนุมัติแล้ว" },
  pending_approval: { cls: "bg-yellow-50 text-yellow-700", label: "รอยืนยัน" },
  rejected:         { cls: "bg-red-50 text-red-700",       label: "ปฏิเสธ" },
};

// ─── Month Picker ─────────────────────────────────────────────────────────────
function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pickYear, setPickYear] = useState(() => parseInt(value.split("-")[0]));
  const ref = useRef<HTMLDivElement>(null);
  const [curY, curM] = value.split("-").map(Number);

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

  const label = `${MONTH_NAMES_TH[curM - 1]} ${curY}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setPickYear(curY); setOpen((o) => !o); }}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold border border-green-100 transition-colors"
      >
        📅 {label}
        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setPickYear((y) => y - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-base">‹</button>
            <span className="text-sm font-bold text-gray-800">
              {new Date(pickYear, 0, 1).toLocaleDateString("th-TH", { year: "numeric" })}
            </span>
            <button onClick={() => setPickYear((y) => y + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-base">›</button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {MONTH_NAMES_TH.map((name, i) => {
              const m = i + 1;
              const isSelected = pickYear === curY && m === curM;
              return (
                <button key={m} onClick={() => select(m)}
                  className={`py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isSelected ? "bg-green-500 text-white" : "hover:bg-green-50 text-gray-700"
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

// ─── Slip Detail Modal ────────────────────────────────────────────────────────
function SlipDetailModal({
  user, month, proxyRate, onClose, onToggle,
}: {
  user: UserSummary; month: string; proxyRate: number; onClose: () => void; onToggle: (id: string, val: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-800">รายการเก็บแทน — {user.fullName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              เดือน {month} · {user.slipCount} รายการ · อัตรา {proxyRate}%
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">ร้านค้า</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">ยอด (บาท)</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">สถานะสลิป</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">เก็บแทน</th>
              </tr>
            </thead>
            <tbody>
              {user.slips.map((s) => {
                const dt = new Date(s.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
                const loc = [s.district, s.province].filter(Boolean).join(" · ");
                const st = SLIP_STATUS[s.slipStatus] ?? { cls: "bg-gray-100 text-gray-500", label: s.slipStatus };
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{s.shopName}</p>
                      {loc && <p className="text-xs text-gray-400">{loc}</p>}
                      <p className="text-xs text-gray-400">{dt}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">
                      {s.amount != null ? `฿${fmt(s.amount)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onToggle(s.id, !s.isProxy)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
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

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">ยอดรวม</span>
            <span className="font-bold text-gray-800">฿{fmt(user.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">ค่าคอมเก็บแทน ({proxyRate}%)</span>
            <span className="font-bold text-amber-600">฿{fmt(user.proxyCommission)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProxyCommissionsPage() {
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth);
  const [data, setData] = useState<UserSummary[]>([]);
  const [proxyRate, setProxyRate] = useState(2);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const [search, setSearch] = useState("");
  const [paidSet, setPaidSet] = useState<Set<string>>(new Set());

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
      const [res, pays] = await Promise.all([
        api.getProxyCommissions(month),
        api.getCommissionPayments(month),
      ]);
      setData(res.summary ?? []);
      setProxyRate(res.proxyRate ?? 2);
      setPaidSet(new Set((pays as any[]).map((p: any) => p.userId)));
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
      toast(val ? "เปลี่ยนเป็นเก็บแทนแล้ว" : "เปลี่ยนเป็นปกติแล้ว", "success");
      load();
    } catch (err: any) {
      toast(err?.message || "ไม่สามารถแก้ไขได้", "error");
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [data, search]);

  const totalAmount = data.reduce((s, u) => s + u.totalAmount, 0);
  const totalComm   = data.reduce((s, u) => s + u.proxyCommission, 0);

  if (!authorized) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ค่าคอมเก็บแทน</h2>
          <p className="text-sm text-gray-400 mt-0.5">คำนวณจากสลิปที่เซล์ทำเครื่องหมาย "เก็บแทน"</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">อัตราเก็บแทน</p>
          <p className="text-2xl font-bold text-gray-800">{proxyRate}%</p>
          <p className="text-xs text-gray-400 mt-1">ตั้งค่าได้ที่หน้าการตั้งค่า</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">จำนวนเซล์</p>
          <p className="text-xl font-bold text-gray-800">
            {loading ? "—" : data.length}
            <span className="text-sm font-normal text-gray-400 ml-1">คน</span>
          </p>
          {!loading && data.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{data.reduce((s, u) => s + u.slipCount, 0)} รายการรวม</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 mb-1">ยอดรวมทั้งหมด</p>
          <p className="text-xl font-bold text-gray-800">
            {loading ? "—" : `฿${fmt(totalAmount)}`}
          </p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-100 shadow-sm p-4">
          <p className="text-xs text-green-600 mb-1">ค่าคอมรวม</p>
          <p className="text-xl font-bold text-green-700">
            {loading ? "—" : `฿${fmt(totalComm)}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${search ? "text-green-200" : "text-gray-400"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text" placeholder="ค้นหาชื่อเซล..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${
                search ? "bg-green-500 text-white placeholder:text-green-200" : "bg-gray-100 text-gray-600 placeholder:text-gray-400"
              }`}
            />
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">เซล์</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">จำนวน slip</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">ยอดรวม</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">อัตรา</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-amber-600 whitespace-nowrap">ค่าคอม</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">สถานะ</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">รายการ</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <p className="text-2xl mb-2">📊</p>
                    <p className="text-sm font-semibold text-gray-600">
                      {data.length === 0 ? "ไม่มีสลิปเก็บแทนในเดือนนี้" : "ไม่พบรายการที่ตรงกับการค้นหา"}
                    </p>
                    {data.length === 0 && <p className="text-xs text-gray-400 mt-1">สลิปที่เซล์เปิด "เก็บแทน" จะปรากฏที่นี่</p>}
                  </td>
                </tr>
              )}
              {!loading && filtered.map((u, i) => (
                <tr key={u.userId}
                  className="border-b border-gray-50 hover:bg-green-50/40 cursor-pointer transition-colors"
                  onClick={() => setSelected(u)}>
                  <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{u.fullName}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{u.slipCount}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">฿{fmt(u.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{u.proxyRate}%</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-600 tabular-nums">฿{fmt(u.proxyCommission)}</td>
                  <td className="px-4 py-3 text-center">
                    {paidSet.has(u.userId)
                      ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">✓ จ่ายแล้ว</span>
                      : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">รอจ่าย</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-gray-400">ดูรายการ →</span>
                  </td>
                </tr>
              ))}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500">รวม {filtered.length} คน</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700 tabular-nums">
                    {filtered.reduce((s, u) => s + u.slipCount, 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">
                    ฿{fmt(filtered.reduce((s, u) => s + u.totalAmount, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 tabular-nums">{proxyRate}%</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-600 tabular-nums">
                    ฿{fmt(filtered.reduce((s, u) => s + u.proxyCommission, 0))}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">
                    {filtered.filter((u) => paidSet.has(u.userId)).length}/{filtered.length} จ่ายแล้ว
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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
