import { describe, expect, test } from "vitest";
import {
  wishlistProgress,
  crossedMilestones,
  getDateRange,
  calculateBalance,
  spendingByCategory,
  calculate503020Rule,
  calculateStreak,
  calculateMonthEndForecast,
  calculateWishlistPace,
  calculateBudgetStatus,
  sanitizeCsvField,
} from "@/lib/finance";

describe("wishlistProgress", () => {
  test("tính % và làm tròn xuống", () => {
    expect(wishlistProgress(2_999_999, 4_000_000)).toBe(74);
  });

  test("giới hạn trong 0..100 và xử lý ca biên", () => {
    expect(wishlistProgress(-500_000, 1_000_000)).toBe(0);
    expect(wishlistProgress(9_000_000, 1_000_000)).toBe(100);
    expect(wishlistProgress(100_000, 0)).toBe(100);
    expect(wishlistProgress(100_000, -10_000)).toBe(100);
  });
});

describe("crossedMilestones", () => {
  test("phát hiện mốc đã vượt qua", () => {
    expect(crossedMilestones(40, 55)).toEqual([50]);
    expect(crossedMilestones(45, 80)).toEqual([50, 75]);
    expect(crossedMilestones(45, 105)).toEqual([50, 75, 100]);
  });

  test("không lặp lại mốc đã đạt hoặc không vượt mốc", () => {
    expect(crossedMilestones(50, 50)).toEqual([]);
    expect(crossedMilestones(50, 60)).toEqual([]);
    expect(crossedMilestones(80, 70)).toEqual([]);
  });
});

describe("getDateRange", () => {
  test("range 'all' trả về undefined", () => {
    expect(getDateRange("all")).toBeUndefined();
  });

  test("range 'this-month' trả về khoảng đầu tháng đến đầu tháng sau", () => {
    const fixedNow = new Date("2026-05-15T10:00:00Z");
    const range = getDateRange("this-month", fixedNow);
    expect(range).toBeDefined();
    expect(range?.gte.getFullYear()).toBe(2026);
    expect(range?.gte.getMonth()).toBe(4); // May (0-indexed 4)
    expect(range?.gte.getDate()).toBe(1);
    expect(range?.lt.getMonth()).toBe(5); // June
    expect(range?.lt.getDate()).toBe(1);
  });

  test("ca biên: range 'last-month' vào tháng 1 lùi đúng về tháng 12 năm trước", () => {
    const janDate = new Date(2026, 0, 15); // 15/01/2026
    const range = getDateRange("last-month", janDate);
    expect(range).toBeDefined();
    expect(range?.gte.getFullYear()).toBe(2025);
    expect(range?.gte.getMonth()).toBe(11); // Tháng 12
    expect(range?.gte.getDate()).toBe(1);
    expect(range?.lt.getFullYear()).toBe(2026);
    expect(range?.lt.getMonth()).toBe(0); // Tháng 1
    expect(range?.lt.getDate()).toBe(1);
  });
});

describe("calculateBalance", () => {
  test("tính đúng số dư: thu trừ chi", () => {
    const items = [
      { type: "INCOME" as const, amount: 10_000_000 },
      { type: "EXPENSE" as const, amount: 3_000_000 },
      { type: "EXPENSE" as const, amount: 2_000_000 },
    ];
    expect(calculateBalance(items)).toBe(5_000_000);
  });

  test("xử lý mảng rỗng và trường hợp số dư âm", () => {
    expect(calculateBalance([])).toBe(0);
    const debt = [
      { type: "EXPENSE" as const, amount: 500_000 },
    ];
    expect(calculateBalance(debt)).toBe(-500_000);
  });
});

describe("spendingByCategory", () => {
  test("gom nhóm chi tiêu theo từng danh mục và bỏ qua khoản thu", () => {
    const items = [
      { type: "INCOME" as const, category: "SALARY", amount: 20_000_000 },
      { type: "EXPENSE" as const, category: "FOOD", amount: 150_000 },
      { type: "EXPENSE" as const, category: "FOOD", amount: 50_000 },
      { type: "EXPENSE" as const, category: "TRANSPORT", amount: 80_000 },
    ];
    const result = spendingByCategory(items);
    expect(result).toEqual({
      FOOD: 200_000,
      TRANSPORT: 80_000,
    });
    expect(result["SALARY"]).toBeUndefined();
  });
});

// ==========================================
// TEST CÁC TÍNH NĂNG MỞ RỘNG MỚI
// ==========================================

describe("calculate503020Rule", () => {
  test("phân bổ đúng 3 nhóm Thiết yếu, Mong muốn và Tích lũy", () => {
    const expenses = [
      { category: "FOOD", amount: 4_000_000 },
      { category: "BILLS", amount: 1_000_000 },
      { category: "SHOPPING", amount: 2_500_000 },
      { category: "ENTERTAINMENT", amount: 500_000 },
    ];
    const totalIncome = 10_000_000;
    const res = calculate503020Rule(expenses, totalIncome);

    expect(res.needs.amount).toBe(5_000_000);
    expect(res.needs.percent).toBe(50);
    expect(res.wants.amount).toBe(3_000_000);
    expect(res.wants.percent).toBe(30);
    expect(res.savings.amount).toBe(2_000_000);
    expect(res.savings.percent).toBe(20);
  });

  test("xử lý trường hợp chưa có thu nhập nhưng có chi tiêu", () => {
    const expenses = [
      { category: "FOOD", amount: 500_000 },
      { category: "SHOPPING", amount: 500_000 },
    ];
    const res = calculate503020Rule(expenses, 0);
    expect(res.needs.amount).toBe(500_000);
    expect(res.wants.amount).toBe(500_000);
    expect(res.needs.percent).toBe(50);
    expect(res.wants.percent).toBe(50);
  });
});

