"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DonutChart from "./donut-chart";

interface SalesOverview {
  salesTotal: number;
  invoiceCount: number;
  cashCount: number;
  slipTotal: number;
  slipCount: number;
}

const baht = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

// ยอดซื้อจากลูกค้า (FlowAccount: ใบส่งของ/ใบแจ้งหนี้ + ขายเงินสด) เทียบกับยอดที่เซลล์เก็บ (สลิป)
export default function SalesCollectionPie({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<SalesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
          {over > 0 && (
            <p className="col-span-2 text-xs text-amber-600">เก็บได้เกินยอดซื้อในช่วงนี้ {baht(over)} (อาจเป็นการเก็บเงินบิลเดือนก่อน)</p>
          )}
        </div>
      )}
    </div>
  );
}
