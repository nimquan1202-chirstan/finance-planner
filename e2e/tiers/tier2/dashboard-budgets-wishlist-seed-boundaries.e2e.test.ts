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
  extractSvgTags,
  extractTables,
  hasAriaHiddenSvg,
  hasDialogElement,
  hasForbiddenDongSymbol,
  stripTags,
} from "../../helpers/html";
import type { HttpClient } from "../../helpers/http-client";
import {
  fetchPageChunks,
  invokeServerAction,
} from "../../helpers/next-action";

interface ActionFormState {
  ok?: boolean;
  error?: string;
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

async function resolveRuleFieldNames(client: HttpClient): Promise<{
  needs: string;
  wants: string;
  savings: string;
}> {
  const bundle = await fetchPageChunks(client, "/dashboard");
  const combined =
    bundle.html + "\n" + bundle.chunks.map((c) => c.code).join("\n");
  if (combined.includes("ruleNeedsPct")) {
    return {
      needs: "ruleNeedsPct",
      wants: "ruleWantsPct",
      savings: "ruleSavingsPct",
    };
  }
  return {
    needs: "needsPct",
    wants: "wantsPct",
    savings: "savingsPct",
  };
}

describe("Tier 2 — Area D: Dashboard Analytics & A11y Boundaries", () => {
  test("D-T2-01: 0 transactions renders /dashboard cleanly with streak 0 and no NaN/Infinity", async () => {
    const user = await createIsolatedUser(baseUrl);
    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    expect(hasForbiddenDongSymbol(dash.text)).toBe(false);

    const text = stripTags(dash.text);
    expect(text).not.toMatch(/\bNaN\b|\bInfinity\b/);
    expect(text).toMatch(/0\s*ngày/i);
  });

  test("D-T2-02: streak applies yesterday grace period and deduplicates multiple transactions on the same day", async () => {
    const user = await createIsolatedUser(baseUrl);
    const yesterday = daysAgoIso(1);
    const twoDaysAgo = daysAgoIso(2);

    for (let i = 1; i <= 3; i++) {
      await invokeServerAction(user.client, "/transactions", "createTransaction", {
        type: "EXPENSE",
        category: "FOOD",
        amount: 25_000 * i,
        date: yesterday,
        description: `Hôm qua lần ${i}`,
      });
    }
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "TRANSPORT",
      amount: 30_000,
      date: twoDaysAgo,
      description: "Hai ngày trước",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toMatch(/\b2\s*ngày\b/i);
    expect(text).not.toMatch(/chuỗi[\s\S]{0,80}\b[34]\s*ngày\b/i);
  });

  test("D-T2-03: only INCOME this month with 0 EXPENSE shows empty state in Top 5 expenses", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 15_000_000,
      date: todayIso(),
      description: "Thu nhập thuần tháng này",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    const top5Match = text.match(/Top 5[\s\S]{0,800}/i);
    expect(top5Match).not.toBeNull();
    expect(top5Match![0]).not.toContain("Thu nhập thuần tháng này");
    expect(top5Match![0]).toMatch(/Chưa có chi tiêu/i);
  });

  test("D-T2-04: negative end-of-month forecast (willBeNegative) renders deficit warning on /dashboard", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 2_000_000,
      date: todayIso(),
      description: "Thu nhập tháng",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "SHOPPING",
      amount: 3_000_000,
      date: todayIso(),
      description: "Chi tiêu vượt mức",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    expect(hasForbiddenDongSymbol(dash.text)).toBe(false);
    const text = stripTags(dash.text);
    expect(text).toMatch(/dự báo|cuối tháng/i);
    expect(text).toMatch(/-\d[\d.]*\s\u0111/);
    expect(text).toMatch(/thâm hụt|âm|cảnh báo/i);
  });

