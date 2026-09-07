"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface AuditLog {
  id: string;
  slipId: string;
  action: string;
  changedBy: string;
  before: any;
  after: any;
  note?: string | null;
  createdAt: string;
  changer?: { fullName: string; email: string };
  slip?: { id: string; shopName: string; slipUrl: string; user?: { fullName: string } } | null;
}

const ACTION_LABEL: Record<string, string> = {
  submit:       "ส่งสลิป",
  admin_create: "แอดมินสร้าง",
  edit:         "แก้ไข",
  approve:      "อนุมัติ",
  reject:       "ปฏิเสธ",
  unblock:      "ปลดบล็อก",
};
const ACTION_CLASS: Record<string, string> = {
  submit:       "bg-blue-50 text-blue-700 border-blue-200",
  admin_create: "bg-purple-50 text-purple-700 border-purple-200",
  edit:         "bg-amber-50 text-amber-700 border-amber-200",
  approve:      "bg-green-50 text-green-700 border-green-200",
  reject:       "bg-red-50 text-red-600 border-red-200",
  unblock:      "bg-orange-50 text-orange-700 border-orange-200",
};
const FIELD_LABEL: Record<string, string> = {
  shopName: "ชื่อร้าน", amount: "ยอด", details: "รายละเอียด", slipStatus: "สถานะ", isProxy: "เก็บแทน",
};

function AuditDiff({ before, after }: { before: any; after: any }) {
  if (!before && !after) return null;
  const changed = Object.keys({ ...before, ...after }).filter(
    (k) => (before?.[k] ?? null) !== (after?.[k] ?? null) && after?.[k] !== undefined,
  );
  if (!changed.length) return null;
  return (
    <div className="mt-1 space-y-0.5">
      {changed.map((k) => (
        <div key={k} className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
          <span className="text-gray-400">{FIELD_LABEL[k] ?? k}:</span>
          {before?.[k] !== undefined && (
            <span className="line-through text-red-400">{String(before[k] ?? "—")}</span>
          )}
          <span className="text-gray-300">→</span>
          <span className="text-green-600 font-medium">{String(after?.[k] ?? "—")}</span>
        </div>
      ))}
    </div>
  );
}

interface SlipSubmission {
  id: string;
  shopName: string;
  amount?: number | null;
  details?: string | null;
  slipUrl: string;
  slipStatus: string;
  transRef?: string | null;
  lineStatus?: string | null;
  isProxy?: boolean;
  isReceiverBlocked?: boolean;
  receiverBankId?: string | null;
  receiverAccountMasked?: string | null;
  createdAt: string;
  user?: { fullName: string; email: string };
}

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "รออนุมัติ",
  verified: "ยืนยัน QR",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
  blocked: "บัญชีไม่ตรง",
};

