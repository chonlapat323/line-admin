"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { RichTextEditor } from "@/components/RichTextEditor";

interface AnnouncementRow {
  id: string;
  title: string;
  bodyHtml: string;
  imageUrl?: string | null;
  buttonText?: string | null;
  buttonUrl?: string | null;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  sentBy?: { fullName: string };
}

function ConfirmModal({ title, bodyHtml, onCancel, onConfirm, sending }: {
  title: string;
  bodyHtml: string;
  onCancel: () => void;
  onConfirm: () => void;
  sending: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">ยืนยันส่งประกาศ</h3>
          <p className="text-sm text-gray-500 mt-1">
            ข้อความนี้จะถูกส่งไปหา <b>ทุกคน</b> ที่แอด LINE OA เป็นเพื่อนทันที และไม่สามารถยกเลิกได้หลังส่ง
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-sm font-bold text-gray-800">{title}</p>
          <div className="text-sm text-gray-600 mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={sending}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
            ยกเลิก
          </button>
          <button onClick={onConfirm} disabled={sending}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
            {sending ? "กำลังส่ง..." : "ยืนยันส่ง"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [history, setHistory] = useState<AnnouncementRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.getAnnouncements();
      setHistory(data ?? []);
    } catch { /* ignore */ }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const isEmpty = !title.trim() || !bodyHtml.trim() || bodyHtml === "<p></p>";

  async function handleConfirmSend() {
    setSending(true);
    setError("");
    try {
      await api.sendAnnouncement({
        title: title.trim(),
        bodyHtml,
        imageUrl: imageUrl.trim() || undefined,
        buttonText: buttonText.trim() || undefined,
        buttonUrl: buttonUrl.trim() || undefined,
      });
      setSuccess("ส่งประกาศสำเร็จแล้ว");
      setTitle(""); setBodyHtml(""); setImageUrl(""); setButtonText(""); setButtonUrl("");
      setShowConfirm(false);
      loadHistory();
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError((e as Error).message || "ส่งไม่สำเร็จ กรุณาลองใหม่");
      setShowConfirm(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">ประกาศ</h2>
        <p className="text-sm text-gray-400 mt-0.5">ส่งข้อความประกาศผ่าน LINE OA ไปหาทุกคนที่แอดบอทเป็นเพื่อน</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">{success}</div>
      )}

      {/* Compose form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
        <div>
          <label className="text-sm font-semibold text-gray-600">หัวข้อ</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น อัปเดตแอปเวอร์ชันใหม่แล้ว!"
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-600">เนื้อหา</label>
          <div className="mt-1">
            <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-600">รูปภาพ (ไม่บังคับ)</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..."
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-semibold text-gray-600">ปุ่ม (ข้อความ)</label>
              <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="อัปเดตเลย"
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">ปุ่ม (ลิงก์)</label>
              <input value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://play.google.com/..."
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isEmpty}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            ส่งประกาศ
          </button>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">ประวัติการส่ง</h3>
        </div>
        {loadingHistory ? (
          <div className="p-6 text-center text-sm text-gray-400">กำลังโหลด...</div>
        ) : history.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">ยังไม่มีประกาศที่ส่ง</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((a) => (
              <div key={a.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                    {a.sentBy && ` · โดย ${a.sentBy.fullName}`}
                  </p>
                  {a.status === "failed" && a.errorMessage && (
                    <p className="text-xs text-red-500 mt-1">{a.errorMessage}</p>
                  )}
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  a.status === "sent" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                }`}>
                  {a.status === "sent" ? "ส่งสำเร็จ" : "ล้มเหลว"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          title={title}
          bodyHtml={bodyHtml}
          sending={sending}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmSend}
        />
      )}
    </div>
  );
}
