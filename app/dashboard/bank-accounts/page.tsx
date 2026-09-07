"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface DuplicateLog {
  id: string;
  userId: string;
  hash: string;
  attemptedAt: string;
  user?: { fullName: string; email: string };
}

interface SlipHashRow {
  id: string;
  hash: string;
  userId: string;
  createdAt: string;
  fullName?: string;
  email?: string;
}

interface BankAccount {
  id: string;
  label: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  isActive: boolean;
  createdAt: string;
}

const THAI_BANKS = [
  { id: "002", name: "ธนาคารกรุงเทพ (Bangkok Bank)" },
  { id: "004", name: "ธนาคารกสิกรไทย (KBank)" },
  { id: "006", name: "ธนาคารกรุงไทย (Krungthai)" },
  { id: "011", name: "ธนาคารทหารไทยธนชาต (TTB)" },
  { id: "014", name: "ธนาคารไทยพาณิชย์ (SCB)" },
  { id: "022", name: "ธนาคาร CIMB ไทย" },
  { id: "024", name: "ธนาคารยูโอบี (UOB)" },
  { id: "025", name: "ธนาคารกรุงศรีอยุธยา (Krungsri)" },
  { id: "030", name: "ธนาคารออมสิน (GSB)" },
  { id: "031", name: "ธนาคารอาคารสงเคราะห์ (GHB)" },
  { id: "034", name: "ธ.ก.ส. (BAAC)" },
  { id: "052", name: "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)" },
  { id: "065", name: "ธนาคารทิสโก้ (TISCO)" },
  { id: "066", name: "ธนาคารเกียรตินาคินภัทร (KKP)" },
  { id: "067", name: "ธนาคาร ICBC (ไทย)" },
  { id: "069", name: "ธนาคารไทยเครดิต" },
];

const EMPTY_FORM = { label: "", bankId: "", bankName: "", accountNumber: "" };

