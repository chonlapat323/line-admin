"use client";
import DonutChart from "./donut-chart";
import { CUSTOMER_TYPE_LABEL, RESULT_LABEL } from "@/lib/labels";

interface VisitLike {
  customerType: string;
  result?: string;
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