describe("calculateStreak", () => {
  test("tính đúng streak khi có giao dịch hôm nay và các ngày trước", () => {
    const now = new Date(2026, 10, 26, 12, 0, 0); // 26/11/2026
    const dates = [
      new Date(2026, 10, 26, 8, 0, 0),
      new Date(2026, 10, 25, 14, 0, 0),
      new Date(2026, 10, 24, 19, 0, 0),
    ];
    expect(calculateStreak(dates, now)).toBe(3);
  });

  test("vẫn duy trì streak nếu hôm nay chưa ghi nhưng hôm qua có ghi", () => {
    const now = new Date(2026, 10, 26, 12, 0, 0);
    const dates = [
      new Date(2026, 10, 25, 10, 0, 0),
      new Date(2026, 10, 24, 10, 0, 0),
    ];
    expect(calculateStreak(dates, now)).toBe(2);
  });

  test("trả về 0 khi chuỗi bị gián đoạn", () => {
    const now = new Date(2026, 10, 26, 12, 0, 0);
    const dates = [
      new Date(2026, 10, 20, 10, 0, 0),
    ];
    expect(calculateStreak(dates, now)).toBe(0);
    expect(calculateStreak([], now)).toBe(0);
  });
});

describe("calculateMonthEndForecast", () => {
  test("dự báo chi tiêu và số dư an toàn", () => {
    const fixedNow = new Date(2026, 10, 15); // Ngày 15 tháng 11 (30 ngày)
    const income = 20_000_000;
    const expense = 6_000_000; // 400.000 đ/ngày -> cả tháng 12.000.000 đ
    const res = calculateMonthEndForecast(income, expense, fixedNow);

    expect(res.dailyAverageExpense).toBe(400_000);
    expect(res.projectedExpense).toBe(12_000_000);
    expect(res.projectedBalance).toBe(8_000_000);
    expect(res.status).toBe("safe");
  });

  test("cảnh báo thâm hụt khi chi tiêu vượt thu nhập", () => {
    const fixedNow = new Date(2026, 10, 10);
    const income = 10_000_000;
    const expense = 8_000_000; // 800.000 đ/ngày -> cả tháng 24.000.000 đ
    const res = calculateMonthEndForecast(income, expense, fixedNow);

    expect(res.status).toBe("deficit");
    expect(res.projectedBalance).toBeLessThan(0);
  });
});

describe("calculateWishlistPace", () => {
  test("tính số tiền cần tiết kiệm mỗi ngày theo hạn chót", () => {
    const now = new Date(2026, 10, 1, 0, 0, 0);
    const targetDate = new Date(2026, 10, 11, 0, 0, 0); // 10 ngày sau
    const cost = 5_000_000;
    const balance = 2_000_000; // Còn thiếu 3.000.000 đ

    const res = calculateWishlistPace(cost, balance, targetDate, now);
    expect(res.hasTargetDate).toBe(true);
    expect(res.daysRemaining).toBe(10);
    expect(res.neededPerDay).toBe(300_000);
    expect(res.isOverdue).toBe(false);
  });

  test("xử lý khi không có hạn chót hoặc đã quá hạn", () => {
    const resNoTarget = calculateWishlistPace(5_000_000, 1_000_000, null);
    expect(resNoTarget.hasTargetDate).toBe(false);

    const now = new Date(2026, 10, 20);
    const pastDate = new Date(2026, 10, 10);
    const resOverdue = calculateWishlistPace(5_000_000, 1_000_000, pastDate, now);
    expect(resOverdue.isOverdue).toBe(true);
    expect(resOverdue.daysRemaining).toBe(0);
  });
});

describe("calculateBudgetStatus", () => {
  test("trạng thái bình thường khi chi tiêu < 80%", () => {
    expect(calculateBudgetStatus(500_000, 1_000_000)).toEqual({
      percent: 50,
      status: "normal",
    });
  });

  test("cảnh báo khi đạt từ 80% đến 99%", () => {
    expect(calculateBudgetStatus(850_000, 1_000_000)).toEqual({
      percent: 85,
      status: "warning",
    });
  });

  test("cảnh báo vượt khi đạt 100% trở lên", () => {
    expect(calculateBudgetStatus(1_200_000, 1_000_000)).toEqual({
      percent: 120,
      status: "exceeded",
    });
  });
});

describe("sanitizeCsvField", () => {
  test("xử lý chuỗi thông thường và ký tự ngoặc kép", () => {
    expect(sanitizeCsvField("Lương tháng 11")).toBe('"Lương tháng 11"');
    expect(sanitizeCsvField('Mua "sách"')).toBe('"Mua ""sách"""');
  });

  test("ngăn chặn CSV / Formula Injection đối với ký tự nguy hiểm ở đầu (=, +, -, @, \\t, \\r)", () => {
    expect(sanitizeCsvField("=SUM(A1:A10)")).toBe("\"'=SUM(A1:A10)\"");
    expect(sanitizeCsvField("+cmd|' /C calc'!A0")).toBe("\"'+cmd|' /C calc'!A0\"");
    expect(sanitizeCsvField("-500")).toBe("\"'-500\"");
    expect(sanitizeCsvField("@danger")).toBe("\"'@danger\"");
    expect(sanitizeCsvField("\ttab_attack")).toBe("\"'\ttab_attack\"");
  });

  test("xử lý null và undefined an toàn", () => {
    expect(sanitizeCsvField(null)).toBe('""');
    expect(sanitizeCsvField(undefined)).toBe('""');
  });
});
