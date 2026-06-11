"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function SettingsPage() {
  const { toast } = useToast();
  const [lineBotId, setLineBotId] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then((r) => r.json())
      .then((d) => {
        if (d.lineBotId) setLineBotId(d.lineBotId);
      })
      .catch(() => toast("โหลดการตั้งค่าล้มเหลว", "error"))
      .finally(() => setInitialLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lineBotId }),
      });
      if (!res.ok) throw new Error("บันทึกล้มเหลว");
      toast("บันทึกการตั้งค่าสำเร็จ", "success");
    } catch {
      toast("บันทึกล้มเหลว กรุณาลองใหม่", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-bold text-gray-800">ตั้งค่าระบบ</h2>
        <p className="text-sm text-gray-400 mt-0.5">จัดการการตั้งค่า LINE Bot</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-green-700" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </span>
          ข้อมูล LINE Bot
        </h3>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              LINE Bot Basic ID
            </label>
            <p className="text-xs text-gray-400 mb-2">
              ใช้แสดงลิงก์เพิ่มบอทเป็นเพื่อนใน mobile app เช่น <span className="font-mono bg-gray-100 px-1 rounded">@abc1234</span>
            </p>
            {initialLoading ? (
              <div className="h-10 bg-gray-200 animate-pulse rounded-xl" />
            ) : (
              <input
                type="text"
                value={lineBotId}
                onChange={(e) => setLineBotId(e.target.value)}
                placeholder="@xxxxxxxx"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent focus:outline-none"
              />
            )}
          </div>

          {lineBotId && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
              <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-green-700">
                ลิงก์เพิ่มเพื่อน:{" "}
                <span className="font-mono font-medium">
                  https://line.me/R/ti/p/{lineBotId}
                </span>
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || initialLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm"
          >
            {loading ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
          </button>
        </form>
      </div>
    </div>
  );
}
