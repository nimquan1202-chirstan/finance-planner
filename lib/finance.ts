import type { Filters } from "@/lib/validation";

const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export function formatVND(amount: number) {
  return vnd.format(amount);
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Hàm thuần: trả về { gte, lt } cho where.date
export function getDateRange(
  range: Filters["range"],
  now = new Date(),
) {
  if (range === "all") return undefined;
  const back = range === "last-month" ? 1 : 0;
  const y = now.getFullYear();
  const m = now.getMonth() - back; // 0 - 1 → tháng 12
  return {
    gte: new Date(y, m, 1), // ngày 1 của tháng
    lt: new Date(y, m + 1, 1), // ngày 1 tháng sau
  };
}

// Hàm thuần: không đọc DB, không gọi mạng
export function wishlistProgress(
  balance: number, cost: number,
): number {
  if (cost <= 0) return 100;
  const percent =
    Math.floor((balance / cost) * 100);
  return Math.min(100, Math.max(0, percent));
}

export const MILESTONES = [50, 75, 100] as const;

export function crossedMilestones(
  prev: number, next: number,
): number[] {
  return MILESTONES.filter(
    (m) => prev < m && next >= m);
}

// Hàm thuần tính số dư từ danh sách giao dịch
export function calculateBalance(
  items: { type: "INCOME" | "EXPENSE"; amount: number }[],
): number {
  return items.reduce((acc, item) => {
    return item.type === "INCOME" ? acc + item.amount : acc - item.amount;
  }, 0);
}

// Hàm thuần gom nhóm chi tiêu theo danh mục
export function spendingByCategory(
  items: { type: "INCOME" | "EXPENSE"; category: string; amount: number }[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    if (item.type === "EXPENSE") {
      result[item.category] = (result[item.category] ?? 0) + item.amount;
    }
  }
  return result;
}
