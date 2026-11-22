import { describe, expect, test } from "vitest";
import {
  wishlistProgress,
  crossedMilestones,
  getDateRange,
  calculateBalance,
  spendingByCategory,
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
