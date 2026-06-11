"use client";
import { useState, useEffect } from "react";

interface Log {
  id: string;
  imageUrl: string;
  details: { title: string; price: string; note: string };
  status: string;
  errorMessage?: string;
  createdAt: string;
  targetUser?: { fullName: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function HistoryPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/line/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 text-sm">กำลังโหลด...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">ประวัติการส่ง</h2>
      {logs.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีประวัติ</p>}
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="bg-white border rounded-xl p-4 flex gap-4 items-start">
            <img src={log.imageUrl} alt="" className="w-16 h-16 object-cover rounded-lg border flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{log.details?.title}</p>
              {log.details?.price && <p className="text-xs text-red-500">ราคา: {log.details.price}</p>}
              {log.targetUser && <p className="text-xs text-gray-400">ถึง: {log.targetUser.fullName}</p>}
              <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString("th-TH")}</p>
              {log.errorMessage && <p className="text-xs text-red-400 mt-1">{log.errorMessage}</p>}
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${log.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {log.status === "success" ? "สำเร็จ" : "ล้มเหลว"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
