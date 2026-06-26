"use client";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  bankName: string | null;
  bankAccount: string | null;
  createdAt: string;
}

const ROLES = [
  { value: "", label: "ทุกสิทธิ์" },
  { value: "admin", label: "Admin" },
  { value: "user", label: "User" },
];

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u || JSON.parse(u).role !== "admin") {
      window.location.replace("/dashboard");
      return;
    }
    setAuthorized(true);
  }, []);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "user" });
  const [editForm, setEditForm] = useState({ fullName: "", email: "", role: "user", password: "", bankName: "", bankAccount: "" });
  const [submitting, setSubmitting] = useState(false);

  async function loadUsers() {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch {
      toast("โหลดข้อมูลล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createUser(form);
      setShowModal(false);
      setForm({ email: "", password: "", fullName: "", role: "user" });
      await loadUsers();
      toast("เพิ่ม User สำเร็จ", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "เพิ่ม User ล้มเหลว", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(u: User) {
    setEditTarget(u);
    setEditForm({ fullName: u.fullName, email: u.email, role: u.role, password: "", bankName: u.bankName ?? "", bankAccount: u.bankAccount ?? "" });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const payload: any = { fullName: editForm.fullName, email: editForm.email, role: editForm.role, bankName: editForm.bankName, bankAccount: editForm.bankAccount };
      if (editForm.password) payload.password = editForm.password;
      await api.updateUser(editTarget.id, payload);
      setEditTarget(null);
      await loadUsers();
      toast("แก้ไข User สำเร็จ", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "แก้ไขล้มเหลว", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await loadUsers();
      toast(`ลบ ${deleteTarget.fullName} สำเร็จ`, "success");
    } catch {
      toast("ลบ User ล้มเหลว", "error");
    }
  }

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">จัดการ Users</h2>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} บัญชีทั้งหมด</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          เพิ่ม User
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="ค้นหาชื่อหรืออีเมล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent text-gray-600"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">ชื่อ-นามสกุล</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">อีเมล</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">สิทธิ์</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">บัญชีธนาคาร</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden xl:table-cell">วันที่สมัคร</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                      <div className="h-3.5 w-28 bg-gray-200 animate-pulse rounded" />
                    </div>
                  </td>
                  <td className="px-5 py-4"><div className="h-3.5 w-40 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-4"><div className="h-5 w-14 bg-gray-200 animate-pulse rounded-full" /></td>
                  <td className="px-5 py-4 hidden lg:table-cell"><div className="h-3.5 w-28 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-4 hidden xl:table-cell"><div className="h-3.5 w-24 bg-gray-200 animate-pulse rounded" /></td>
                  <td className="px-5 py-4"></td>
                </tr>
              ))
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <div className="text-gray-400">
                    <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-medium">ไม่พบ User</p>
                    <p className="text-xs mt-1">{search ? "ลองค้นหาด้วยคำอื่น" : "เพิ่ม User คนแรกได้เลย"}</p>
                  </div>
                </td>
              </tr>
            )}
            {!loading && filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {u.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{u.fullName}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-500">{u.email}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    u.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-green-50 text-green-700"
                  }`}>
                    {u.role === "admin" ? "Admin" : "User"}
                  </span>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  {u.bankName ? (
                    <div>
                      <div className="text-xs font-medium text-gray-700">{u.bankName}</div>
                      <div className="text-xs font-mono text-gray-400 mt-0.5">{u.bankAccount}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-gray-400 text-xs hidden xl:table-cell">
                  {new Date(u.createdAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(u)}
                      className="text-gray-400 hover:text-blue-500 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                      title="แก้ไข"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                      title="ลบ"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            แสดง {filtered.length} จาก {users.length} บัญชี
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">เพิ่ม User ใหม่</h3>
                <p className="text-xs text-gray-400 mt-0.5">กรอกข้อมูลเพื่อสร้างบัญชีใหม่</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                <input
                  placeholder="กรอกชื่อ-นามสกุล"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">อีเมล <span className="text-red-500">*</span></label>
                <input
                  placeholder="กรอกอีเมล"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">รหัสผ่าน <span className="text-red-500">*</span></label>
                <input
                  placeholder="กรอกรหัสผ่าน"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">สิทธิ์</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none text-gray-700"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">แก้ไข User</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editTarget.email}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                <input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">อีเมล <span className="text-red-500">*</span></label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">สิทธิ์</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none text-gray-700">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">ธนาคาร</label>
                  <select value={editForm.bankName} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none text-gray-700">
                    <option value="">— เลือกธนาคาร —</option>
                    <option value="กรุงเทพ">กรุงเทพ (BBL)</option>
                    <option value="กสิกรไทย">กสิกรไทย (KBANK)</option>
                    <option value="กรุงไทย">กรุงไทย (KTB)</option>
                    <option value="ไทยพาณิชย์">ไทยพาณิชย์ (SCB)</option>
                    <option value="กรุงศรีอยุธยา">กรุงศรีอยุธยา (BAY)</option>
                    <option value="ทหารไทยธนชาต">ทหารไทยธนชาต (TTB)</option>
                    <option value="ออมสิน">ออมสิน (GSB)</option>
                    <option value="ธ.ก.ส.">ธ.ก.ส. (BAAC)</option>
                    <option value="ซีไอเอ็มบี">ซีไอเอ็มบี (CIMB)</option>
                    <option value="ยูโอบี">ยูโอบี (UOB)</option>
                    <option value="ทิสโก้">ทิสโก้ (TISCO)</option>
                    <option value="เกียรตินาคินภัทร">เกียรตินาคินภัทร (KKP)</option>
                    <option value="แลนด์แอนด์เฮ้าส์">แลนด์แอนด์เฮ้าส์ (LH Bank)</option>
                    <option value="ไทยเครดิต">ไทยเครดิต (Thai Credit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">เลขบัญชี</label>
                  <input placeholder="xxx-x-xxxxx-x" value={editForm.bankAccount} onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">รหัสผ่านใหม่ <span className="text-gray-400 font-normal">(เว้นว่างถ้าไม่เปลี่ยน)</span></label>
                <input type="password" placeholder="กรอกรหัสผ่านใหม่" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60">
                  {submitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800 text-center">ยืนยันการลบ</h3>
            <p className="text-sm text-gray-500 text-center mt-1.5">
              คุณแน่ใจหรือไม่ว่าต้องการลบ <span className="font-semibold text-gray-700">{deleteTarget.fullName}</span>?<br />
              การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