  test("D-T2-05: 1-Year What-If Simulator on /dashboard enforces >= 0 clamping and avoids NaN", async () => {
    const user = await createIsolatedUser(baseUrl);
    const bundle = await fetchPageChunks(user.client, "/dashboard");
    const text = stripTags(bundle.html);
    expect(text).not.toMatch(/\bNaN\b|\bInfinity\b/);
    expect(bundle.html).toMatch(/<input\b[^>]*type=["']number["'][^>]*min=["']?0["']?/i);

    const combinedChunks = bundle.chunks.map((c) => c.code).join("\n");
    expect(combinedChunks).toMatch(/Math\.max\(\s*0|Number\.isFinite|<=\s*0|>=\s*0/);
  });

  test("D-T2-06: zero-income user with expenses clamps Health Score to [0, 100] without NaN or Infinity", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 1_500_000,
      date: todayIso(),
      description: "Chi tiêu khi chưa có thu nhập",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).not.toMatch(/\bNaN\b|\bInfinity\b/);
    expect(text).toMatch(/\b(?:100|[1-9]?\d)\s*\/\s*100\b/);
  });

  test("D-T2-07: updateRule503020 rejects sum != 100 (50/30/30) and negative targets (-10/60/50), preserving 50/30/20", async () => {
    const user = await createIsolatedUser(baseUrl);
    const fields = await resolveRuleFieldNames(user.client);

    const badSum = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "updateRule503020",
      {
        [fields.needs]: 50,
        [fields.wants]: 30,
        [fields.savings]: 30,
      },
    );
    expect(badSum.result?.ok).not.toBe(true);
    expect(
      Boolean(badSum.result?.error) ||
        Object.keys(badSum.result?.errors ?? {}).length > 0,
    ).toBe(true);

    const badNegative = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "updateRule503020",
      {
        [fields.needs]: -10,
        [fields.wants]: 60,
        [fields.savings]: 50,
      },
    );
    expect(badNegative.result?.ok).not.toBe(true);
    expect(
      Boolean(badNegative.result?.error) ||
        Object.keys(badNegative.result?.errors ?? {}).length > 0,
    ).toBe(true);

    const dash = await user.client.getText("/dashboard");
    const text = stripTags(dash.text);
    expect(text).toContain("50%");
    expect(text).toContain("30%");
    expect(text).toContain("20%");
  });

  test("D-T2-08: zero previous-month income/expense with positive current month avoids NaN%/Infinity%", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 5_000_000,
      date: todayIso(),
      description: "Thu tháng đầu",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 1_000_000,
      date: todayIso(),
      description: "Chi tháng đầu",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).not.toMatch(/NaN\s*%?|Infinity\s*%?/i);
  });

  test("D-T2-09: /dashboard HTML a11y audit verifies aria-hidden SVG, table caption/scope=col, aria-expanded, and no U+20AB", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 4_000_000,
      date: todayIso(),
      description: "Thu A11y",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 600_000,
      date: todayIso(),
      description: "Chi A11y",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    expect(hasForbiddenDongSymbol(dash.text)).toBe(false);

    const svgs = extractSvgTags(dash.text);
    expect(svgs.length).toBeGreaterThanOrEqual(1);
    expect(hasAriaHiddenSvg(dash.text)).toBe(true);

    const expandedButtons = extractAriaExpandedButtons(dash.text);
    expect(expandedButtons.length).toBeGreaterThanOrEqual(1);

    const tables = extractTables(dash.text);
    const semanticTables = tables.filter(
      (t) =>
        Boolean(t.caption) &&
        t.headers.length > 0 &&
        t.headers.every((h) => h.scope === "col"),
    );
    expect(semanticTables.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Tier 2 — Area E: Category Budgets Boundaries", () => {
  test("E-T2-01: exact 79.9% spent (799.000 / 1.000.000) stays SAFE without 80%/100% warning", async () => {
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
      amount: 799_000,
      date: todayIso(),
      description: "Chi 79.9%",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    assertContainsVnd(dash.text, 799_000);
    assertContainsVnd(dash.text, 201_000);
    expect(text).not.toMatch(/Sắp chạm ngưỡng|Sắp vượt|Vượt ngân sách|Đã vượt/i);
  });

  test("E-T2-02: exact 80.0% spent (800.000 / 1.000.000) triggers WARNING_80 alert", async () => {
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
      amount: 800_000,
      date: todayIso(),
      description: "Chi đúng 80%",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toContain("80%");
    assertContainsVnd(dash.text, 200_000);
    expect(text).toMatch(/cảnh báo|sắp vượt|sắp chạm|80%/i);
    expect(text).not.toMatch(/Vượt ngân sách|Đã vượt/i);
  });

  test("E-T2-03: 100.0% and >100% (150%) trigger EXCEEDED_100 while progress bar width clamps <= 100%", async () => {
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
      amount: 1_000_000,
      date: todayIso(),
      description: "Chi đúng 100%",
    });

    const dash100 = await user.client.getText("/dashboard");
    expect(stripTags(dash100.text)).toContain("100%");
    expect(stripTags(dash100.text)).toMatch(/vượt/i);

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 500_000,
      date: todayIso(),
      description: "Chi thêm vượt 150%",
    });

    const dash150 = await user.client.getText("/dashboard");
    const text150 = stripTags(dash150.text);
    expect(text150).toContain("150%");
    assertContainsVnd(dash150.text, 500_000);
    expect(text150).toMatch(/vượt/i);

    for (const m of dash150.text.matchAll(/style=["'][^"']*width:\s*([0-9.]+)%/gi)) {
      expect(Number(m[1])).toBeLessThanOrEqual(100);
    }
  });

  test("E-T2-04: upsertBudget rejects limitAmount 0, -100, 1.5, and invalid month 2026-13 without DB write", async () => {
    const user = await createIsolatedUser(baseUrl);
    const month = getCurrentYearMonth();

    for (const badLimit of [0, -100, 1.5]) {
      const res = await invokeServerAction<ActionFormState>(
        user.client,
        "/dashboard",
        "upsertBudget",
        {
          category: "FOOD",
          month,
          limitAmount: badLimit,
        },
      );
      expect(res.result?.ok).not.toBe(true);
      expect(
        Boolean(res.result?.error) ||
          Object.keys(res.result?.errors ?? {}).length > 0,
      ).toBe(true);
    }

    const badMonth = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "upsertBudget",
      {
        category: "FOOD",
        month: "2026-13",
        limitAmount: 1_234_000,
      },
    );
    expect(badMonth.result?.ok).not.toBe(true);
    expect(
      Boolean(badMonth.result?.error) ||
        Object.keys(badMonth.result?.errors ?? {}).length > 0,
    ).toBe(true);

    const dash = await user.client.getText("/dashboard");
    expect(stripTags(dash.text)).not.toContain("1.234.000 đ");
  });

  test("E-T2-05: upsertBudget rejects invalid category INVALID_CAT without DB write", async () => {
    const user = await createIsolatedUser(baseUrl);
    const res = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "upsertBudget",
      {
        category: "INVALID_CAT",
        month: getCurrentYearMonth(),
        limitAmount: 2_345_000,
      },
    );
    expect(res.result?.ok).not.toBe(true);
    expect(
      Boolean(res.result?.error) ||
        Object.keys(res.result?.errors ?? {}).length > 0,
    ).toBe(true);

    const dash = await user.client.getText("/dashboard");
    expect(stripTags(dash.text)).not.toContain("2.345.000 đ");
  });

  test("E-T2-06: /dashboard budget delete uses <dialog> (no window.confirm) and invalid-id deleteBudget preserves valid budget", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/dashboard", "upsertBudget", {
      category: "FOOD",
      month: getCurrentYearMonth(),
      limitAmount: 1_800_000,
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

    const delMissing = await invokeServerAction<{ ok?: boolean; error?: string }>(
      user.client,
      "/dashboard",
      "deleteBudget",
      { id: "nonexistent_budget_id_999" },
    );
    expect(delMissing.result?.ok).toBe(false);

    const dashAfter = await user.client.getText("/dashboard");
    assertContainsVnd(dashAfter.text, 1_800_000);
  });
});

