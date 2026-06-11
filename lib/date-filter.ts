export type Period = "today" | "week" | "month" | "custom";

export const PERIOD_OPTIONS = [
  { value: "today" as Period, label: "วันนี้" },
  { value: "week" as Period, label: "สัปดาห์นี้" },
  { value: "month" as Period, label: "เดือนนี้" },
  { value: "custom" as Period, label: "กำหนดเอง" },
];

export function getDateRange(
  period: Period,
  customFrom: string,
  customTo: string
): { start: Date; end: Date } | null {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") return { start: todayStart, end: now };

  if (period === "week") {
    const day = now.getDay();
    const daysBack = day === 0 ? 6 : day - 1; // Monday = 0
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - daysBack);
    return { start: weekStart, end: now };
  }

  if (period === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }

  if (period === "custom" && customFrom && customTo) {
    const start = new Date(customFrom);
    const end = new Date(customTo);
    end.setHours(23, 59, 59, 999);
    if (start <= end) return { start, end };
  }

  return null;
}

export function filterByDateRange<T extends { createdAt: string }>(
  items: T[],
  period: Period,
  customFrom: string,
  customTo: string
): T[] {
  const range = getDateRange(period, customFrom, customTo);
  if (!range) return items;
  return items.filter((item) => {
    const d = new Date(item.createdAt);
    return d >= range.start && d <= range.end;
  });
}

export function formatThaiDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
