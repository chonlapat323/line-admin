"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

const MENUS = [
  { menu: "dashboard", label: "ภาพรวม" },
  { menu: "sales", label: "สถิติเซล" },
  { menu: "visits", label: "ประวัติการเยี่ยม" },
  { menu: "approvals", label: "จัดการสลิป" },
  { menu: "commissions", label: "ค่าคอมมิชชัน" },
  { menu: "users", label: "จัดการ Users" },
  { menu: "roles", label: "จัดการสิทธิ์" },
  { menu: "settings", label: "ตั้งค่า" },
  { menu: "line", label: "LINE" },
];

type Permission = { menu: string; label: string; canView: boolean; canEdit: boolean; canDelete: boolean };
type Role = {
  id: string; name: string; label: string; isSystem: boolean; isActive: boolean;
  permissions: Permission[]; userCount: number; createdAt: string;
};

function buildEmptyPerms(): Permission[] {
  return MENUS.map((m) => ({ menu: m.menu, label: m.label, canView: false, canEdit: false, canDelete: false }));
}

function PermMatrix({ perms, onChange, disabled }: {
  perms: Permission[]; onChange: (p: Permission[]) => void; disabled?: boolean;
}) {
  function toggle(menu: string, field: keyof Permission) {
    onChange(perms.map((p) => p.menu === menu ? { ...p, [field]: !p[field] } : p));
  }
  function setAll(field: keyof Permission, value: boolean) {
    onChange(perms.map((p) => ({ ...p, [field]: value })));
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">หน้า</th>
            {(["canView", "canEdit", "canDelete"] as const).map((f) => (
              <th key={f} className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase w-20">
                <div>{f === "canView" ? "ดู" : f === "canEdit" ? "แก้ไข" : "ลบ"}</div>
                {!disabled && (
                  <div className="flex gap-1 justify-center mt-1">
                    <button type="button" onClick={() => setAll(f, true)}
                      className="text-[10px] text-green-600 hover:underline">ทั้งหมด</button>
                    <span className="text-gray-300">|</span>
                    <button type="button" onClick={() => setAll(f, false)}
                      className="text-[10px] text-red-400 hover:underline">ล้าง</button>
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {perms.map((p) => (
            <tr key={p.menu} className="hover:bg-gray-50">
              <td className="py-2.5 pr-4 text-gray-700 font-medium">{p.label}</td>
              {(["canView", "canEdit", "canDelete"] as const).map((f) => (
                <td key={f} className="py-2.5 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={p[f] as boolean}
                    onChange={() => !disabled && toggle(p.menu, f)}
                    disabled={disabled}
                    className="w-4 h-4 rounded accent-green-600 cursor-pointer disabled:cursor-default"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RolesPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({ name: "", label: "", permissions: buildEmptyPerms() });
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.replace("/dashboard"); return; }
    const parsed = JSON.parse(u);
    const perms: Permission[] = parsed.permissions ?? [];
    const isLegacyAdmin = parsed.role === "admin" && !perms.length;
    const rolePerm = perms.find((p: Permission) => p.menu === "roles");
    const canView = isLegacyAdmin || (rolePerm?.canView ?? false);
    if (!canView) { window.location.replace("/dashboard"); return; }
    setCanEdit(isLegacyAdmin || (rolePerm?.canEdit ?? false));
    setCanDelete(isLegacyAdmin || (rolePerm?.canDelete ?? false));
    setAuthorized(true);
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      const data = await api.getRoles();
      setRoles(data);
    } catch {
      toast("โหลด Roles ล้มเหลว", "error");
    } finally {
      setLoading(false);
    }
  }

  function openEdit(role: Role) {
    setEditTarget(role);
    setEditLabel(role.label);
    const full = MENUS.map((m) => {
      const found = role.permissions.find((p) => p.menu === m.menu);
      return { menu: m.menu, label: m.label, canView: found?.canView ?? false, canEdit: found?.canEdit ?? false, canDelete: found?.canDelete ?? false };
    });
    setEditPerms(full);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.label.trim()) return;
    setSubmitting(true);
    try {
      await api.createRole({ name: createForm.name.trim(), label: createForm.label.trim(), permissions: createForm.permissions });
      setShowCreate(false);
      setCreateForm({ name: "", label: "", permissions: buildEmptyPerms() });
      await loadRoles();
      toast("สร้าง Role สำเร็จ", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "สร้าง Role ล้มเหลว", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.updateRole(editTarget.id, { label: editLabel, permissions: editPerms });
      setEditTarget(null);
      await loadRoles();
      toast("แก้ไข Role สำเร็จ", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "แก้ไขล้มเหลว", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(role: Role) {
    try {
      await api.updateRole(role.id, { isActive: !role.isActive });
      await loadRoles();
      toast(`${role.isActive ? "ปิด" : "เปิด"} Role สำเร็จ`, "success");
    } catch {
      toast("เปลี่ยนสถานะล้มเหลว", "error");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      await loadRoles();
      toast("ลบ Role สำเร็จ", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "ลบล้มเหลว", "error");
    }
  }

  if (!authorized) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">จัดการสิทธิ์</h2>
          <p className="text-sm text-gray-400 mt-0.5">{roles.length} Role ทั้งหมด</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            เพิ่ม Role
          </button>
        )}
      </div>

      {/* Roles table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Role</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">หน้าที่เข้าถึงได้</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">ผู้ใช้</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">สถานะ</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-200 animate-pulse rounded" /></td>
                <td className="px-5 py-4 hidden md:table-cell"><div className="h-4 w-48 bg-gray-200 animate-pulse rounded" /></td>
                <td className="px-5 py-4"><div className="h-4 w-10 bg-gray-200 animate-pulse rounded" /></td>
                <td className="px-5 py-4"><div className="h-6 w-14 bg-gray-200 animate-pulse rounded-full" /></td>
                <td className="px-5 py-4"></td>
              </tr>
            ))}
            {!loading && roles.map((role) => {
              const viewableMenus = role.permissions.filter((p) => p.canView).map((p) => p.label);
              return (
                <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">{role.label}</p>
                      <span className="text-xs text-gray-400 font-mono">({role.name})</span>
                      {role.isSystem && (
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">ระบบ</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {viewableMenus.length === 0
                        ? <span className="text-xs text-gray-300">ไม่มีสิทธิ์</span>
                        : viewableMenus.map((m) => (
                          <span key={m} className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{m}</span>
                        ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 tabular-nums">{role.userCount} คน</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => !role.isSystem && handleToggleActive(role)}
                      disabled={role.isSystem}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                        role.isActive
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      } disabled:cursor-default`}
                    >
                      {role.isActive ? "เปิดใช้" : "ปิดใช้"}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => openEdit(role)}
                          className="text-gray-400 hover:text-blue-500 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                          title="แก้ไขสิทธิ์"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && !role.isSystem && (
                        <button
                          onClick={() => setDeleteTarget(role)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                          title="ลบ"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                          </svg>
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

      {/* Create Role Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-800">สร้าง Role ใหม่</h3>
                <p className="text-xs text-gray-400 mt-0.5">กำหนดชื่อและสิทธิ์การเข้าถึง</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 flex-shrink-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">ชื่อ Role (ภาษาอังกฤษ) <span className="text-red-500">*</span></label>
                    <input
                      placeholder="เช่น supervisor"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">ชื่อที่แสดง <span className="text-red-500">*</span></label>
                    <input
                      placeholder="เช่น หัวหน้าทีมขาย"
                      value={createForm.label}
                      onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 pb-2 flex-shrink-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">สิทธิ์การเข้าถึง</p>
              </div>
              <div className="px-6 overflow-y-auto flex-1">
                <PermMatrix
                  perms={createForm.permissions}
                  onChange={(p) => setCreateForm({ ...createForm, permissions: p })}
                />
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60">
                  {submitting ? "กำลังบันทึก..." : "สร้าง Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-800">แก้ไข Role: <span className="text-green-600">{editTarget.label}</span></h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{editTarget.name}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 flex-shrink-0">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">ชื่อที่แสดง</label>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                />
              </div>
              <div className="px-6 pb-2 flex-shrink-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">สิทธิ์การเข้าถึง</p>
              </div>
              <div className="px-6 overflow-y-auto flex-1">
                <PermMatrix
                  perms={editPerms}
                  onChange={setEditPerms}
                  disabled={editTarget.isSystem}
                />
                {editTarget.isSystem && (
                  <p className="text-xs text-amber-600 mt-3 bg-amber-50 px-3 py-2 rounded-lg">Role ระบบไม่สามารถแก้ไข permissions ได้</p>
                )}
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
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

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800 text-center">ยืนยันการลบ Role</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              ลบ <span className="font-semibold text-gray-700">{deleteTarget.label}</span>?<br />
              {deleteTarget.userCount > 0 && (
                <span className="text-red-500">มี {deleteTarget.userCount} ผู้ใช้ใช้ Role นี้อยู่</span>
              )}
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
