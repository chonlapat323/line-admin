"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface BankAccount {
  id: string;
  label: string;
  bankId: string;
  bankName: string;
  accountNumber: string;
  isActive: boolean;
  createdAt: string;
}

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bank ID</label>
              <input value={form.bankId} onChange={(e) => set("bankId", e.target.value)}
                placeholder="เช่น 004"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อธนาคาร</label>
              <input value={form.bankName} onChange={(e) => set("bankName", e.target.value)}
                placeholder="เช่น ธนาคารกสิกรไทย"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
            </div>
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

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAccount, setModalAccount] = useState<BankAccount | "new" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">บัญชีธนาคารที่รับชำระ</h2>
          <p className="text-sm text-gray-400 mt-0.5">บัญชีที่ใช้ตรวจสอบผู้รับเงินจากสลิป</p>
        </div>
        <button onClick={() => setModalAccount("new")}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
          + เพิ่มบัญชี
        </button>
      </div>

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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Bank ID</th>
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
                    <td className="px-4 py-3 font-mono text-gray-600">{acc.bankId}</td>
                    <td className="px-4 py-3 text-gray-700">{acc.bankName}</td>
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
