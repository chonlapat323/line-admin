"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

// กราฟโดนัทพร้อม legend — ใช้ร่วมกันระหว่างกราฟลูกค้าและกราฟการตอบรับ
export default function DonutChart({ title, data, loading, formatValue = (v) => v.toLocaleString("th-TH") }: {
  title: string; data: DonutSlice[]; loading?: boolean; formatValue?: (v: number) => string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const slices = data.filter((d) => d.value > 0);
  const pct = (v: number) => (total > 0 ? `${((v / total) * 100).toFixed(1)}%` : "0%");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <p className="text-sm font-semibold text-gray-600 mb-2">{title}</p>
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-36 h-36 rounded-full border-[18px] border-gray-100 animate-pulse" />
        </div>
      ) : total === 0 ? (
        <p className="h-48 flex items-center justify-center text-sm text-gray-400">ไม่มีข้อมูล</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full max-w-[220px] aspect-square">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="55%"
                  outerRadius="95%"
                  startAngle={90}
                  endAngle={-270}
                  stroke="#fff"
                  strokeWidth={2}
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
                    if (value / total < 0.05) return null;
                    const r = (innerRadius + outerRadius) / 2;
                    const rad = (-midAngle * Math.PI) / 180;
                    return (
                      <text x={cx + r * Math.cos(rad)} y={cy + r * Math.sin(rad)} fill="#fff"
                        textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                        {pct(value)}
                      </text>
                    );
                  }}
                >
                  {slices.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [`${formatValue(Number(v))} (${pct(Number(v))})`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex sm:flex-col flex-wrap justify-center gap-x-4 gap-y-2">
            {data.map((d) => (
              <li key={d.key} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span>{d.label}</span>
                <span className="text-gray-400 tabular-nums">{formatValue(d.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
