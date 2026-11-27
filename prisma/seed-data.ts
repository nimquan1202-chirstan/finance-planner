import type { Category, Priority, TransactionType } from "../generated/prisma/enums";

export interface SeedTransactionInput {
  amount: number;
  type: TransactionType;
  category: Category;
  description: string;
  date: Date;
}

export interface SeedWishlistInput {
  name: string;
  price: number;
  priority: Priority;
  link: string | null;
  purchased: boolean;
  targetDate: Date;
  notifiedMilestone: number;
}

export interface SeedBudgetInput {
  category: Category;
  month: string;
  limitAmount: number;
}

function localNoon(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

function daysAgo(now: Date, offsetDays: number): Date {
  return localNoon(now.getFullYear(), now.getMonth(), now.getDate() - offsetDays);
}

function monthDay(
  now: Date,
  monthsAgo: number,
  preferredDay: number,
): Date {
  if (monthsAgo === 0) {
    const clampedDay = Math.min(preferredDay, now.getDate());
    return localNoon(now.getFullYear(), now.getMonth(), clampedDay);
  }
  return localNoon(now.getFullYear(), now.getMonth() - monthsAgo, preferredDay);
}

function addMonths(now: Date, monthsAhead: number): Date {
  const target = new Date(
    now.getFullYear(),
    now.getMonth() + monthsAhead,
    Math.min(now.getDate(), 28),
    12,
    0,
    0,
    0,
  );
  return target;
}

export function buildSeedData(now = new Date()): {
  transactions: SeedTransactionInput[];
  wishlist: SeedWishlistInput[];
  budgets: SeedBudgetInput[];
} {
  const todayDay = now.getDate();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 5 consecutive days ending today:
  // If todayDay >= 5, all 5 dates are in M0 (placed on last 5 M0 expenses).
  // If todayDay < 5, todayDay days are in M0 and (5 - todayDay) days are at the end of M-1.
  const m0StreakCount = Math.min(5, todayDay);
  const m1StreakCount = 5 - m0StreakCount;

  const m0RecentDate = (idxFromEnd: number) => {
    // idxFromEnd: 0 = oldest of the M0 streak block, m0StreakCount - 1 = today
    const offset = m0StreakCount - 1 - idxFromEnd;
    return daysAgo(now, offset);
  };

  const m1RecentDate = (idxFromEnd: number, fallbackDay: number) => {
    if (idxFromEnd < m1StreakCount) {
      // offset in [todayDay .. 4]
      const offset = 4 - idxFromEnd;
      return daysAgo(now, offset);
    }
    return monthDay(now, 1, fallbackDay);
  };

  // M0: 2 INCOME (14,500,000 đ) + 17 EXPENSE (7,269,000 đ) = 19 rows
  const m0Transactions: SeedTransactionInput[] = [
    {
      amount: 12_000_000,
      type: "INCOME",
      category: "SALARY",
      description: "Lương chính thức tháng hiện tại",
      date: monthDay(now, 0, 1),
    },
    {
      amount: 2_500_000,
      type: "INCOME",
      category: "SALARY",
      description: "Thưởng & dạy kèm gia sư tháng này",
      date: monthDay(now, 0, 5),
    },
    {
      amount: 3_200_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Tiền phòng trọ tháng hiện tại",
      date: monthDay(now, 0, 2),
    },
    {
      amount: 420_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Tiền điện nước sinh hoạt",
      date: monthDay(now, 0, 3),
    },
    {
      amount: 220_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Cước Internet cáp quang",
      date: monthDay(now, 0, 4),
    },
    {
      amount: 620_000,
      type: "EXPENSE",
      category: "FOOD",
      description: "Đi siêu thị WinMart đầu tháng",
      date: monthDay(now, 0, 5),
    },
    {
      amount: 80_000,
      type: "EXPENSE",
      category: "TRANSPORT",
      description: "Đổ xăng xe máy",
      date: monthDay(now, 0, 6),
    },
    {
      amount: 100_000,
      type: "EXPENSE",
      category: "TRANSPORT",
      description: "Vé tháng xe buýt sinh viên",
      date: monthDay(now, 0, 7),
    },
    {
      amount: 290_000,
      type: "EXPENSE",
      category: "SHOPPING",
      description: "Áo thun thể thao Uniqlo",
      date: monthDay(now, 0, 8),
    },
    {
      amount: 1_500_000,
      type: "EXPENSE",
      category: "INVESTMENT",
      description: "Gửi tiết kiệm tích lũy định kỳ",
      date: monthDay(now, 0, 9),
    },
    {
      amount: 59_000,
      type: "EXPENSE",
      category: "ENTERTAINMENT",
      description: "Gói nghe nhạc Spotify hàng tháng",
      date: monthDay(now, 0, 10),
    },
    {
      amount: 75_000,
      type: "EXPENSE",
      category: "ENTERTAINMENT",
      description: "Thuê sân cầu lông cuối tuần",
      date: monthDay(now, 0, 11),
    },
    {
      amount: 110_000,
      type: "EXPENSE",
      category: "TRANSPORT",
      description: "Bảo dưỡng & thay nhớt xe máy",
      date: monthDay(now, 0, 12),
    },
    {
      amount: 85_000,
      type: "EXPENSE",
      category: "SHOPPING",
      description: "Bàn di chuột máy tính",
      date: monthDay(now, 0, 13),
    },
    // Last 5 M0 expenses carry the M0 streak portion
    {
      amount: 100_000,
      type: "EXPENSE",
      category: "OTHER",
      description: "Đóng quỹ lớp học kỳ",
      date: m0StreakCount >= 5 ? m0RecentDate(0) : monthDay(now, 0, 1),
    },
    {
      amount: 240_000,
      type: "EXPENSE",
      category: "FOOD",
      description: "Ăn tối lẩu cùng nhóm đồ án",
      date: m0StreakCount >= 4 ? m0RecentDate(m0StreakCount - 4) : monthDay(now, 0, 1),
    },
    {
      amount: 90_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Gia hạn gói cước 4G Viettel",
      date: m0StreakCount >= 3 ? m0RecentDate(m0StreakCount - 3) : monthDay(now, 0, 1),
    },
    {
      amount: 45_000,
      type: "EXPENSE",
      category: "FOOD",
      description: "Ăn trưa bún bò giò heo",
      date: m0StreakCount >= 2 ? m0RecentDate(m0StreakCount - 2) : monthDay(now, 0, 1),
    },
    {
      amount: 35_000,
      type: "EXPENSE",
      category: "FOOD",
      description: "Cà phê sáng cùng bạn học",
      date: m0RecentDate(m0StreakCount - 1),
    },
  ];

  // M-1: 2 INCOME (11,500,000 đ) + 6 EXPENSE (5,660,000 đ) = 8 rows
  const m1Transactions: SeedTransactionInput[] = [
    {
      amount: 9_000_000,
      type: "INCOME",
      category: "SALARY",
      description: "Lương tháng trước",
      date: monthDay(now, 1, 5),
    },
    {
      amount: 2_500_000,
      type: "INCOME",
      category: "SALARY",
      description: "Dạy kèm gia sư tiếng Anh",
      date: monthDay(now, 1, 15),
    },
    {
      amount: 3_200_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Tiền phòng trọ tháng trước",
      date: monthDay(now, 1, 5),
    },
    {
      amount: 380_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Tiền điện nước tháng trước",
      date: monthDay(now, 1, 8),
    },
    {
      amount: 1_000_000,
      type: "EXPENSE",
      category: "INVESTMENT",
      description: "Tích lũy tài chính định kỳ",
      date: m1RecentDate(3, 18),
    },
    {
      amount: 550_000,
      type: "EXPENSE",
      category: "FOOD",
      description: "Đi siêu thị thực phẩm tuần 1",
      date: m1RecentDate(2, 20),
    },
    {
      amount: 80_000,
      type: "EXPENSE",
      category: "TRANSPORT",
      description: "Đổ xăng xe máy",
      date: m1RecentDate(1, 22),
    },
    {
      amount: 450_000,
      type: "EXPENSE",
      category: "FOOD",
      description: "Thực phẩm tươi sống cuối tháng",
      date: m1RecentDate(0, 26),
    },
  ];

  // M-2: 3 rows (Income 9,000,000; Expense 4,150,000)
  const m2Transactions: SeedTransactionInput[] = [
    {
      amount: 9_000_000,
      type: "INCOME",
      category: "SALARY",
      description: "Lương cách đây 2 tháng",
      date: monthDay(now, 2, 5),
    },
    {
      amount: 3_200_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Tiền phòng trọ & sinh hoạt",
      date: monthDay(now, 2, 6),
    },
    {
      amount: 950_000,
      type: "EXPENSE",
      category: "FOOD",
      description: "Chi phí ăn uống hàng tháng",
      date: monthDay(now, 2, 16),
    },
  ];

  // M-3: 2 rows (Income 8,500,000; Expense 3,800,000)
  const m3Transactions: SeedTransactionInput[] = [
    {
      amount: 8_500_000,
      type: "INCOME",
      category: "SALARY",
      description: "Lương cách đây 3 tháng",
      date: monthDay(now, 3, 5),
    },
    {
      amount: 3_800_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Tiền phòng trọ & hóa đơn cố định",
      date: monthDay(now, 3, 10),
    },
  ];

  // M-4: 2 rows (Income 8,500,000; Expense 3,900,000)
  const m4Transactions: SeedTransactionInput[] = [
    {
      amount: 8_500_000,
      type: "INCOME",
      category: "SALARY",
      description: "Lương cách đây 4 tháng",
      date: monthDay(now, 4, 5),
    },
    {
      amount: 3_900_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Tiền phòng trọ & hóa đơn cố định",
      date: monthDay(now, 4, 12),
    },
  ];

  // M-5: 2 rows (Income 8,000,000; Expense 3,500,000)
  const m5Transactions: SeedTransactionInput[] = [
    {
      amount: 8_000_000,
      type: "INCOME",
      category: "SALARY",
      description: "Lương cách đây 5 tháng",
      date: monthDay(now, 5, 5),
    },
    {
      amount: 3_500_000,
      type: "EXPENSE",
      category: "BILLS",
      description: "Tiền phòng trọ & hóa đơn cố định",
      date: monthDay(now, 5, 11),
    },
  ];

  const transactions = [
    ...m5Transactions,
    ...m4Transactions,
    ...m3Transactions,
    ...m2Transactions,
    ...m1Transactions,
    ...m0Transactions,
  ];

  // Calibrated to net balance 31,721,000 đ -> 100%, 83%, 61%, 35%
  const wishlist: SeedWishlistInput[] = [
    {
      name: "Bàn phím cơ không dây",
      price: 1_800_000,
      priority: "HIGH",
      link: "https://example.com/keyboard",
      purchased: false,
      targetDate: addMonths(now, 1),
      notifiedMilestone: 100,
    },
    {
      name: "Laptop lập trình 14 inch",
      price: 38_000_000,
      priority: "HIGH",
      link: "https://example.com/laptop",
      purchased: false,
      targetDate: addMonths(now, 3),
      notifiedMilestone: 75,
    },
    {
      name: "Xe máy điện đi học",
      price: 52_000_000,
      priority: "MEDIUM",
      link: "https://example.com/ebike",
      purchased: false,
      targetDate: addMonths(now, 6),
      notifiedMilestone: 50,
    },
    {
      name: "Quỹ dự phòng sau tốt nghiệp",
      price: 90_000_000,
      priority: "LOW",
      link: null,
      purchased: false,
      targetDate: addMonths(now, 12),
      notifiedMilestone: 0,
    },
  ];

  // Current month budgets covering SAFE (<80%), WARNING_80 (80-99%), EXCEEDED_100 (>=100%)
  const budgets: SeedBudgetInput[] = [
    { category: "BILLS", month: currentMonthStr, limitAmount: 5_500_000 },
    { category: "TRANSPORT", month: currentMonthStr, limitAmount: 600_000 },
    { category: "FOOD", month: currentMonthStr, limitAmount: 1_100_000 },
    { category: "ENTERTAINMENT", month: currentMonthStr, limitAmount: 150_000 },
    { category: "SHOPPING", month: currentMonthStr, limitAmount: 300_000 },
  ];

  return { transactions, wishlist, budgets };
}

const initialSeed = buildSeedData();
export const ROWS = initialSeed.transactions;
export const WISHLIST = initialSeed.wishlist;
