"use client";
import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";

type ToastTone = "success" | "error" | "warning";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  exiting: boolean;
}

interface ToastContextType {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 400);
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, tone, exiting: false }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const toneConfig = {
  success: {
    border: "border-green-500",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    title: "สำเร็จ",
    titleColor: "text-green-700",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    border: "border-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    title: "เกิดข้อผิดพลาด",
    titleColor: "text-red-700",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  warning: {
    border: "border-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    title: "แจ้งเตือน",
    titleColor: "text-amber-700",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
};

function Toast({
  message,
  tone,
  exiting,
  onDismiss,
}: {
  message: string;
  tone: ToastTone;
  exiting: boolean;
  onDismiss: () => void;
}) {
  const c = toneConfig[tone];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 bg-white rounded-2xl shadow-lg border-l-4 ${c.border} px-4 py-3.5 min-w-[300px] max-w-sm ${exiting ? "toast-exit" : "toast-enter"}`}
    >
      <div className={`w-8 h-8 rounded-full ${c.iconBg} ${c.iconColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        {c.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${c.titleColor}`}>{c.title}</p>
        <p className="text-sm text-gray-700 mt-0.5 leading-snug">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
