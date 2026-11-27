import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, inject, test } from "vitest";
import { createIsolatedUser, signInDemo } from "../../helpers/auth";
import {
  daysAgoIso,
  futureMonthsIso,
  getCurrentYearMonth,
  todayIso,
  uniqueId,
} from "../../helpers/fixtures";
import {
  assertContainsVnd,
  extractAriaExpandedButtons,
  extractTables,
  hasAriaHiddenSvg,
  hasDialogElement,
  hasForbiddenDongSymbol,
  stripTags,
} from "../../helpers/html";
import {
  fetchPageChunks,
  invokeServerAction,
} from "../../helpers/next-action";

interface ActionFormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
}

interface TransactionApiRow {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string | null;
  date: string;
}

const baseUrl = inject("e2eBaseUrl");
const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, "../../..");

function extractEntityIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/name=["']id["'][^>]*value=["']([^"']+)["']/gi)) {
    ids.add(m[1]);
  }
  for (const m of html.matchAll(/value=["']([^"']+)["'][^>]*name=["']id["']/gi)) {
    ids.add(m[1]);
  }
  for (const m of html.matchAll(/"id":"([a-zA-Z0-9_-]{10,})"/g)) {
    ids.add(m[1]);
  }
  return Array.from(ids);
}

describe("Tier 1 — Area D: Dashboard Analytics, 50/30/20, Charts & A11y", () => {
  test("D-T1-01: /dashboard monthly category breakdown excludes prior-month expenses", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "BILLS",
      amount: 10_000_000,
      date: daysAgoIso(40),
      description: "Chi phí tháng trước",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 500_000,
      date: todayIso(),
      description: "Ăn uống tháng này",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const tables = extractTables(dash.text);
    const categoryTable = tables.find((t) =>
      (t.caption ?? "").toLowerCase().includes("danh mục") ||
      t.rows.some((r) => r.join(" ").includes("Ăn uống")),
    );
    expect(categoryTable).toBeDefined();
    const flatRows = categoryTable!.rows.map((r) => r.join(" ")).join("\n");
    expect(flatRows).toContain("Ăn uống");
    expect(flatRows).toContain("500.000 đ");
    expect(flatRows).not.toContain("10.000.000 đ");
  });

  test("D-T1-02: /dashboard displays logging streak of 3 days and badge tier", async () => {
    const user = await createIsolatedUser(baseUrl);
    for (const offset of [0, 1, 2]) {
      await invokeServerAction(
        user.client,
        "/transactions",
        "createTransaction",
        {
          type: "EXPENSE",
          category: "FOOD",
          amount: 30_000,
          date: daysAgoIso(offset),
          description: `Streak ngày ${offset}`,
        },
      );
    }

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toMatch(/3\s*ngày/i);
  });

  test("D-T1-03: /dashboard Top 5 expenses lists top 5 monthly expenses descending and excludes INCOME", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 20_000_000,
      date: today,
      description: "Khoản thu lớn không vào Top 5",
    });

    const amounts = [100_000, 200_000, 300_000, 400_000, 500_000, 600_000, 700_000];
    for (const amt of amounts) {
      await invokeServerAction(
        user.client,
        "/transactions",
        "createTransaction",
        {
          type: "EXPENSE",
          category: "SHOPPING",
          amount: amt,
          date: today,
          description: `TopItem_${amt}`,
        },
      );
    }

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toContain("TopItem_700000");
    expect(text).toContain("TopItem_600000");
    expect(text).toContain("TopItem_500000");
    expect(text).toContain("TopItem_400000");
    expect(text).toContain("TopItem_300000");
    // Top 5 section should not include the 2 smallest expenses or INCOME
    const topSectionMatch = text.match(/Top 5[\s\S]{0,1200}/i);
    expect(topSectionMatch).not.toBeNull();
    expect(topSectionMatch![0]).not.toContain("TopItem_200000");
    expect(topSectionMatch![0]).not.toContain("TopItem_100000");
    expect(topSectionMatch![0]).not.toContain("Khoản thu lớn không vào Top 5");
  });

  test("D-T1-04: /dashboard renders end-of-month balance forecast with đ formatting", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 10_000_000,
      date: todayIso(),
      description: "Lương tháng",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 500_000,
      date: todayIso(),
      description: "Chi tiêu tháng",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toMatch(/dự báo|cuối tháng/i);
    expect(text).toMatch(/\d[\d.]*\sđ\/ngày/i);
    expect(hasForbiddenDongSymbol(dash.text)).toBe(false);
  });

  test("D-T1-05: /dashboard includes interactive 1-year What-If savings simulator UI", async () => {
    const user = await createIsolatedUser(baseUrl);
    const bundle = await fetchPageChunks(user.client, "/dashboard");
    const text = stripTags(bundle.html);
    expect(text).toMatch(/mô phỏng|what-if|tiết kiệm 1 năm/i);
    expect(text).toMatch(/3\s*tháng/i);
    expect(text).toMatch(/6\s*tháng/i);
    expect(text).toMatch(/12\s*tháng/i);
    expect(bundle.html).toMatch(/<input\b[^>]*type=["']number["']/i);
  });

  test("D-T1-06: /dashboard renders Financial Health Score (0-100), grade, tips, and 10% top-category cut suggestion", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 10_000_000,
      date: today,
      description: "Thu nhập tháng",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 4_000_000,
      date: today,
      description: "Ăn uống nhiều",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "TRANSPORT",
      amount: 1_000_000,
      date: today,
      description: "Di chuyển ít",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toMatch(/điểm sức khỏe|sức khỏe tài chính/i);
    expect(text).toMatch(/\b(?:100|[1-9]?\d)\s*\/\s*100\b/);
    expect(text).toMatch(/gợi ý|cắt giảm/i);
    assertContainsVnd(dash.text, 400_000);
  });

  test("D-T1-07: /dashboard 50/30/20 card classifies Needs, Wants, and Savings (INVESTMENT + retained cash)", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 10_000_000,
      date: today,
      description: "Lương",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 3_000_000,
      date: today,
      description: "Nhu cầu thiết yếu",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "SHOPPING",
      amount: 2_000_000,
      date: today,
      description: "Mua sắm mong muốn",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "INVESTMENT",
      amount: 1_000_000,
      date: today,
      description: "Đầu tư tích lũy",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toContain("50/30/20");
    assertContainsVnd(dash.text, 3_000_000);
    assertContainsVnd(dash.text, 2_000_000);
    assertContainsVnd(dash.text, 5_000_000);
    expect(text).toContain("30%");
    expect(text).toContain("20%");
    expect(text).toContain("50%");
  });

  test("D-T1-08: /dashboard renders 6-month income vs expense SVG bar chart and MoM % comparison", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 8_000_000,
      date: daysAgoIso(35),
      description: "Lương tháng trước",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 2_000_000,
      date: daysAgoIso(35),
      description: "Chi tháng trước",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 10_000_000,
      date: todayIso(),
      description: "Lương tháng này",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 3_000_000,
      date: todayIso(),
      description: "Chi tháng này",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toMatch(/6 tháng/i);
    expect(text).toMatch(/[▲▼].*%/);
    expect(hasAriaHiddenSvg(dash.text)).toBe(true);
  });

  test("D-T1-09: /dashboard charts use aria-hidden SVG, aria-expanded toggle, and sr-only semantic tables", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 450_000,
      date: todayIso(),
      description: "Ăn uống A11y",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    expect(hasAriaHiddenSvg(dash.text)).toBe(true);

    const expandedBtns = extractAriaExpandedButtons(dash.text);
    expect(expandedBtns.length).toBeGreaterThanOrEqual(1);
    expect(expandedBtns.some((b) => b.ariaExpanded === "false")).toBe(true);

    const tables = extractTables(dash.text);
    expect(tables.length).toBeGreaterThanOrEqual(1);
    const a11yTable = tables.find(
      (t) =>
        Boolean(t.caption) &&
        t.headers.some((h) => h.scope === "col") &&
        (t.rawClass ?? "").includes("sr-only"),
    );
    expect(a11yTable).toBeDefined();
  });
});

