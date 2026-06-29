"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface User { id: string; fullName: string; email: string; }

export default function SendPage() {
  const [canEdit, setCanEdit] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.replace("/dashboard"); return; }
    const parsed = JSON.parse(u);
    const perms: any[] = parsed.permissions ?? [];
    const isLegacyAdmin = parsed.role === "admin" && !perms.length;
    const perm = perms.find((p: any) => p.menu === "line");
    const canView = isLegacyAdmin || (perm?.canView ?? false);
    if (!canView) { window.location.replace("/dashboard"); return; }
    setCanEdit(isLegacyAdmin || (perm?.canEdit ?? false));
  }, []);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.getUsers().then(setUsers); }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!image || !title) return;
    if (!sendToAll && selectedIds.length === 0) {
      setResult("กรุณาเลือก User หรือเลือกส่งทั้งหมด");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", image);
      fd.append("title", title);
      fd.append("price", price);
      fd.append("note", note);

      if (sendToAll) {
        await api.sendToAll(fd);
      } else {
        fd.append("targetUserIds", JSON.stringify(selectedIds));
        await api.sendMessage(fd);
      }
      setResult("ส่งสำเร็จ!");
      setImage(null); setPreview(null); setTitle(""); setPrice(""); setNote(""); setSelectedIds([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      setResult("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setLoading(false);
    }
  }

  function toggleUser(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6">ส่งรูปเข้า LINE Group</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพ *</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} required
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
          {preview && <img src={preview} alt="preview" className="mt-2 w-40 h-32 object-cover rounded-lg border" />}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ราคา</label>
          <input type="text" value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" id="sendAll" checked={sendToAll} onChange={(e) => setSendToAll(e.target.checked)} className="w-4 h-4 accent-green-500" />
            <label htmlFor="sendAll" className="text-sm font-medium text-gray-700">ส่งให้ทุก User</label>
          </div>
          {!sendToAll && (
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="w-4 h-4 accent-green-500" />
                  <span className="text-sm">{u.fullName}</span>
                  <span className="text-xs text-gray-400">{u.email}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {result && (
          <p className={`text-sm font-medium ${result.includes("สำเร็จ") ? "text-green-600" : "text-red-500"}`}>{result}</p>
        )}

        {canEdit && (
          <button type="submit" disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
            {loading ? "กำลังส่ง..." : "ส่งเข้า LINE Group"}
          </button>
        )}
      </form>
    </div>
  );
}
