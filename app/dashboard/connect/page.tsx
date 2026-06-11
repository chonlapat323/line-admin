"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface User { id: string; fullName: string; email: string; }

export default function ConnectPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.getUsers().then(setUsers); }, []);

  async function generateCode() {
    if (!selected) return;
    setLoading(true);
    try {
      const data = await api.getVerificationCode(selected);
      setCode(data);
    } catch {
      alert("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-bold text-gray-800 mb-2">เชื่อมต่อ LINE Group</h2>
      <p className="text-sm text-gray-500 mb-6">สร้างรหัสยืนยัน แล้วนำไปพิมพ์ในกลุ่ม LINE ที่มี Bot อยู่</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">เลือก User</label>
          <select value={selected} onChange={(e) => { setSelected(e.target.value); setCode(null); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none">
            <option value="">-- เลือก User --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
            ))}
          </select>
        </div>

        <button onClick={generateCode} disabled={!selected || loading}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50">
          {loading ? "กำลังสร้าง..." : "สร้างรหัสยืนยัน"}
        </button>

        {code && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-500 mb-1">รหัสยืนยัน</p>
            <p className="text-3xl font-bold text-green-600 tracking-widest">{code.code}</p>
            <p className="text-xs text-gray-400 mt-2">
              หมดอายุ {new Date(code.expiresAt).toLocaleTimeString("th-TH")}
            </p>
            <p className="text-xs text-gray-500 mt-3">พิมพ์รหัสนี้ในกลุ่ม LINE ที่ต้องการเชื่อมต่อ</p>
          </div>
        )}
      </div>
    </div>
  );
}