function AccountModal({ account, onClose, onDone }: {
  account?: BankAccount;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState(account
    ? { label: account.label, bankId: account.bankId, bankName: account.bankName, accountNumber: account.accountNumber }
    : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setError(""); }

  async function handleSave() {
    if (!form.label || !form.bankId || !form.bankName || !form.accountNumber) {
      setError("กรุณากรอกข้อมูลให้ครบ"); return;
    }
    setLoading(true);
    try {
      if (account) {
        await api.updateBankAccount(account.id, form);
      } else {
        await api.createBankAccount(form);
      }
      onDone();
    } catch { setError("เกิดข้อผิดพลาด กรุณาลองใหม่"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 text-lg mb-4">{account ? "แก้ไขบัญชี" : "เพิ่มบัญชีที่รับชำระ"}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อ / ป้ายกำกับ</label>
            <input value={form.label} onChange={(e) => set("label", e.target.value)}
              placeholder="เช่น กสิกร บัญชีหลัก"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ธนาคาร</label>
            <select
              value={form.bankId}
              onChange={(e) => {
                const bank = THAI_BANKS.find((b) => b.id === e.target.value);
                setForm((f) => ({ ...f, bankId: e.target.value, bankName: bank?.name ?? "" }));
                setError("");
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none bg-white">
              <option value="">— เลือกธนาคาร —</option>
              {THAI_BANKS.map((b) => (
                <option key={b.id} value={b.id}>{b.id} · {b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">เลขบัญชี (เต็ม)</label>
            <input value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)}
              placeholder="เช่น 123-4-56789-0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-green-400 focus:outline-none" />
            <p className="text-xs text-gray-400 mt-1">ระบบจะแปลง x ในสลิปเป็น % แล้วเทียบกับเลขนี้</p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
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

const DUP_PAGE_SIZE = 30;
const HASH_PAGE_SIZE = 30;

export default function BankAccountsPage() {
  const [activeTab, setActiveTab] = useState<"accounts" | "duplicates" | "hashes">("accounts");

  // Bank accounts tab
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAccount, setModalAccount] = useState<BankAccount | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Duplicate logs tab
  const [dupLogs, setDupLogs] = useState<DuplicateLog[]>([]);
  const [dupTotal, setDupTotal] = useState(0);
  const [dupPage, setDupPage] = useState(1);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupDateFrom, setDupDateFrom] = useState("");
  const [dupDateTo, setDupDateTo] = useState("");

  // Slip hashes tab
  const [hashRows, setHashRows] = useState<SlipHashRow[]>([]);
  const [hashTotal, setHashTotal] = useState(0);
  const [hashPage, setHashPage] = useState(1);
  const [hashLoading, setHashLoading] = useState(false);
  const [hashSearch, setHashSearch] = useState("");
  const [hashDateFrom, setHashDateFrom] = useState("");
  const [hashDateTo, setHashDateTo] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.replace("/dashboard"); return; }
    const parsed = JSON.parse(u);
    const perms: any[] = parsed.permissions ?? [];
    const isAdmin = parsed.role === "admin";
    const perm = perms.find((p: any) => p.menu === "settings");
    if (!isAdmin && !perm?.canEdit) { window.location.replace("/dashboard"); return; }
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.getBankAccounts()
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadDup = useCallback((p = 1) => {
    setDupLoading(true);
    api.getSlipDuplicateLogs({ page: p, limit: DUP_PAGE_SIZE, dateFrom: dupDateFrom || undefined, dateTo: dupDateTo || undefined })
      .then((res) => { setDupLogs(res?.data ?? []); setDupTotal(res?.total ?? 0); })
      .catch(console.error)
      .finally(() => setDupLoading(false));
  }, [dupDateFrom, dupDateTo]);

  const loadHashes = useCallback((p = 1) => {
    setHashLoading(true);
    api.getSlipHashes({ page: p, limit: HASH_PAGE_SIZE, search: hashSearch || undefined, dateFrom: hashDateFrom || undefined, dateTo: hashDateTo || undefined })
      .then((res) => { setHashRows(res?.data ?? []); setHashTotal(res?.total ?? 0); })
      .catch(console.error)
      .finally(() => setHashLoading(false));
  }, [hashSearch, hashDateFrom, hashDateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (activeTab === "duplicates") { setDupPage(1); loadDup(1); }
    if (activeTab === "hashes") { setHashPage(1); loadHashes(1); }
  }, [activeTab, dupDateFrom, dupDateTo, hashSearch, hashDateFrom, hashDateTo]);
  useEffect(() => {
    if (activeTab === "duplicates") loadDup(dupPage);
  }, [dupPage]);
  useEffect(() => {
    if (activeTab === "hashes") loadHashes(hashPage);
  }, [hashPage]);

  async function handleDelete(id: string) {
    if (!confirm("ต้องการลบบัญชีนี้ใช่ไหม?")) return;
    setDeletingId(id);
    try { await api.deleteBankAccount(id); load(); }
    catch { alert("เกิดข้อผิดพลาด"); }
    finally { setDeletingId(null); }
  }

  async function handleToggle(acc: BankAccount) {
    setTogglingId(acc.id);
    try { await api.updateBankAccount(acc.id, { isActive: !acc.isActive }); load(); }
    catch { alert("เกิดข้อผิดพลาด"); }
    finally { setTogglingId(null); }
  }

  const dupTotalPages = Math.ceil(dupTotal / DUP_PAGE_SIZE);
  const hashTotalPages = Math.ceil(hashTotal / HASH_PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">บัญชีธนาคารที่รับชำระ</h2>
          <p className="text-sm text-gray-400 mt-0.5">บัญชีที่ใช้ตรวจสอบผู้รับเงินจากสลิป</p>
        </div>
        {activeTab === "accounts" && (
          <button onClick={() => setModalAccount("new")}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
            + เพิ่มบัญชี
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([{ key: "accounts", label: "บัญชีธนาคาร" }, { key: "hashes", label: "สลิปในระบบ" }, { key: "duplicates", label: "ประวัติ slip ซ้ำ" }] as const).map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.label}
            {t.key === "hashes" && hashTotal > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center px-1.5 h-5 text-xs bg-blue-100 text-blue-600 rounded-full font-bold">
                {hashTotal.toLocaleString()}
              </span>
            )}
            {t.key === "duplicates" && dupTotal > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs bg-red-100 text-red-600 rounded-full font-bold">
                {dupTotal > 99 ? "99+" : dupTotal}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bank accounts tab */}
      {activeTab === "accounts" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">กำลังโหลด...</div>
          ) : accounts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-2xl mb-2">🏦</p>
              <p className="text-sm font-semibold text-gray-600">ยังไม่มีบัญชี</p>
              <p className="text-xs text-gray-400 mt-1">เพิ่มบัญชีที่รับชำระเงิน เพื่อตรวจสอบสลิปอัตโนมัติ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ป้ายกำกับ</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ธนาคาร</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">เลขบัญชี</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">สถานะ</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{acc.label}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <span className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mr-1.5">{acc.bankId}</span>
                        {acc.bankName}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">{acc.accountNumber}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggle(acc)} disabled={togglingId === acc.id}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors disabled:opacity-40 ${
                            acc.isActive
                              ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                              : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                          }`}>
                          {togglingId === acc.id ? "..." : acc.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => setModalAccount(acc)}
                            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            แก้ไข
                          </button>
                          <button onClick={() => handleDelete(acc.id)} disabled={deletingId === acc.id}
                            className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                            {deletingId === acc.id ? "..." : "ลบ"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Duplicate slip logs tab */}
      {activeTab === "duplicates" && (
        <div className="space-y-4">
          {/* Date filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
            <span className="text-xs font-semibold text-gray-500">กรองตามวันที่</span>
            <div className="flex items-center gap-2">
              <input type="date" value={dupDateFrom} onChange={(e) => setDupDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-red-300 focus:outline-none" />
              <span className="text-xs text-gray-400">ถึง</span>
              <input type="date" value={dupDateTo} onChange={(e) => setDupDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-red-300 focus:outline-none" />
            </div>
            {(dupDateFrom || dupDateTo) && (
              <button onClick={() => { setDupDateFrom(""); setDupDateTo(""); }}
                className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                ล้างตัวกรอง
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">ทั้งหมด {dupTotal.toLocaleString()} รายการ</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {dupLoading ? (
              <div className="py-16 text-center text-sm text-gray-400">กำลังโหลด...</div>
            ) : dupLogs.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-semibold text-gray-600">ไม่พบประวัติ slip ซ้ำ</p>
                <p className="text-xs text-gray-400 mt-1">ระบบจะบันทึกเมื่อผู้ใช้พยายามส่งสลิปที่เคยใช้แล้ว</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-10">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ผู้ใช้</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Hash (SHA256)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">วันที่/เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dupLogs.map((log, idx) => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-red-50/30">
                        <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">
                          {(dupPage - 1) * DUP_PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800 text-sm leading-tight">
                            {log.user?.fullName ?? "—"}
                          </div>
                          <div className="text-xs text-gray-400">{log.user?.email ?? log.userId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                            {log.hash.slice(0, 16)}…{log.hash.slice(-8)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                          {new Date(log.attemptedAt).toLocaleString("th-TH", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {dupTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setDupPage((p) => Math.max(1, p - 1))} disabled={dupPage === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                ← ก่อนหน้า
              </button>
              <span className="text-xs text-gray-500">หน้า {dupPage} / {dupTotalPages}</span>
              <button onClick={() => setDupPage((p) => Math.min(dupTotalPages, p + 1))} disabled={dupPage === dupTotalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                ถัดไป →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Slip hashes tab */}
      {activeTab === "hashes" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
            <input
              type="text" value={hashSearch} onChange={(e) => setHashSearch(e.target.value)}
              placeholder="ค้นหาชื่อ / อีเมล..."
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-300 focus:outline-none w-48" />
            <span className="text-xs font-semibold text-gray-500">วันที่</span>
            <div className="flex items-center gap-2">
              <input type="date" value={hashDateFrom} onChange={(e) => setHashDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-300 focus:outline-none" />
              <span className="text-xs text-gray-400">ถึง</span>
              <input type="date" value={hashDateTo} onChange={(e) => setHashDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-300 focus:outline-none" />
            </div>
            {(hashSearch || hashDateFrom || hashDateTo) && (
              <button onClick={() => { setHashSearch(""); setHashDateFrom(""); setHashDateTo(""); }}
                className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                ล้างตัวกรอง
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400">ทั้งหมด {hashTotal.toLocaleString()} รายการ</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {hashLoading ? (
              <div className="py-16 text-center text-sm text-gray-400">กำลังโหลด...</div>
            ) : hashRows.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-semibold text-gray-600">ไม่พบข้อมูลสลิป</p>
                <p className="text-xs text-gray-400 mt-1">ระบบบันทึก hash ของทุก slip ที่ผ่านการตรวจสอบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-10">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ผู้ส่ง</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Hash (SHA256)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">วันที่บันทึก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hashRows.map((row, idx) => (
                      <tr key={row.id} className="border-b border-gray-50 hover:bg-blue-50/20">
                        <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">
                          {(hashPage - 1) * HASH_PAGE_SIZE + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800 text-sm leading-tight">{row.fullName ?? "—"}</div>
                          <div className="text-xs text-gray-400">{row.email ?? row.userId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded" title={row.hash}>
                            {row.hash.slice(0, 16)}…{row.hash.slice(-8)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString("th-TH", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {hashTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setHashPage((p) => Math.max(1, p - 1))} disabled={hashPage === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                ← ก่อนหน้า
              </button>
              <span className="text-xs text-gray-500">หน้า {hashPage} / {hashTotalPages}</span>
              <button onClick={() => setHashPage((p) => Math.min(hashTotalPages, p + 1))} disabled={hashPage === hashTotalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                ถัดไป →
              </button>
            </div>
          )}
        </div>
      )}

      {modalAccount && (
        <AccountModal
          account={modalAccount === "new" ? undefined : modalAccount}
          onClose={() => setModalAccount(null)}
          onDone={() => { setModalAccount(null); load(); }}
        />
      )}
    </div>
  );
}
