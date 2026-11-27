import type { Filters } from "@/lib/validation";

export function formatVND(amount: number) {
  return `${Math.round(amount).toLocaleString("vi-VN")} đ`;
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

// ==========================================
// CÁC TÍNH NĂNG MỞ RỘNG (TỪ BÀI ÂN & PHÁT)
// ==========================================

// 1. Phân tích Quy tắc 50/30/20 (Thiết yếu / Mong muốn / Tích lũy)
export interface Rule503020Result {
  needs: { amount: number; percent: number; targetPercent: number };
  wants: { amount: number; percent: number; targetPercent: number };
  savings: { amount: number; percent: number; targetPercent: number };
  totalExpense: number;
  totalIncome: number;
}

export function calculate503020Rule(
  expenses: { category: string; amount: number }[],
  totalIncome: number,
  customTargets?: { needs?: number; wants?: number; savings?: number },
): Rule503020Result {
  let needsAmount = 0;
  let wantsAmount = 0;
  let totalExpense = 0;

  const targetNeeds = customTargets?.needs ?? 50;
  const targetWants = customTargets?.wants ?? 30;
  const targetSavings = customTargets?.savings ?? 20;

  const NEEDS_CATEGORIES = new Set(["FOOD", "TRANSPORT", "BILLS"]);
  const SAVINGS_CATEGORIES = new Set(["INVESTMENT"]);

  for (const item of expenses) {
    totalExpense += item.amount;
    if (NEEDS_CATEGORIES.has(item.category)) {
      needsAmount += item.amount;
    } else if (SAVINGS_CATEGORIES.has(item.category)) {
      // Đầu tư tích lũy
    } else {
      // SHOPPING, ENTERTAINMENT, OTHER
      wantsAmount += item.amount;
    }
  }

  // Tích lũy = Chênh lệch thu - chi (nếu dương) + các khoản đầu tư
  const investmentAmount = expenses
    .filter((e) => SAVINGS_CATEGORIES.has(e.category))
    .reduce((sum, e) => sum + e.amount, 0);

  const netSavings = Math.max(0, totalIncome - totalExpense);
  const totalSavings = netSavings + investmentAmount;

  // Tính tỷ lệ % so với tổng thu (hoặc so với tổng chi nếu chưa có thu)
  const base = totalIncome > 0 ? totalIncome : totalExpense;
  const needsPercent = base > 0 ? Math.round((needsAmount / base) * 100) : 0;
  const wantsPercent = base > 0 ? Math.round((wantsAmount / base) * 100) : 0;
  const savingsPercent = base > 0 ? Math.round((totalSavings / base) * 100) : 0;

  return {
    needs: { amount: needsAmount, percent: needsPercent, targetPercent: targetNeeds },
    wants: { amount: wantsAmount, percent: wantsPercent, targetPercent: targetWants },
    savings: { amount: totalSavings, percent: savingsPercent, targetPercent: targetSavings },
    totalExpense,
    totalIncome,
  };
}

// 2. Tính chuỗi ngày ghi chép liên tiếp (Streak)
export function calculateStreak(dates: Date[], now = new Date()): number {
  if (!dates || dates.length === 0) return 0;

  // Chuyển về định dạng chuỗi ngày YYYY-MM-DD theo giờ địa phương
  const toDayString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = toDayString(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = toDayString(yesterday);

  const uniqueDays = Array.from(new Set(dates.map(toDayString))).sort().reverse();
  if (uniqueDays.length === 0) return 0;

  // Nếu ngày gần nhất không phải hôm nay hoặc hôm qua thì chuỗi đã bị đứt
  const mostRecent = uniqueDays[0];
  if (mostRecent !== todayStr && mostRecent !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let checkDate = mostRecent === todayStr ? now : yesterday;

  for (let i = 0; i < uniqueDays.length; i++) {
    const expectedStr = toDayString(checkDate);
    if (uniqueDays[i] === expectedStr) {
      streak++;
      checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// 3. Dự báo số dư cuối tháng
export function calculateMonthEndForecast(
  currentIncome: number,
  currentExpense: number,
  now = new Date(),
): {
  dailyAverageExpense: number;
  projectedExpense: number;
  projectedBalance: number;
  status: "safe" | "warning" | "deficit";
} {
  const currentDay = Math.max(1, now.getDate());
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const dailyAverageExpense = Math.round(currentExpense / currentDay);
  const projectedExpense = dailyAverageExpense * totalDaysInMonth;
  const projectedBalance = currentIncome - projectedExpense;

  let status: "safe" | "warning" | "deficit" = "safe";
  if (projectedBalance < 0) {
    status = "deficit";
  } else if (projectedBalance < currentIncome * 0.1) {
    status = "warning";
  }

  return {
    dailyAverageExpense,
    projectedExpense,
    projectedBalance,
    status,
  };
}

// 4. Tính toán tiến độ & tốc độ tích lũy Wishlist theo Deadline
export function calculateWishlistPace(
  cost: number,
  balance: number,
  targetDate: Date | null,
  now = new Date(),
): {
  daysRemaining: number;
  neededPerDay: number;
  isOverdue: boolean;
  hasTargetDate: boolean;
} {
  if (!targetDate) {
    return {
      daysRemaining: 0,
      neededPerDay: 0,
      isOverdue: false,
      hasTargetDate: false,
    };
  }

  const remainingCost = Math.max(0, cost - Math.max(0, balance));
  const diffTime = targetDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      daysRemaining: 0,
      neededPerDay: remainingCost,
      isOverdue: remainingCost > 0,
      hasTargetDate: true,
    };
  }

  const neededPerDay = Math.ceil(remainingCost / daysRemaining);

  return {
    daysRemaining,
    neededPerDay,
    isOverdue: false,
    hasTargetDate: true,
  };
}

// 5. Tính trạng thái ngân sách danh mục (80% & 100%)
export function calculateBudgetStatus(
  spent: number,
  limitAmount: number,
): {
  percent: number;
  status: "normal" | "warning" | "exceeded";
} {
  if (limitAmount <= 0) {
    return { percent: 0, status: "normal" };
  }

  const percent = Math.round((spent / limitAmount) * 100);

  if (percent >= 100) {
    return { percent, status: "exceeded" };
  }
  if (percent >= 80) {
    return { percent, status: "warning" };
  }
  return { percent, status: "normal" };
}

// 6. Chống CSV / Formula Injection (CSV Injection Protection)
export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // Nếu chuỗi bắt đầu bằng =, +, -, @, \t, hoặc \r thì thêm dấu nháy đơn ' để ngăn spreadsheet thực thi formula
  const isDangerousStart = /^[=+\-@\t\r]/.test(str);
  const sanitized = isDangerousStart ? `'${str}` : str;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

// 7. Thuật toán đánh giá khả năng mua (Purchasing Power & Affordability Algorithm)
export interface AffordabilityResult {
  score: "READY" | "HIGH" | "MODERATE" | "LOW" | "OVERDUE";
  label: string;
  badgeClass: string;
  recommendation: string;
  estimatedMonths: number;
  isAffordableNow: boolean;
}

export function calculateAffordability(
  price: number,
  balance: number,
  monthlySavings: number,
  targetDate: Date | null,
  now = new Date(),
): AffordabilityResult {
  if (price <= 0) {
    return {
      score: "READY",
      label: "Sẵn sàng",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      recommendation: "Món đồ không tốn chi phí, có thể mua ngay.",
      estimatedMonths: 0,
      isAffordableNow: true,
    };
  }

  if (balance >= price) {
    return {
      score: "READY",
      label: "Đủ khả năng mua",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      recommendation: "Số dư hiện tại đã đủ chi trả toàn bộ món đồ.",
      estimatedMonths: 0,
      isAffordableNow: true,
    };
  }

  const deficit = price - Math.max(0, balance);
  const safeMonthlySavings = monthlySavings > 0 ? monthlySavings : 0;
  const estimatedMonths = safeMonthlySavings > 0 ? Math.ceil(deficit / safeMonthlySavings) : 999;

  if (targetDate) {
    const deadline = new Date(targetDate);
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return {
        score: "OVERDUE",
        label: "Đã quá hạn",
        badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
        recommendation: "Mục tiêu đã quá hạn nhưng chưa tích lũy đủ số dư.",
        estimatedMonths,
        isAffordableNow: false,
      };
    }

    const availableMonths = diffDays / 30;
    if (estimatedMonths <= availableMonths) {
      return {
        score: "HIGH",
        label: "Khả thi cao",
        badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
        recommendation: "Kịp mục tiêu trước hạn chót theo nhịp tiết kiệm hiện tại.",
        estimatedMonths,
        isAffordableNow: false,
      };
    }
  }

  if (estimatedMonths <= 3) {
    return {
      score: "HIGH",
      label: "Khả thi cao",
      badgeClass: "bg-teal-50 text-teal-800 border-teal-200",
      recommendation: `Dự kiến đạt mục tiêu trong khoảng ${estimatedMonths} tháng.`,
      estimatedMonths,
      isAffordableNow: false,
    };
  }

  if (estimatedMonths <= 6) {
    return {
      score: "MODERATE",
      label: "Khả thi trung bình",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      recommendation: `Cần khoảng ${estimatedMonths} tháng tiết kiệm đều đặn.`,
      estimatedMonths,
      isAffordableNow: false,
    };
  }

  return {
    score: "LOW",
    label: "Cần tích lũy thêm",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
    recommendation: "Nên tăng tỷ lệ tiết kiệm hoặc giãn hạn chót để giảm áp lực tài chính.",
    estimatedMonths,
    isAffordableNow: false,
  };
}
