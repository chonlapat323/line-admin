"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { toast } = useToast();
  const [lineBotId, setLineBotId] = useState("");
  const [lineLoading, setLineLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [slipProvider, setSlipProvider] = useState("slip2go");
  const [slip2goSecret, setSlip2goSecret] = useState("");
  const [easyslipSecret, setEasyslipSecret] = useState("");
  const [hasSlip2GoSecret, setHasSlip2GoSecret] = useState(false);
  const [hasEasySlipSecret, setHasEasySlipSecret] = useState(false);
  const [editSlip2go, setEditSlip2go] = useState(false);
  const [editEasyslip, setEditEasyslip] = useState(false);
  const [slipLoading, setSlipLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      fetch(`${API_URL}/settings`).then((r) => r.json()),
      fetch(`${API_URL}/settings/slip`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([line, slip]) => {
        if (line.lineBotId) setLineBotId(line.lineBotId);
        setSlipProvider(slip.provider || "slip2go");
        setHasSlip2GoSecret(slip.hasSlip2GoSecret || false);
        setHasEasySlipSecret(slip.hasEasySlipSecret || false);
      })
      .catch(() => toast("โหลดการตั้งค่าล้มเหลว", "error"))
      .finally(() => setInitialLoading(false));
  }, []);

  async function handleSaveLine(e: React.FormEvent) {
    e.preventDefault();
    setLineLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lineBotId }),
      });
      if (!res.ok) throw new Error();
      toast("บันทึกสำเร็จ", "success");
    } catch {
      toast("บันทึกล้มเหลว", "error");
    } finally {
      setLineLoading(false);
    }
  }

  async function handleSaveSlip(e: React.FormEvent) {
    e.preventDefault();
    setSlipLoading(true);
    try {
      await api.updateSlipSettings({
        provider: slipProvider,
        ...(editSlip2go && slip2goSecret ? { slip2goSecret } : {}),
        ...(editEasyslip && easyslipSecret ? { easyslipSecret } : {}),
      });
      toast("บันทึก Slip Settings สำเร็จ", "success");
      if (editSlip2go && slip2goSecret) { setHasSlip2GoSecret(true); setEditSlip2go(false); setSlip2goSecret(""); }
      if (editEasyslip && easyslipSecret) { setHasEasySlipSecret(true); setEditEasyslip(false); setEasyslipSecret(""); }
    } catch {
      toast("บันทึกล้มเหลว", "error");
    } finally {
      setSlipLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-bold text-gray-800">ตั้งค่าระบบ</h2>
        <p className="text-sm text-gray-400 mt-0.5">จัดการการตั้งค่าระบบ</p>
      </div>

      {/* LINE Bot */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-xs">💬</span>
          LINE Bot
        </h3>
        <form onSubmit={handleSaveLine} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">LINE Bot Basic ID</label>
            <p className="text-xs text-gray-400 mb-2">ใช้แสดงลิงก์เพิ่มบอทใน mobile app</p>
            {initialLoading ? (
              <div className="h-10 bg-gray-200 animate-pulse rounded-xl" />
            ) : (
              <input type="text" value={lineBotId} onChange={(e) => setLineBotId(e.target.value)}
                placeholder="@xxxxxxxx"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
            )}
          </div>
          {lineBotId && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
              <p className="text-xs text-green-700">
                ลิงก์เพิ่มเพื่อน: <span className="font-mono font-medium">https://line.me/R/ti/p/{lineBotId}</span>
              </p>
            </div>
          )}
          <button type="submit" disabled={lineLoading || initialLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
            {lineLoading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </form>
      </div>

      {/* Slip Verification */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-xs">🧾</span>
          Slip Verification
        </h3>
        <form onSubmit={handleSaveSlip} className="space-y-5">
          {/* Provider */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Provider</label>
            <select value={slipProvider} onChange={(e) => setSlipProvider(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none bg-white">
              <option value="slip2go">Slip2Go</option>
              <option value="easyslip">EasySlip</option>
            </select>
          </div>

          {/* Slip2Go Secret */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Slip2Go Secret Key
            </label>
            {!editSlip2go ? (
              <div className="flex items-center gap-2">
                <div className={`flex-1 border rounded-xl px-4 py-2.5 text-sm ${hasSlip2GoSecret ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                  {hasSlip2GoSecret ? "••••••••••••••••••••• (ตั้งค่าแล้ว)" : "ยังไม่ได้ตั้งค่า"}
                </div>
                <button type="button" onClick={() => setEditSlip2go(true)}
                  className="px-3 py-2.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                  แก้ไข
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input type="password" value={slip2goSecret} onChange={(e) => setSlip2goSecret(e.target.value)}
                  placeholder="วาง Secret Key ใหม่"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
                <button type="button" onClick={() => { setEditSlip2go(false); setSlip2goSecret(""); }}
                  className="px-3 py-2.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
                  ยกเลิก
                </button>
              </div>
            )}
          </div>

          {/* EasySlip Secret */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              EasySlip Secret Key
              <span className="ml-2 text-xs font-normal text-gray-400">(coming soon)</span>
            </label>
            {!editEasyslip ? (
              <div className="flex items-center gap-2">
                <div className={`flex-1 border rounded-xl px-4 py-2.5 text-sm ${hasEasySlipSecret ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                  {hasEasySlipSecret ? "••••••••••••••••••••• (ตั้งค่าแล้ว)" : "ยังไม่ได้ตั้งค่า"}
                </div>
                <button type="button" onClick={() => setEditEasyslip(true)}
                  className="px-3 py-2.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                  แก้ไข
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input type="password" value={easyslipSecret} onChange={(e) => setEasyslipSecret(e.target.value)}
                  placeholder="วาง Secret Key ใหม่"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none" />
                <button type="button" onClick={() => { setEditEasyslip(false); setEasyslipSecret(""); }}
                  className="px-3 py-2.5 text-xs border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
                  ยกเลิก
                </button>
              </div>
            )}
          </div>

          <button type="submit" disabled={slipLoading || initialLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
            {slipLoading ? "กำลังบันทึก..." : "บันทึก Slip Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
