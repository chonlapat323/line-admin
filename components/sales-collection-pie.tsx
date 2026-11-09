"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DonutChart from "./donut-chart";

interface SalesDoc {
  type: "invoice" | "cash";
  serial: string;
  contactName: string;
  date: string;
  status: string;
  grandTotal: number;
  counted: boolean;
}

interface SalesOverview {
  documents?: SalesDoc[];
  invoiceTotal: number;
  cashTotal: number;
  salesTotal: number;
  invoiceCount: number;
  cashCount: number;
  slipTotal: number;
  slipCount: number;
}

const STATUS_TH: Record<string, string> = {
  awaiting: "รอดำเนินการ",
  invoicedelivered: "รอเก็บเงิน",
  processed: "ดำเนินการแล้ว",
  approvedandprocessed: "ดำเนินการแล้ว",
  approved: "อนุมัติ",
  void: "ยกเลิก",
};

const baht = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

// ยอดซื้อจากลูกค้า (FlowAccount: ใบส่งของ/ใบแจ้งหนี้ + ขายเงินสด) เทียบกับยอดที่เซลล์เก็บ (สลิป)
export default function SalesCollectionPie({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<SalesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    setLoading(true); setError(false);
    (api.getSalesOverview(from, to) as Promise<SalesOverview>)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to]);

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
        <p className="text-sm font-semibold text-gray-600 mb-2">ยอดซื้อ vs ยอดที่เซลล์เก็บ</p>
        <p className="h-48 flex items-center justify-center text-sm text-gray-400">ดึงข้อมูลจาก FlowAccount ไม่สำเร็จ</p>
      </div>
    );
  }

  const sales = data?.salesTotal ?? 0;
  const collected = data?.slipTotal ?? 0;
  const remaining = Math.max(0, sales - collected);
  const over = collected - sales;
  const pct = sales > 0 ? Math.round((collected / sales) * 100) : 0;

  return (
    <div className="h-full flex flex-col gap-2">
      <DonutChart
        title="ยอดซื้อ vs ยอดที่เซลล์เก็บ"
        loading={loading}
        formatValue={baht}
        data={[
          { key: "collected", label: "เซลล์เก็บแล้ว (สลิป)", value: Math.min(collected, sales || collected), color: "#16a34a" },
          { key: "remaining", label: "ยังไม่ได้เก็บ", value: remaining, color: "#e5e7eb" },
        ]}
      />
      {!loading && data && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 text-sm grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-400">ยอดซื้อจากลูกค้า (FlowAccount)</p>
            <p className="font-bold text-gray-800 tabular-nums">{baht(sales)}</p>
            <p className="text-xs text-gray-400">{data.invoiceCount + data.cashCount} เอกสาร</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">เซลล์เก็บแล้ว {sales > 0 && `(${pct}%)`}</p>
            <p className="font-bold text-green-700 tabular-nums">{baht(collected)}</p>
            <p className="text-xs text-gray-400">{data.slipCount} สลิป</p>
          </div>
          <button type="button" onClick={() => setShowDocs(true)}
            className="col-span-2 mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700 text-left">
            ดูรายการเอกสาร →
          </button>
          {over > 0 && (
            <p className="col-span-2 text-xs text-amber-600">เก็บได้เกินยอดซื้อในช่วงนี้ {baht(over)} (อาจเป็นการเก็บเงินบิลเดือนก่อน)</p>
          )}
        </div>
      )}
      {showDocs && data && <DocsModal data={data} onClose={() => setShowDocs(false)} />}
    </div>
  );
}

// popup รายการเอกสารขายที่ดึงจาก FlowAccount — ใบที่ไม่นับเข้ายอดแสดงเป็นสีจาง
function DocsModal({ data, onClose }: { data: SalesOverview; onClose: () => void }) {
  const docs = data.documents ?? [];
  const counted = docs.filter((d) => d.counted);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-800">เอกสารขายจาก FlowAccount</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              นับเข้ายอด {counted.length} ใบ · ใบส่งของ {baht(data.invoiceTotal)} · ขายเงินสด {baht(data.cashTotal)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">เลขที่เอกสาร</th>
                <th className="text-left px-4 py-2">วันที่</th>
                <th className="text-left px-4 py-2">ลูกค้า</th>
                <th className="text-left px-4 py-2">สถานะ</th>
                <th className="text-right px-4 py-2">ยอดรวมสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">ไม่มีเอกสารในช่วงนี้</td></tr>
              ) : docs.map((d) => (
                <tr key={`${d.type}-${d.serial}`} className={`border-t border-gray-50 ${d.counted ? "" : "text-gray-300"}`}>
                  <td className="px-4 py-2 font-mono whitespace-nowrap">
                    {d.serial}
                    {d.type === "cash" && <span className="ml-1.5 text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">เงินสด</span>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{d.date}</td>
                  <td className="px-4 py-2">{d.contactName}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {STATUS_TH[d.status] ?? d.status}
                    {!d.counted && <span className="ml-1 text-[10px]">(ไม่นับ)</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{baht(d.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
            {docs.length > 0 && (
              <tfoot className="border-t border-gray-200 bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-gray-600">รวมที่นับ ({counted.length} ใบ)</td>
                  <td className="px-4 py-2 text-right tabular-nums">{baht(data.salesTotal)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
