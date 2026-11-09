"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// ช่องค้นหาชื่อพร้อมรายการให้เลือก — พิมพ์เพื่อกรอง หรือกดเลือกจากรายการ
export default function NameCombobox({ value, onChange, options, placeholder = "ค้นหาชื่อเซล..." }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, []);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = Array.from(new Set(options)).sort((a, b) => a.localeCompare(b, "th"));
    return q && !list.includes(value) ? list.filter((n) => n.toLowerCase().includes(q)) : list;
  }, [options, value]);

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-[200px] max-w-xs">
      <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${value ? "text-green-200" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
      </svg>
      <input type="text" placeholder={placeholder} value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        className={`w-full pl-9 pr-8 py-1.5 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-green-400 font-medium transition-colors ${value ? "bg-green-500 text-white placeholder:text-green-200" : "bg-gray-100 text-gray-600 placeholder:text-gray-400"}`} />
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="แสดงรายชื่อ"
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 ${value ? "text-green-100" : "text-gray-400"}`}>
        <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-white rounded-xl border border-gray-100 shadow-lg py-1">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">ไม่พบชื่อ</li>
          ) : matches.map((n) => (
            <li key={n}>
              <button type="button" onClick={() => { onChange(n); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 ${n === value ? "text-green-700 font-semibold" : "text-gray-700"}`}>
                {n}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