describe("Tier 1 — Area E: Category Budgets & 80%/100% Alerts", () => {
  test("E-T1-01: upsertBudget creates monthly budget and renders limit on /dashboard", async () => {
    const user = await createIsolatedUser(baseUrl);
    const month = getCurrentYearMonth();

    const res = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "upsertBudget",
      {
        category: "FOOD",
        month,
        limitAmount: 2_000_000,
      },
    );
    expect(res.result?.ok).toBe(true);

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    expect(stripTags(dash.text)).toContain("Ăn uống");
    assertContainsVnd(dash.text, 2_000_000);
  });

  test("E-T1-02: budget at 50% spent shows SAFE status and remaining 500.000 đ", async () => {
    const user = await createIsolatedUser(baseUrl);
    const month = getCurrentYearMonth();

    await invokeServerAction(user.client, "/dashboard", "upsertBudget", {
      category: "FOOD",
      month,
      limitAmount: 1_000_000,
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 500_000,
      date: todayIso(),
      description: "Ăn uống 50%",
    });

    const dash = await user.client.getText("/dashboard");
    const text = stripTags(dash.text);
    expect(text).toContain("50%");
    assertContainsVnd(dash.text, 500_000);
    expect(text).not.toMatch(/Vượt ngân sách|Sắp chạm ngưỡng/i);
  });

  test("E-T1-03: budget at 85% spent shows WARNING_80 alert on /dashboard", async () => {
    const user = await createIsolatedUser(baseUrl);
    const month = getCurrentYearMonth();

    await invokeServerAction(user.client, "/dashboard", "upsertBudget", {
      category: "FOOD",
      month,
      limitAmount: 1_000_000,
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 850_000,
      date: todayIso(),
      description: "Ăn uống 85%",
    });

    const dash = await user.client.getText("/dashboard");
    const text = stripTags(dash.text);
    expect(text).toContain("85%");
    expect(text).toMatch(/cảnh báo|sắp vượt|80%/i);
  });

  test("E-T1-04: calling upsertBudget twice for same category & month updates cleanly", async () => {
    const user = await createIsolatedUser(baseUrl);
    const month = getCurrentYearMonth();

    const first = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "upsertBudget",
      {
        category: "FOOD",
        month,
        limitAmount: 1_500_000,
      },
    );
    expect(first.result?.ok).toBe(true);

    const second = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "upsertBudget",
      {
        category: "FOOD",
        month,
        limitAmount: 3_000_000,
      },
    );
    expect(second.result?.ok).toBe(true);

    const dash = await user.client.getText("/dashboard");
    assertContainsVnd(dash.text, 3_000_000);
  });

  test("E-T1-05: /dashboard uses <dialog> confirmation and deleteBudget removes budget card", async () => {
    const user = await createIsolatedUser(baseUrl);
    const month = getCurrentYearMonth();

    await invokeServerAction(user.client, "/dashboard", "upsertBudget", {
      category: "TRANSPORT",
      month,
      limitAmount: 2_500_000,
    });

    const bundle = await fetchPageChunks(user.client, "/dashboard");
    const combinedChunks = bundle.chunks.map((c) => c.code).join("\n");
    expect(combinedChunks).not.toContain("window.confirm(");
    expect(
      hasDialogElement(bundle.html) ||
        combinedChunks.includes("<dialog") ||
        combinedChunks.includes('"dialog"') ||
        combinedChunks.includes("showModal"),
    ).toBe(true);

    const candidateIds = extractEntityIdsFromHtml(bundle.html);
    expect(candidateIds.length).toBeGreaterThan(0);

    let deleted = false;
    for (const id of candidateIds) {
      const delRes = await invokeServerAction<{ ok?: boolean }>(
        user.client,
        "/dashboard",
        "deleteBudget",
        { id },
      );
      if (delRes.result?.ok) {
        deleted = true;
        break;
      }
    }
    expect(deleted).toBe(true);

    const dashAfter = await user.client.getText("/dashboard");
    expect(stripTags(dashAfter.text)).not.toContain("2.500.000 đ");
  });
});