describe("Tier 2 — Area F: Wishlist Deadlines & Milestones Boundaries", () => {
  test("F-T2-01: wishlist item with null targetDate renders cleanly without overdue badge or NaN", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Tai nghe không thời hạn",
      price: 2_000_000,
      priority: "LOW",
    });

    const page = await user.client.getText("/wishlist");
    expect(page.status).toBe(200);
    const text = stripTags(page.text);
    expect(text).toContain("Tai nghe không thời hạn");
    expect(text).toContain("0%");
    expect(text).not.toMatch(/\bNaN\b|\bInfinity\b/);
    expect(text).not.toMatch(/quá hạn/i);
  });

  test("F-T2-02: overdue incomplete wishlist item (past targetDate, balance < price) displays overdue notice", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Máy ảnh quá hạn",
      price: 5_000_000,
      priority: "HIGH",
      targetDate: "2024-01-15",
    });

    const page = await user.client.getText("/wishlist");
    expect(page.status).toBe(200);
    const text = stripTags(page.text);
    expect(text).toContain("Máy ảnh quá hạn");
    expect(text).toMatch(/quá hạn/i);
  });

  test("F-T2-03: completed wishlist item (balance >= price) displays 100%, Đủ tiền, and 0 đ remaining/monthly", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 5_000_000,
      date: todayIso(),
      description: "Đủ tiền mua",
    });
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Loa Bluetooth",
      price: 3_000_000,
      priority: "MEDIUM",
      targetDate: futureMonthsIso(3),
    });

    const page = await user.client.getText("/wishlist");
    expect(page.status).toBe(200);
    const text = stripTags(page.text);
    expect(text).toContain("100%");
    expect(text).toMatch(/Đủ tiền|Hoàn thành/i);
    expect(text).toMatch(/0\s*\u0111/);
  });

  test("F-T2-04: createWishlistItem rejects price 0, -1000, empty name, and invalid targetDate without creating items", async () => {
    const user = await createIsolatedUser(baseUrl);

    const badZeroPrice = await invokeServerAction<ActionFormState>(
      user.client,
      "/wishlist",
      "createWishlistItem",
      {
        name: "BadZero",
        price: 0,
        priority: "MEDIUM",
      },
    );
    expect(badZeroPrice.result?.ok).not.toBe(true);
    expect(badZeroPrice.result?.errors?.price?.length ?? 0).toBeGreaterThan(0);

    const badNegPrice = await invokeServerAction<ActionFormState>(
      user.client,
      "/wishlist",
      "createWishlistItem",
      {
        name: "BadNeg",
        price: -1000,
        priority: "MEDIUM",
      },
    );
    expect(badNegPrice.result?.ok).not.toBe(true);
    expect(badNegPrice.result?.errors?.price?.length ?? 0).toBeGreaterThan(0);

    const badEmptyName = await invokeServerAction<ActionFormState>(
      user.client,
      "/wishlist",
      "createWishlistItem",
      {
        name: "",
        price: 1_000_000,
        priority: "MEDIUM",
      },
    );
    expect(badEmptyName.result?.ok).not.toBe(true);
    expect(badEmptyName.result?.errors?.name?.length ?? 0).toBeGreaterThan(0);

    const badTargetDate = await invokeServerAction<ActionFormState>(
      user.client,
      "/wishlist",
      "createWishlistItem",
      {
        name: "BadDateWish",
        price: 1_000_000,
        priority: "MEDIUM",
        targetDate: "not-a-date",
      },
    );
    expect(badTargetDate.result?.ok).not.toBe(true);
    expect(
      (badTargetDate.result?.errors?.targetDate?.length ?? 0) > 0 ||
        Object.keys(badTargetDate.result?.errors ?? {}).length > 0,
    ).toBe(true);

    const page = await user.client.getText("/wishlist");
    const text = stripTags(page.text);
    expect(text).not.toContain("BadZero");
    expect(text).not.toContain("BadNeg");
    expect(text).not.toContain("BadDateWish");
  });

  test("F-T2-05: negative balance (-500.000 đ) clamps wishlist progress to 0%", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 500_000,
      date: todayIso(),
      description: "Chi âm số dư",
    });
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Bàn phím cơ",
      price: 1_000_000,
      priority: "MEDIUM",
    });

    const page = await user.client.getText("/wishlist");
    expect(page.status).toBe(200);
    const text = stripTags(page.text);
    expect(text).toContain("Bàn phím cơ");
    expect(text).toContain("0%");
    expect(text).not.toContain("-50%");
  });

  test("F-T2-06: /wishlist delete uses <dialog> confirmation (no window.confirm) and invalid-id deleteWishlistItem preserves valid item", async () => {
    const user = await createIsolatedUser(baseUrl);
    const validName = `ValidWish_${uniqueId()}`;
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: validName,
      price: 1_200_000,
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

    const delMissing = await invokeServerAction<{ ok?: boolean; error?: string }>(
      user.client,
      "/wishlist",
      "deleteWishlistItem",
      { id: "nonexistent_wishlist_id_999" },
      { signature: "formData" },
    );
    expect(delMissing.result?.ok).toBe(false);

    const pageAfter = await user.client.getText("/wishlist");
    expect(stripTags(pageAfter.text)).toContain(validName);
    assertContainsVnd(pageAfter.text, 1_200_000);
  });
});

