"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface User { id: string; fullName: string; email: string; role: string; createdAt: string; }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() {
    const data = await api.getUsers();
    setUsers(data);
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.createUser(form);
      setShowForm(false);
      setForm({ email: "", password: "", fullName: "", role: "user" });
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">จัดการ Users</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          + เพิ่ม User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-5 mb-6 space-y-3">
          <h3 className="font-semibold text-gray-700">เพิ่ม User ใหม่</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="ชื่อ-นามสกุล" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
            <input placeholder="อีเมล" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
            <input placeholder="รหัสผ่าน" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50">
              {loading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg">
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border rounded-xl divide-y">
        {users.length === 0 && <p className="text-sm text-gray-400 p-6 text-center">ยังไม่มี User</p>}
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{u.fullName}</p>
              <p className="text-xs text-gray-400">{u.email}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
              {u.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
