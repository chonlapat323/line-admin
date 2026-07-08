"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
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

  const [commissionThreshold, setCommissionThreshold] = useState("");
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [tiers, setTiers] = useState<{ max: string; rate: string }[]>([{ max: "", rate: "" }]);
  const [previewAmount, setPreviewAmount] = useState("");

  const [visitSheetId, setVisitSheetId] = useState("");
  const [commissionSheetId, setCommissionSheetId] = useState("");
  const [sheetLoading, setSheetLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { window.location.replace("/dashboard"); return; }
    const parsed = JSON.parse(u);
    const perms: any[] = parsed.permissions ?? [];
    const isLegacyAdmin = parsed.role === "admin" && !perms.length;
    const perm = perms.find((p: any) => p.menu === "settings");
    const canView = isLegacyAdmin || (perm?.canView ?? false);
    if (!canView) { window.location.replace("/dashboard"); return; }
    setCanEdit(isLegacyAdmin || (perm?.canEdit ?? false));
    setAuthorized(true);
  }, []);

  useEffect(() => {
    if (!authorized) return;
    const token = localStorage.getItem("token");
    Promise.all([
      fetch(`${API_URL}/settings`).then((r) => r.json()),
      fetch(`${API_URL}/settings/slip`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/settings/commission`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/settings/sheets`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([line, slip, commission, sheets]) => {
        if (line.lineBotId) setLineBotId(line.lineBotId);
        setSlipProvider(slip.provider || "slip2go");
        setHasSlip2GoSecret(slip.hasSlip2GoSecret || false);
        setHasEasySlipSecret(slip.hasEasySlipSecret || false);
        setCommissionThreshold(commission.threshold > 0 ? String(commission.threshold) : "");
        if (commission.tiers && commission.tiers.length > 0) {
          setTiers(commission.tiers.map((t: any) => ({ max: t.max != null ? String(t.max) : "", rate: String(t.rate) })));
        }
        setVisitSheetId(sheets.visitSheetId || "");
        setCommissionSheetId(sheets.commissionSheetId || "");
      })
      .catch(() => toast("โหลดการตั้งค่าล้มเหลว", "error"))
      .finally(() => setInitialLoading(false));
  }, [authorized]);

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

  function getTierMin(index: number) {
    if (index === 0) return 0;
    return parseFloat(tiers[index - 1].max) || 0;
  }

  function calcPreview() {
    const amount = parseFloat(previewAmount);
    if (!amount || isNaN(amount) || tiers.length === 0) return null;
    const fullTiers = tiers.map((t, i) => ({
      min: getTierMin(i), max: t.max !== "" ? parseFloat(t.max) : null, rate: parseFloat(t.rate) || 0,
    }));
    let total = 0;
    const rows: { label: string; commission: number }[] = [];
    for (const tier of fullTiers) {
      const tierMax = tier.max ?? Infinity;
      if (amount <= tier.min) break;
      const amt = Math.min(amount, tierMax) - tier.min;
      const com = Math.round(amt * tier.rate) / 100;
      total += com;
      const maxLabel = tier.max != null ? `฿${tier.max.toLocaleString("th-TH")}` : "∞";
      rows.push({ label: `฿${tier.min.toLocaleString("th-TH")} – ${maxLabel} × ${tier.rate}%`, commission: com });
    }
    return { rows, total };
  }

  function addTier() {
    const lastMin = getTierMin(tiers.length - 1);
    const suggested = lastMin + 50000;
    setTiers(prev => [
      ...prev.slice(0, -1),
      { ...prev[prev.length - 1], max: String(suggested) },
      { max: "", rate: "" },
    ]);
  }

  function removeTier(index: number) {
    if (tiers.length <= 1) return;
    const next = tiers.filter((_, i) => i !== index);
    if (index === tiers.length - 1) next[next.length - 1] = { ...next[next.length - 1], max: "" };
    setTiers(next);
  }

  async function handleSaveCommission(e: React.FormEvent) {
    e.preventDefault();
    for (let i = 0; i < tiers.length; i++) {
      const rate = parseFloat(tiers[i].rate);
      if (isNaN(rate) || rate < 0 || rate > 100) { toast(`กรอก % ที่ถูกต้องสำหรับขั้นที่ ${i + 1}`, "error"); return; }
      if (i < tiers.length - 1) {
        const max = parseFloat(tiers[i].max);
        if (isNaN(max) || max <= getTierMin(i)) { toast(`ยอดสูงสุดของขั้นที่ ${i + 1} ต้องมากกว่ายอดต่ำสุด`, "error"); return; }
      }
    }
    const threshold = parseFloat(commissionThreshold) || 0;
    const fullTiers = tiers.map((t, i) => ({
      min: getTierMin(i), max: t.max !== "" ? parseFloat(t.max) : null, rate: parseFloat(t.rate) || 0,
    }));
    setCommissionLoading(true);
    try {
      await api.updateCommissionSettings({ threshold, tiers: fullTiers });
      toast("บันทึก Commission Settings สำเร็จ", "success");
    } catch { toast("บันทึกล้มเหลว", "error"); }
    finally { setCommissionLoading(false); }
  }

  async function handleSaveSheets(e: React.FormEvent) {
    e.preventDefault();
    setSheetLoading(true);
    try {
      await api.updateSheetSettings({ visitSheetId, commissionSheetId });
      toast("บันทึก Google Sheets สำเร็จ", "success");
    } catch { toast("บันทึกล้มเหลว", "error"); }
    finally { setSheetLoading(false); }
  }

  if (!authorized) return null;

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
          {canEdit && (
            <button type="submit" disabled={lineLoading || initialLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
              {lineLoading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          )}
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

          {canEdit && (
            <button type="submit" disabled={slipLoading || initialLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
              {slipLoading ? "กำลังบันทึก..." : "บันทึก Slip Settings"}
            </button>
          )}
        </form>
      </div>
      {/* Commission */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-yellow-50 flex items-center justify-center text-xs">💰</span>
          ค่าคอมมิชชัน
        </h3>
        <form onSubmit={handleSaveCommission} className="space-y-4">
          {/* Threshold */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">ยอดขั้นต่ำต่อเดือน (บาท)</label>
            <p className="text-xs text-gray-400 mb-2">ต้องถึงยอดนี้ก่อนจึงจะได้ค่าคอม (0 = ไม่มีขั้นต่ำ)</p>
            <div className="relative">
              <input type="number" value={commissionThreshold} onChange={(e) => setCommissionThreshold(e.target.value)}
                placeholder="เช่น 50000" min="0" step="any"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none pr-14" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">บาท</span>
            </div>
          </div>

          {/* Tiers */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">อัตราขั้นบันได (%)</label>
            <div className="space-y-2">
              {tiers.map((tier, i) => {
                const min = getTierMin(i);
                const isLast = i === tiers.length - 1;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 min-w-0">
                      <span className="font-mono font-semibold text-gray-700 whitespace-nowrap">
                        ฿{min.toLocaleString("th-TH")}
                      </span>
                      <span>–</span>
                      {isLast ? (
                        <span className="text-gray-400">∞</span>
                      ) : (
                        <div className="relative flex-1 min-w-[80px]">
                          <input
                            type="number" value={tier.max}
                            onChange={(e) => setTiers(prev => prev.map((t, j) => j === i ? { ...t, max: e.target.value } : t))}
                            placeholder="ยอดสูงสุด" min={min + 0.01} step="any"
                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-semibold text-gray-700 focus:ring-1 focus:ring-green-400 focus:outline-none" />
                        </div>
                      )}
                    </div>
                    <div className="relative w-20 flex-shrink-0">
                      <input
                        type="number" value={tier.rate}
                        onChange={(e) => setTiers(prev => prev.map((t, j) => j === i ? { ...t, rate: e.target.value } : t))}
                        placeholder="%" min="0" max="100" step="0.01"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-center focus:ring-2 focus:ring-green-400 focus:outline-none pr-7" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                    {tiers.length > 1 && (
                      <button type="button" onClick={() => removeTier(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {canEdit && (
              <button type="button" onClick={addTier}
                className="mt-2 w-full py-2 text-xs font-semibold text-green-600 border border-dashed border-green-300 rounded-xl hover:bg-green-50 transition-colors">
                + เพิ่มขั้น
              </button>
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">ทดสอบคำนวณ</label>
            <div className="relative">
              <input type="number" value={previewAmount} onChange={(e) => setPreviewAmount(e.target.value)}
                placeholder="ใส่ยอดขายเพื่อดูตัวอย่าง" min="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none pr-14" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">บาท</span>
            </div>
            {(() => {
              const preview = calcPreview();
              if (!preview) return null;
              return (
                <div className="mt-2 p-3 bg-yellow-50 rounded-xl space-y-1">
                  {preview.rows.map((r, i) => (
                    <div key={i} className="flex justify-between text-xs text-yellow-800">
                      <span>{r.label}</span>
                      <span className="font-semibold">+฿{r.commission.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs font-bold text-yellow-900 border-t border-yellow-200 pt-1 mt-1">
                    <span>รวมค่าคอม</span>
                    <span>฿{preview.total.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {canEdit && (
            <button type="submit" disabled={commissionLoading || initialLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
              {commissionLoading ? "กำลังบันทึก..." : "บันทึก Commission Settings"}
            </button>
          )}
        </form>
      </div>
      {/* Google Sheets */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-xs">📊</span>
          Google Sheets
        </h3>
        <p className="text-xs text-gray-400 mb-4">วาง Spreadsheet ID จาก URL: docs.google.com/spreadsheets/d/<span className="font-mono font-semibold text-gray-600">ID ตรงนี้</span>/edit</p>
        <form onSubmit={handleSaveSheets} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sheet ID — บันทึกทริป</label>
            <input type="text" value={visitSheetId} onChange={(e) => setVisitSheetId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-green-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sheet ID — บันทึกค่าคอม (slip อนุมัติแล้ว)</label>
            <input type="text" value={commissionSheetId} onChange={(e) => setCommissionSheetId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-green-400 focus:outline-none" />
            <p className="text-xs text-gray-400 mt-1">บันทึกอัตโนมัติเมื่อ admin กด "อนุมัติ" ใน หน้าตรวจสอบสลิป</p>
          </div>
          {canEdit && (
            <button type="submit" disabled={sheetLoading || initialLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
              {sheetLoading ? "กำลังบันทึก..." : "บันทึก Google Sheets"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