describe("Tier 2 — Area G: Seed, Schema & Docs Boundaries", () => {
  test("G-T2-01: prisma/schema.prisma preserves Transaction @@index([userId, date]) and CategoryBudget Cascade + unique", () => {
    const schema = fs.readFileSync(
      path.join(projectRoot, "prisma", "schema.prisma"),
      "utf8",
    );

    const txBlockMatch = schema.match(/model\s+Transaction\s*\{[\s\S]*?\n\}/);
    expect(txBlockMatch).not.toBeNull();
    expect(txBlockMatch![0]).toMatch(/@@index\(\[userId,\s*date\]\)/);

    const budgetBlockMatch = schema.match(/model\s+CategoryBudget\s*\{[\s\S]*?\n\}/);
    expect(budgetBlockMatch).not.toBeNull();
    expect(budgetBlockMatch![0]).toMatch(/onDelete:\s*Cascade/);
    expect(budgetBlockMatch![0]).toMatch(/@@unique\(\[userId,\s*category,\s*month\]\)/);
  });

  test("G-T2-02: prisma/seed.ts implements idempotent upsert/reset logic and demo account has no duplicate seed artifacts", async () => {
    const seedSrc = fs.readFileSync(
      path.join(projectRoot, "prisma", "seed.ts"),
      "utf8",
    );
    expect(seedSrc).toContain("demo@phy10615.vn");
    expect(seedSrc).toContain("hashPassword");
    expect(seedSrc).toMatch(/\.upsert\(|deleteMany\(/);

    const demo = await signInDemo(baseUrl);
    const txRes = await demo.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(txRes.status).toBe(200);
    expect(txRes.data.length).toBeGreaterThanOrEqual(30);

    const wishPage = await demo.client.getText("/wishlist");
    expect(wishPage.status).toBe(200);
    const wishTitles = Array.from(
      wishPage.text.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi),
      (m) => stripTags(m[1]),
    ).filter(Boolean);
    expect(wishTitles.length).toBeGreaterThanOrEqual(3);
    expect(new Set(wishTitles).size).toBe(wishTitles.length);
  });

  test("G-T2-03: package.json contains zero forbidden post-Week-10 or unapproved packages", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    const forbidden = [
      "recharts",
      `@${"playwright"}/test`,
      `@${"testing-library"}/react`,
      `@${"testing-library"}/dom`,
      "@google/genai",
      "sonner",
      `@${"types"}/${"js"}${"dom"}`,
      "lucide-react",
    ];
    for (const pkgName of forbidden) {
      expect(allDeps[pkgName]).toBeUndefined();
    }
  });

  test("G-T2-04: README.md has no stale unchecked checkboxes and documents valid npm test and npm run build commands", () => {
    const readme = fs.readFileSync(path.join(projectRoot, "README.md"), "utf8");
    expect(readme).not.toMatch(/^\s*[-*]\s*\[\s*\]/m);
    expect(readme).toContain("npm test");
    expect(readme).toContain("npm run build");
    expect(readme).toContain("demo@phy10615.vn");
  });

  test("G-T2-05: AI_LOG.md includes Mức 3 declaration, dated milestone entries, and honest self-evaluation", () => {
    const aiLog = fs.readFileSync(path.join(projectRoot, "AI_LOG.md"), "utf8");
    expect(aiLog).toMatch(/Mức 3|Muc 3/i);
    expect(aiLog).toMatch(/2026-\d{2}-\d{2}|\d{2}\/\d{2}\/2026/);
    expect(aiLog).toMatch(/tự đánh giá|đánh giá|hạn chế|kiểm chứng|bài học/i);
  });
});