const STATUS_CLASS: Record<string, string> = {
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  verified: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  blocked: "bg-red-100 text-red-700 border-red-300",
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

function ApproveModal({ slip, onClose, onDone }: {
  slip: SlipSubmission; onClose: () => void; onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(slip.amount ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoomSlip, setZoomSlip] = useState(false);

  async function handleApprove() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError("กรุณากรอกยอดเงินที่ถูกต้อง"); return; }
    setLoading(true);
    try {
      await api.approveSlip(slip.id, "approve", amt);
      onDone();
    } catch { setError("เกิดข้อผิดพลาด กรุณาลองใหม่"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 mb-1">อนุมัติสลิป</h3>
        <p className="text-xs text-gray-400 mb-4">{slip.shopName} · {slip.user?.fullName}</p>
        <div className="flex justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slip.slipUrl} alt="slip"
            onClick={() => setZoomSlip(true)}
            className="max-h-52 rounded-xl border border-gray-100 object-contain cursor-zoom-in hover:opacity-90 transition-opacity" />
        </div>
        {zoomSlip && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setZoomSlip(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slip.slipUrl} alt="slip full" className="max-w-full max-h-full rounded-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
        {slip.details && <p className="text-xs text-gray-500 mb-3 bg-gray-50 rounded-lg px-3 py-2">{slip.details}</p>}
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

function EditSlipModal({ slip, onClose, onDone }: {
  slip: SlipSubmission; onClose: () => void; onDone: () => void;
}) {
  const [shopName, setShopName] = useState(slip.shopName);
  const [amount, setAmount] = useState(slip.amount != null ? String(slip.amount) : "");
  const [details, setDetails] = useState(slip.details ?? "");
  const [slipStatus, setSlipStatus] = useState(slip.slipStatus);
  const [isProxy, setIsProxy] = useState(slip.isProxy ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!shopName.trim()) { setError("กรุณากรอกชื่อร้าน"); return; }
    setLoading(true);
    try {
      await api.updateSlip(slip.id, {
        shopName: shopName.trim(),
        amount: amount !== "" ? parseFloat(amount) : null,
        details: details.trim() || undefined,
        slipStatus,
        isProxy,
      });
      onDone();
    } catch (e: any) { setError(e?.message ?? "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-800 text-base">แก้ไขสลิป</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              สร้างโดย: <span className="font-semibold text-gray-600">{slip.user?.fullName || "—"}</span>
              {slip.user?.email && <span className="ml-1 text-gray-400">({slip.user.email})</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Slip preview */}
        <div className="flex justify-center mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slip.slipUrl} alt="slip" className="max-h-36 rounded-xl border border-gray-100 object-contain" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อร้าน</label>
            <input value={shopName} onChange={(e) => setShopName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ยอดเงิน (บาท)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="— ไม่ระบุ —" min="0" step="0.01"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">รายละเอียด</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">สถานะ</label>
            <select value={slipStatus} onChange={(e) => setSlipStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none">
              <option value="pending_approval">รออนุมัติ</option>
              <option value="verified">ยืนยัน QR</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ปฏิเสธ</option>
              <option value="blocked">บัญชีไม่ตรง</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isProxy} onChange={(e) => setIsProxy(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-400" />
            <span className="text-sm text-gray-600">เก็บแทน (proxy)</span>
          </label>
        </div>

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl disabled:opacity-60">
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateSlipModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [users, setUsers] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [userId, setUserId] = useState("");
  const [shopName, setShopName] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [slipStatus, setSlipStatus] = useState("approved");
  const [isProxy, setIsProxy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getUsers().then((res) => setUsers(Array.isArray(res) ? res : res?.data ?? [])).catch(() => {});
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function handleCreate() {
    if (!userId) { setError("กรุณาเลือกเซล"); return; }
    if (!shopName.trim()) { setError("กรุณากรอกชื่อร้าน"); return; }
    if (!file) { setError("กรุณาเลือกรูปสลิป"); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("slip", file);
      fd.append("userId", userId);
      fd.append("shopName", shopName.trim());
      if (amount) fd.append("amount", amount);
      if (details.trim()) fd.append("details", details.trim());
      fd.append("slipStatus", slipStatus);
      fd.append("isProxy", String(isProxy));
      await api.adminCreateSlip(fd);
      onDone();
    } catch (e: any) { setError(e?.message ?? "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 text-base">เพิ่มสลิปใหม่ (Admin)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">เซล (ผู้ส่งสลิป)</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none">
              <option value="">— เลือกเซล —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อร้าน</label>
            <input value={shopName} onChange={(e) => setShopName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
              placeholder="ชื่อร้านค้า" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ยอดเงิน (บาท)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" min="0" step="0.01"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">รายละเอียด</label>
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">สถานะ</label>
            <select value={slipStatus} onChange={(e) => setSlipStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none">
              <option value="approved">อนุมัติแล้ว</option>
              <option value="pending_approval">รออนุมัติ</option>
              <option value="verified">ยืนยัน QR</option>
              <option value="rejected">ปฏิเสธ</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isProxy} onChange={(e) => setIsProxy(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-400" />
            <span className="text-sm text-gray-600">เก็บแทน (proxy)</span>
          </label>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">รูปสลิป</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-400 hover:text-green-600 transition-colors">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="preview" className="max-h-32 mx-auto rounded-lg object-contain" />
              ) : (
                <span>คลิกเพื่อเลือกรูปสลิป</span>
              )}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-1 py-2.5 text-sm bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl disabled:opacity-60">
            {loading ? "กำลังบันทึก..." : "เพิ่มสลิป"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;
const AUDIT_PAGE_SIZE = 30;

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"slips" | "audit">("slips");

  // Slips tab
  const [slips, setSlips] = useState<SlipSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [approvingSlip, setApprovingSlip] = useState<SlipSubmission | null>(null);
  const [editingSlip, setEditingSlip] = useState<SlipSubmission | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  // Audit tab
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.replace("/dashboard"); return; }
    const parsed = JSON.parse(u);
    const perms: any[] = parsed.permissions ?? [];
    const isLegacyAdmin = parsed.role === "admin";
    const perm = perms.find((p: any) => p.menu === "approvals");
    const canView = isLegacyAdmin || (perm?.canView ?? false);
    if (!canView) { window.location.replace("/dashboard"); return; }
    setCanEdit(isLegacyAdmin || (perm?.canEdit ?? false));
  }, []);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((p = 1) => {
    setLoading(true);
    api.getSlipSubmissions({
      page: p,
      limit: PAGE_SIZE,
      status: statusFilter || undefined,
      search: search.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => { setSlips(res?.data ?? []); setTotal(res?.total ?? 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1), 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, dateFrom, dateTo, statusFilter]);

  useEffect(() => { load(page); }, [page]);

  const loadAudit = useCallback((p = 1) => {
    setAuditLoading(true);
    api.getSlipAuditLogs({
      page: p, limit: AUDIT_PAGE_SIZE,
      action: auditActionFilter || undefined,
      dateFrom: auditDateFrom || undefined,
      dateTo: auditDateTo || undefined,
    })
      .then((res) => { setAuditLogs(res?.data ?? []); setAuditTotal(res?.total ?? 0); })
      .catch(console.error)
      .finally(() => setAuditLoading(false));
  }, [auditActionFilter, auditDateFrom, auditDateTo]);

  useEffect(() => {
    if (activeTab === "audit") { setAuditPage(1); loadAudit(1); }
  }, [activeTab, auditActionFilter, auditDateFrom, auditDateTo]);

  useEffect(() => {
    if (activeTab === "audit") loadAudit(auditPage);
  }, [auditPage]);

  async function handleReject(id: string) {
    setRejectingId(id);
    try {
      await api.approveSlip(id, "reject");
      load(page);
    } catch { alert("เกิดข้อผิดพลาด"); }
    finally { setRejectingId(null); }
  }

  async function handleUnblock(id: string) {
    if (!confirm("ปลดบล็อกสลิปนี้และส่งรออนุมัติใช่ไหม?")) return;
    setUnblockingId(id);
    try {
      await api.unblockSlip(id);
      load(page);
    } catch { alert("เกิดข้อผิดพลาด"); }
    finally { setUnblockingId(null); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const auditTotalPages = Math.ceil(auditTotal / AUDIT_PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">จัดการสลิปการชำระเงิน</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeTab === "slips"
              ? (loading ? "กำลังโหลด..." : `${total} รายการ`)
              : (auditLoading ? "กำลังโหลด..." : `${auditTotal} รายการ`)}
            {activeTab === "slips" && statusFilter === "pending_approval" && total > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">· รออนุมัติ {total} รายการ</span>
            )}
          </p>
        </div>
        {canEdit && activeTab === "slips" && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มสลิปใหม่
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([{ key: "slips", label: "รายการสลิป" }, { key: "audit", label: "ประวัติแก้ไข" }] as const).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Slips tab content */}
      {activeTab === "slips" && <>
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { value: "pending_approval", label: "รออนุมัติ" },
            { value: "blocked", label: "บัญชีไม่ตรง" },
            { value: "verified", label: "ยืนยัน QR" },
            { value: "approved", label: "อนุมัติแล้ว" },
            { value: "rejected", label: "ปฏิเสธ" },
            { value: "", label: "ทั้งหมด" },
          ].map((opt) => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`px-3.5 py-1.5 text-sm rounded-xl font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="border-t border-gray-100" />

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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">สร้างโดย</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ยอด (บาท)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">LINE</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">วันที่</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">สถานะ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</td></tr>
              )}
              {!loading && slips.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="text-sm font-semibold text-gray-600">ไม่มีรายการ</p>
                  </td>
                </tr>
              )}
              {!loading && slips.map((s, i) => {
                const isPending = s.slipStatus === "pending_approval";
                const isBlocked = s.slipStatus === "blocked";
                const statusKey = s.slipStatus ?? "";
                return (
                  <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isBlocked ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-3">
                      <SlipThumb url={s.slipUrl} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-sm">{s.shopName}</p>
                      {s.transRef && <p className="text-xs text-gray-400 font-mono mt-0.5">Ref: {s.transRef}</p>}
                      {s.details && <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">{s.details}</p>}
                      {s.isProxy && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded-full font-medium">เก็บแทน</span>
                      )}
                      {s.isReceiverBlocked && s.receiverAccountMasked && (
                        <p className="text-xs text-red-500 font-mono mt-0.5">
                          ผู้รับ: {s.receiverBankId} · {s.receiverAccountMasked}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-700">{s.user?.fullName || "—"}</p>
                      <p className="text-xs text-gray-400">{s.user?.email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-gray-800">
                        {s.amount != null ? `฿${s.amount.toLocaleString("th-TH")}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.lineStatus === "sent" && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd"/></svg>
                          ส่งแล้ว
                        </span>
                      )}
                      {s.lineStatus === "failed" && (
                        <span className="text-xs text-red-500 font-medium">ล้มเหลว</span>
                      )}
                      {!s.lineStatus && <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                      <br />
                      {new Date(s.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_CLASS[statusKey] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {STATUS_LABEL[statusKey] ?? statusKey}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {isPending && canEdit && (
                          <div className="flex gap-1.5">
                            <button onClick={() => setApprovingSlip(s)}
                              className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors whitespace-nowrap">
                              อนุมัติ
                            </button>
                            <button onClick={() => handleReject(s.id)} disabled={rejectingId === s.id}
                              className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap">
                              {rejectingId === s.id ? "..." : "ปฏิเสธ"}
                            </button>
                          </div>
                        )}
                        {isBlocked && canEdit && (
                          <button onClick={() => handleUnblock(s.id)} disabled={unblockingId === s.id}
                            className="px-3 py-1.5 text-xs font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap">
                            {unblockingId === s.id ? "..." : "ปลดบล็อก"}
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => setEditingSlip(s)}
                            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap">
                            แก้ไข
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
              <span className="px-3 py-1.5 text-xs text-gray-600 font-semibold">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                ถัดไป →
              </button>
            </div>
          </div>
        )}
      </div>

      </>}

      {/* Audit log tab */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {/* Audit filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
            <div className="flex gap-2 flex-wrap items-center">
              {[
                { value: "", label: "ทั้งหมด" },
                { value: "submit", label: "ส่งสลิป" },
                { value: "admin_create", label: "แอดมินสร้าง" },
                { value: "edit", label: "แก้ไข" },
                { value: "approve", label: "อนุมัติ" },
                { value: "reject", label: "ปฏิเสธ" },
                { value: "unblock", label: "ปลดบล็อก" },
              ].map((opt) => (
                <button key={opt.value} onClick={() => setAuditActionFilter(opt.value)}
                  className={`px-3.5 py-1.5 text-sm rounded-xl font-medium transition-colors ${
                    auditActionFilter === opt.value
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex gap-2 items-center flex-wrap">
              <input type="date" value={auditDateFrom} onChange={(e) => setAuditDateFrom(e.target.value)}
                className={`text-sm rounded-xl px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${auditDateFrom ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`} />
              <span className="text-gray-400 text-sm">—</span>
              <input type="date" value={auditDateTo} onChange={(e) => setAuditDateTo(e.target.value)}
                className={`text-sm rounded-xl px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${auditDateTo ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}`} />
              {(auditDateFrom || auditDateTo) && (
                <button onClick={() => { setAuditDateFrom(""); setAuditDateTo(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-xl hover:bg-gray-100">
                  ล้าง
                </button>
              )}
            </div>
          </div>

          {/* Audit table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">สลิป</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">การกระทำ</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ดำเนินการโดย</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">รายละเอียด</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">วันที่/เวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">กำลังโหลด...</td></tr>
                  )}
                  {!auditLoading && auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16">
                        <p className="text-2xl mb-2">📋</p>
                        <p className="text-sm font-semibold text-gray-600">ยังไม่มีประวัติการแก้ไข</p>
                      </td>
                    </tr>
                  )}
                  {!auditLoading && auditLogs.map((log, i) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400">{(auditPage - 1) * AUDIT_PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {log.slip?.slipUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={log.slip.slipUrl} alt="slip"
                              className="w-8 h-8 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{log.slip?.shopName || log.slipId.slice(0, 8)}</p>
                            {log.slip?.user?.fullName && (
                              <p className="text-xs text-gray-400">{log.slip.user.fullName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${ACTION_CLASS[log.action] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
                          {ACTION_LABEL[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-700">{log.changer?.fullName || "—"}</p>
                        <p className="text-xs text-gray-400">{log.changer?.email || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <AuditDiff before={log.before} after={log.after} />
                        {log.note && <p className="text-xs text-gray-400 mt-1">{log.note}</p>}
                        {!log.before && !log.after && !log.note && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                        <br />
                        {new Date(log.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {auditTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  แสดง {(auditPage - 1) * AUDIT_PAGE_SIZE + 1}–{Math.min(auditPage * AUDIT_PAGE_SIZE, auditTotal)} จาก {auditTotal} รายการ
                </p>
                <div className="flex gap-1.5">
                  <button onClick={() => setAuditPage((p) => Math.max(1, p - 1))} disabled={auditPage === 1}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                    ← ก่อนหน้า
                  </button>
                  <span className="px-3 py-1.5 text-xs text-gray-600 font-semibold">{auditPage} / {auditTotalPages}</span>
                  <button onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))} disabled={auditPage === auditTotalPages}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
                    ถัดไป →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {approvingSlip && (
        <ApproveModal
          slip={approvingSlip}
          onClose={() => setApprovingSlip(null)}
          onDone={() => { setApprovingSlip(null); load(page); }}
        />
      )}
      {editingSlip && (
        <EditSlipModal
          slip={editingSlip}
          onClose={() => setEditingSlip(null)}
          onDone={() => { setEditingSlip(null); load(page); }}
        />
      )}
      {showCreate && (
        <CreateSlipModal
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); load(1); setPage(1); }}
        />
      )}
    </div>
  );
}