describe("Tier 1 — Area F: Wishlist Deadlines, Savings Plan & Milestones", () => {
  test("F-T1-01: createWishlistItem with targetDate persists and renders on /wishlist", async () => {
    const user = await createIsolatedUser(baseUrl);
    const targetDate = futureMonthsIso(6);

    const res = await invokeServerAction<ActionFormState>(
      user.client,
      "/wishlist",
      "createWishlistItem",
      {
        name: "iPad Air",
        price: 10_000_000,
        priority: "HIGH",
        targetDate,
      },
    );
    expect(res.result?.ok).toBe(true);

    const page = await user.client.getText("/wishlist");
    expect(page.status).toBe(200);
    const text = stripTags(page.text);
    expect(text).toContain("iPad Air");
    assertContainsVnd(page.text, 10_000_000);
    expect(text).toContain("Cao");
  });

  test("F-T1-02: wishlist progress displays 50% and 5.000.000 đ remaining when balance is half price", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 5_000_000,
      date: todayIso(),
      description: "Tiết kiệm",
    });
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Tai nghe Sony",
      price: 10_000_000,
      priority: "MEDIUM",
    });

    const page = await user.client.getText("/wishlist");
    expect(page.status).toBe(200);
    expect(stripTags(page.text)).toContain("50%");
    assertContainsVnd(page.text, 5_000_000);
  });

  test("F-T1-03: wishlist deadline displays monthly and daily savings suggestions", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 2_000_000,
      date: todayIso(),
      description: "Vốn ban đầu",
    });
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Màn hình 4K",
      price: 8_000_000,
      priority: "MEDIUM",
      targetDate: futureMonthsIso(3),
    });

    const page = await user.client.getText("/wishlist");
    expect(page.status).toBe(200);
    const text = stripTags(page.text);
    assertContainsVnd(page.text, 6_000_000);
    expect(text).toMatch(/đ\/tháng/i);
    expect(text).toMatch(/đ\/ngày/i);
  });

  test("F-T1-04: updateWishlistItem updates price and targetDate", async () => {
    const user = await createIsolatedUser(baseUrl);
    const uniqueName = `Laptop_${uniqueId()}`;
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: uniqueName,
      price: 8_000_000,
      priority: "LOW",
      targetDate: futureMonthsIso(2),
    });

    const page1 = await user.client.getText("/wishlist");
    const ids = extractEntityIdsFromHtml(page1.text);
    expect(ids.length).toBeGreaterThan(0);

    let updated = false;
    for (const id of ids) {
      const res = await invokeServerAction<ActionFormState>(
        user.client,
        "/wishlist",
        "updateWishlistItem",
        {
          id,
          name: uniqueName,
          price: 12_000_000,
          priority: "HIGH",
          targetDate: futureMonthsIso(5),
        },
      );
      if (res.result?.ok) {
        updated = true;
        break;
      }
    }
    expect(updated).toBe(true);

    const page2 = await user.client.getText("/wishlist");
    assertContainsVnd(page2.text, 12_000_000);
    expect(stripTags(page2.text)).toContain("Cao");
  });

  test("F-T1-05: /wishlist uses <dialog> confirmation and deleteWishlistItem removes item", async () => {
    const user = await createIsolatedUser(baseUrl);
    const uniqueName = `DeleteWish_${uniqueId()}`;
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: uniqueName,
      price: 3_000_000,
      priority: "LOW",
    });

    const bundle = await fetchPageChunks(user.client, "/wishlist");
    const combinedChunks = bundle.chunks.map((c) => c.code).join("\n");
    expect(combinedChunks).not.toContain("window.confirm(");
    expect(
      hasDialogElement(bundle.html) ||
        combinedChunks.includes("<dialog") ||
        combinedChunks.includes('"dialog"') ||
        combinedChunks.includes("showModal"),
    ).toBe(true);

    const ids = extractEntityIdsFromHtml(bundle.html);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      await invokeServerAction(
        user.client,
        "/wishlist",
        "deleteWishlistItem",
        { id },
        { signature: "formData" },
      );
    }

    const pageAfter = await user.client.getText("/wishlist");
    expect(stripTags(pageAfter.text)).not.toContain(uniqueName);
  });

  test("F-T1-06: crossing 50% milestone updates /wishlist state and client bundle enforces fp_milestone_ deduplication", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Xe đạp thể thao",
      price: 10_000_000,
      priority: "MEDIUM",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 5_000_000,
      date: todayIso(),
      description: "Đạt 50% mục tiêu",
    });

    const bundle = await fetchPageChunks(user.client, "/wishlist");
    expect(stripTags(bundle.html)).toContain("50%");
    const combinedChunks = bundle.chunks.map((c) => c.code).join("\n");
    expect(combinedChunks).toContain("fp_milestone_");
    expect(combinedChunks).toContain("Đã tiết kiệm được");
  });
});

