"use client";
import DonutChart from "./donut-chart";
import { CUSTOMER_TYPE_LABEL, RESULT_LABEL } from "@/lib/labels";

interface VisitLike {
  customerType: string;
  result?: string;
  orderAmount?: number | null;
  user?: { fullName: string };
}

const SALES_COLORS = ["#0b74e5", "#06b6d4", "#f97316", "#f59e0b", "#84cc16", "#a855f7", "#ec4899"];
const MAX_SLICES = 6;

// รวมค่าตามเซลล์ เรียงมาก→น้อย เกิน MAX_SLICES รวมเป็น "อื่นๆ"
function bySalesPerson(visits: VisitLike[], valueOf: (v: VisitLike) => number) {
  const map = new Map<string, number>();
  for (const v of visits) {
    const name = v.user?.fullName ?? "ไม่ระบุ";
    map.set(name, (map.get(name) ?? 0) + valueOf(v));
  }
  const sorted = Array.from(map.entries()).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES).reduce((s, [, n]) => s + n, 0);
  if (rest > 0) top.push(["อื่นๆ", rest]);
  return top.map(([label, value], i) => ({ key: label, label, value, color: label === "อื่นๆ" ? "#9ca3af" : SALES_COLORS[i % SALES_COLORS.length] }));
}

// สัดส่วนจำนวนการเยี่ยมของแต่ละเซลล์
export function VisitsBySalesPie({ visits, loading }: { visits: VisitLike[]; loading?: boolean }) {
  return <DonutChart title="จำนวนเยี่ยมตามเซลล์" loading={loading} data={bySalesPerson(visits, () => 1)} />;
}

// สัดส่วนยอดซื้อ (จากทริปที่ซื้อ) ของแต่ละเซลล์
export function SalesAmountBySalesPie({ visits, loading }: { visits: VisitLike[]; loading?: boolean }) {
  return (
    <DonutChart
      title="ยอดซื้อตามเซลล์"
      loading={loading}
      data={bySalesPerson(visits, (v) => (v.result === "buy" ? v.orderAmount ?? 0 : 0))}
      formatValue={(n) => `฿${n.toLocaleString("th-TH")}`}
    />
  );
}

// สัดส่วนลูกค้าเก่า/ใหม่ ของทริปที่กรองแล้ว
export function CustomerTypePie({ visits, loading }: { visits: VisitLike[]; loading?: boolean }) {
  const count = (t: string) => visits.filter((v) => v.customerType === t).length;
  return (
    <DonutChart
      title="ลูกค้า"
      loading={loading}
      data={[
        { key: "existing", label: CUSTOMER_TYPE_LABEL.existing, value: count("existing"), color: "#0b74e5" },
        { key: "new", label: CUSTOMER_TYPE_LABEL.new, value: count("new"), color: "#06b6d4" },
      ]}
    />
  );
}

// สัดส่วนผลการออกทริป ซื้อ/ไม่ซื้อ/ไม่พบ
export function VisitResultPie({ visits, loading }: { visits: VisitLike[]; loading?: boolean }) {
  const count = (r: string) => visits.filter((v) => v.result === r).length;
  return (
    <DonutChart
      title="การตอบรับ"
      loading={loading}
      data={[
        { key: "no_buy", label: RESULT_LABEL.no_buy, value: count("no_buy"), color: "#f59e0b" },
        { key: "buy", label: RESULT_LABEL.buy, value: count("buy"), color: "#f97316" },
        { key: "not_found", label: RESULT_LABEL.not_found, value: count("not_found"), color: "#84cc16" },
      ]}
    />
  );
}