describe("Tier 1 — Area G: Schema, Idempotent Seed, Curriculum & Docs", () => {
  test("G-T1-01: prisma/schema.prisma contains CategoryBudget, WishlistItem deadline/milestone, and User 50/30/20 fields", () => {
    const schema = fs.readFileSync(
      path.join(projectRoot, "prisma", "schema.prisma"),
      "utf8",
    );
    expect(schema).toContain("model CategoryBudget");
    expect(schema).toMatch(/@@unique\(\[userId,\s*category,\s*month\]\)/);
    expect(schema).toContain("targetDate");
    expect(schema).toContain("notifiedMilestone");
    expect(schema).toContain("ruleNeedsPct");
    expect(schema).toContain("ruleWantsPct");
    expect(schema).toContain("ruleSavingsPct");
  });

  test("G-T1-02: seeded demo account demo@phy10615.vn / Demo@123456 logs in via Better Auth", async () => {
    const demo = await signInDemo(baseUrl);
    expect(demo.user.email).toBe("demo@phy10615.vn");
    expect(demo.client.getCookies().size).toBeGreaterThan(0);
  });

  test("G-T1-03: demo account has >= 30 multi-month transactions, >= 3 wishlist items, and multi-tier sample budgets", async () => {
    const demo = await signInDemo(baseUrl);
    const txRes = await demo.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(txRes.status).toBe(200);
    expect(txRes.data.length).toBeGreaterThanOrEqual(30);

    const distinctMonths = new Set(
      txRes.data.map((r) => new Date(r.date).toISOString().slice(0, 7)),
    );
    expect(distinctMonths.size).toBeGreaterThanOrEqual(2);

    const wishlistPage = await demo.client.getText("/wishlist");
    expect(wishlistPage.status).toBe(200);
    const wishlistMatches = wishlistPage.text.match(/Tiến độ tích lũy:/g) ?? [];
    expect(wishlistMatches.length).toBeGreaterThanOrEqual(3);

    const dashPage = await demo.client.getText("/dashboard");
    expect(dashPage.status).toBe(200);
    const dashText = stripTags(dashPage.text);
    expect(dashText).toMatch(/ngân sách/i);
    expect(hasForbiddenDongSymbol(dashPage.text)).toBe(false);
  });

  test("G-T1-04: package.json, __tests__/finance.test.ts core contracts, and HTTP đ formatting remain intact", async () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.scripts.test).toBe("vitest run");
    expect(pkg.dependencies.vitest ?? pkg.devDependencies.vitest).toBeDefined();

    const financeTest = fs.readFileSync(
      path.join(projectRoot, "__tests__", "finance.test.ts"),
      "utf8",
    );
    for (const fn of [
      "wishlistProgress",
      "crossedMilestones",
      "getDateRange",
      "calculateBalance",
      "spendingByCategory",
    ]) {
      expect(financeTest).toContain(fn);
    }

    const demo = await signInDemo(baseUrl);
    const dash = await demo.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    expect(hasForbiddenDongSymbol(dash.text)).toBe(false);
    expect(stripTags(dash.text)).toMatch(/\d\s\u0111/);
  });

  test("G-T1-05: README.md and AI_LOG.md document demo credentials, fp1-fp3 features, commands, and Mức 3 log", () => {
    const readme = fs.readFileSync(path.join(projectRoot, "README.md"), "utf8");
    const aiLog = fs.readFileSync(path.join(projectRoot, "AI_LOG.md"), "utf8");

    expect(readme).toContain("demo@phy10615.vn");
    expect(readme).toContain("Demo@123456");
    expect(readme).toContain("npm test");
    expect(readme).toContain("npm run build");
    expect(readme).toMatch(/fp1/i);
    expect(readme).toMatch(/fp2/i);
    expect(readme).toMatch(/fp3/i);

    expect(aiLog).toMatch(/Mức 3|Muc 3/i);
    expect(aiLog.length).toBeGreaterThan(200);
  });
});
