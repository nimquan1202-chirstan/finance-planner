import { describe, expect, inject, test } from "vitest";
import { createIsolatedUser } from "../../helpers/auth";
import {
  buildCsv,
  daysAgoIso,
  futureMonthsIso,
  getCurrentYearMonth,
  todayIso,
  uniqueId,
} from "../../helpers/fixtures";
import {
  assertContainsVnd,
  extractAriaExpandedButtons,
  extractExportCsvHref,
  extractTables,
  hasAriaHiddenSvg,
  hasDialogElement,
  hasForbiddenDongSymbol,
  stripTags,
} from "../../helpers/html";
import { HttpClient } from "../../helpers/http-client";
import { fetchPageChunks, invokeServerAction } from "../../helpers/next-action";

interface ActionFormState {
  ok?: boolean;
  message?: string;
  error?: string;
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

function extractEntityIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/name=["']id["'][^>]*value=["']([^"']+)["']/gi)) {
    ids.add(m[1]);
  }
  for (const m of html.matchAll(/value=["']([^"']+)["'][^>]*name=["']id["']/gi)) {
    ids.add(m[1]);
  }
  for (const m of html.matchAll(/data-id=["']([^"']+)["']/gi)) {
    ids.add(m[1]);
  }
  for (const m of html.matchAll(/"id":"([a-zA-Z0-9_-]{10,})"/g)) {
    ids.add(m[1]);
  }
  for (const m of html.matchAll(/\\"id\\":\\"([a-zA-Z0-9_-]{10,})\\"/g)) {
    ids.add(m[1]);
  }
  return Array.from(ids);
}

function parseVndNumber(raw: string): number {
  return Number(raw.replace(/\./g, "").trim());
}

function extractMonthlySuggestedAmount(text: string): number {
  const match = text.match(/([\d.]+)\s*\u0111\/tháng/i);
  if (!match) {
    throw new Error(`Expected "đ/tháng" suggestion in wishlist text, got: ${text.slice(0, 400)}`);
  }
  return parseVndNumber(match[1]);
}

describe("Tier 3 — Cross-Feature Pairwise Combinations (P-01 .. P-10)", () => {
  test("P-01: Auth Session + Dashboard/Landing Isolation across User A, User B, and anonymous visitor", async () => {
    const userA = await createIsolatedUser(baseUrl, { name: "User A Pairwise" });
    const userB = await createIsolatedUser(baseUrl, { name: "User B Pairwise" });

    const descA = `IncomeA_${uniqueId()}`;
    const descB = `IncomeB_${uniqueId()}`;
    const wishA = `WishA_${uniqueId()}`;

    await invokeServerAction<ActionFormState>(
      userA.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 10_000_000,
        date: todayIso(),
        description: descA,
      },
    );
    await invokeServerAction<ActionFormState>(
      userA.client,
      "/wishlist",
      "createWishlistItem",
      {
        name: wishA,
        price: 20_000_000,
        priority: "HIGH",
      },
    );

    await invokeServerAction<ActionFormState>(
      userB.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 2_000_000,
        date: todayIso(),
        description: descB,
      },
    );

    // Unauthenticated landing leaks neither user's data or combined total (12M)
    const anon = new HttpClient(baseUrl);
    const anonHome = await anon.getText("/");
    expect(anonHome.status).toBe(200);
    const anonText = stripTags(anonHome.text);
    expect(anonText).not.toContain("10.000.000 đ");
    expect(anonText).not.toContain("2.000.000 đ");
    expect(anonText).not.toContain("12.000.000 đ");
    expect(anonText).not.toContain(descA);
    expect(anonText).not.toContain(descB);

    for (const protectedPath of ["/dashboard", "/transactions", "/wishlist"]) {
      const res = await anon.request(protectedPath);
      expect([302, 307]).toContain(res.status);
      expect(res.headers.get("location")).toContain("/login");
    }

    // User A sees strictly 10M across landing, dashboard, transactions, wishlist
    const homeA = await userA.client.getText("/");
    expect(homeA.status).toBe(200);
    expect(stripTags(homeA.text)).not.toContain("2.000.000 đ");
    expect(stripTags(homeA.text)).not.toContain("12.000.000 đ");

    const dashA = await userA.client.getText("/dashboard");
    expect(dashA.status).toBe(200);
    assertContainsVnd(dashA.text, 10_000_000);
    expect(stripTags(dashA.text)).toContain(wishA);
    expect(stripTags(dashA.text)).not.toContain("2.000.000 đ");

    const txA = await userA.client.getText("/transactions?range=all");
    expect(txA.status).toBe(200);
    expect(stripTags(txA.text)).toContain(descA);
    expect(stripTags(txA.text)).not.toContain(descB);

    const wishPageA = await userA.client.getText("/wishlist");
    expect(wishPageA.status).toBe(200);
    expect(stripTags(wishPageA.text)).toContain(wishA);
    expect(stripTags(wishPageA.text)).toContain("50%");

    // User B sees strictly 2M across landing, dashboard, transactions, wishlist
    const homeB = await userB.client.getText("/");
    expect(homeB.status).toBe(200);
    expect(stripTags(homeB.text)).not.toContain("10.000.000 đ");
    expect(stripTags(homeB.text)).not.toContain("12.000.000 đ");

    const dashB = await userB.client.getText("/dashboard");
    expect(dashB.status).toBe(200);
    assertContainsVnd(dashB.text, 2_000_000);
    expect(stripTags(dashB.text)).not.toContain("10.000.000 đ");
    expect(stripTags(dashB.text)).not.toContain(wishA);

    const txB = await userB.client.getText("/transactions?range=all");
    expect(txB.status).toBe(200);
    expect(stripTags(txB.text)).toContain(descB);
    expect(stripTags(txB.text)).not.toContain(descA);

    const wishPageB = await userB.client.getText("/wishlist");
    expect(wishPageB.status).toBe(200);
    expect(stripTags(wishPageB.text)).not.toContain(wishA);
  });

  test("P-02: URL Filters + Formula-Safe CSV Export roundtrips only filtered neutralized row", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();

    const csvInput = buildCsv([
      {
        date: today,
        type: "EXPENSE",
        category: "FOOD",
        amount: 35_000,
        description: "=1+1",
      },
      {
        date: today,
        type: "EXPENSE",
        category: "ENTERTAINMENT",
        amount: 55_000,
        description: '"Coffee"',
      },
      {
        date: today,
        type: "INCOME",
        category: "SALARY",
        amount: 1_000_000,
        description: "=2+2",
      },
    ]);

    const fd = new FormData();
    fd.append("file", new File([csvInput], "p02.csv", { type: "text/csv" }));
    const importRes = await user.client.postRaw("/api/transactions/csv", fd);
    expect(importRes.status).toBe(200);

    const filteredPage = await user.client.getText(
      "/transactions?range=all&type=EXPENSE&category=FOOD&q=%3D",
    );
    expect(filteredPage.status).toBe(200);

    const exportHref = extractExportCsvHref(filteredPage.text);
    expect(exportHref).not.toBeNull();
    const parsedUrl = new URL(exportHref!, baseUrl);
    expect(parsedUrl.pathname).toBe("/api/transactions");
    expect(parsedUrl.searchParams.get("format")).toBe("csv");
    expect(parsedUrl.searchParams.get("range")).toBe("all");
    expect(parsedUrl.searchParams.get("type")).toBe("EXPENSE");
    expect(parsedUrl.searchParams.get("category")).toBe("FOOD");
    expect(parsedUrl.searchParams.get("q")).toBe("=");

    const csvRes = await user.client.getText(exportHref!);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("content-type")).toMatch(/text\/csv/i);
    expect(csvRes.headers.get("cache-control") ?? "").toContain("no-store");
    expect(csvRes.text.startsWith("\uFEFF")).toBe(true);

    const lines = csvRes.text.slice(1).trim().split(/\r?\n/);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("'=1+1");
    expect(csvRes.text).not.toContain("Coffee");
    expect(csvRes.text).not.toContain("=2+2");
  });

  test("P-03: Category Budget + New Transactions transitions SAFE -> WARNING_80 -> EXCEEDED_100 on /dashboard", async () => {
    const user = await createIsolatedUser(baseUrl);
    const month = getCurrentYearMonth();

    const budgetRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "upsertBudget",
      {
        category: "FOOD",
        month,
        limitAmount: 1_000_000,
      },
    );
    expect(budgetRes.result?.ok).toBe(true);

    const dashSafe = await user.client.getText("/dashboard");
    expect(dashSafe.status).toBe(200);
    const safeText = stripTags(dashSafe.text);
    expect(safeText).toContain("Ăn uống");
    assertContainsVnd(dashSafe.text, 1_000_000);
    expect(safeText).toContain("0%");
    expect(safeText).not.toMatch(/Vượt ngân sách|Sắp chạm ngưỡng/i);

    // Add 800k -> 80% WARNING_80
    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 800_000,
        date: todayIso(),
        description: "Ăn uống chạm 80%",
      },
    );

    const dashWarn = await user.client.getText("/dashboard");
    expect(dashWarn.status).toBe(200);
    const warnText = stripTags(dashWarn.text);
    expect(warnText).toContain("80%");
    assertContainsVnd(dashWarn.text, 800_000);
    expect(warnText).toMatch(/cảnh báo|sắp|80%/i);
    expect(warnText).not.toMatch(/Vượt ngân sách/i);

    // Add 250k -> 105% EXCEEDED_100
    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 250_000,
        date: todayIso(),
        description: "Ăn uống vượt 100%",
      },
    );

    const dashExceeded = await user.client.getText("/dashboard");
    expect(dashExceeded.status).toBe(200);
    const exceededText = stripTags(dashExceeded.text);
    expect(exceededText).toContain("105%");
    assertContainsVnd(dashExceeded.text, 1_050_000);
    expect(exceededText).toMatch(/vượt/i);
  });

  test("P-04: Wishlist Price Edit + Milestone Reconciliation resets and re-triggers 50% crossing", async () => {
    const user = await createIsolatedUser(baseUrl);
    const itemName = `Camera_${uniqueId()}`;

    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 5_000_000,
        date: todayIso(),
        description: "Thu nhập ban đầu",
      },
    );

    await invokeServerAction<ActionFormState>(
      user.client,
      "/wishlist",
      "createWishlistItem",
      {
        name: itemName,
        price: 6_000_000,
        priority: "HIGH",
      },
    );

    const page1 = await user.client.getText("/wishlist");
    expect(page1.status).toBe(200);
    expect(stripTags(page1.text)).toContain("83%");

    const ids = extractEntityIdsFromHtml(page1.text).filter(
      (id) => id !== user.user.id,
    );
    expect(ids.length).toBeGreaterThan(0);

    // Raise price from 6M -> 12M (5M / 12M = 41%)
    let edited = false;
    for (const id of ids) {
      const res = await invokeServerAction<ActionFormState>(
        user.client,
        "/wishlist",
        "updateWishlistItem",
        {
          id,
          name: itemName,
          price: 12_000_000,
          priority: "HIGH",
        },
      );
      if (res.result?.ok) {
        edited = true;
        break;
      }
    }
    expect(edited).toBe(true);

    const page2 = await user.client.getText("/wishlist");
    expect(page2.status).toBe(200);
    assertContainsVnd(page2.text, 12_000_000);
    expect(stripTags(page2.text)).toContain("41%");
    if (page2.text.includes("notifiedMilestone")) {
      expect(page2.text).toMatch(/\\?"notifiedMilestone\\?":0/);
    }

    // Add 1.5M income -> balance 6.5M / 12M = 54% (re-crosses 50% milestone)
    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 1_500_000,
        date: todayIso(),
        description: "Thu nhập bổ sung",
      },
    );

    const bundle3 = await fetchPageChunks(user.client, "/wishlist");
    const text3 = stripTags(bundle3.html);
    expect(text3).toContain("54%");
    assertContainsVnd(bundle3.html, 5_500_000);
    const combinedChunks = bundle3.chunks.map((c) => c.code).join("\n");
    expect(combinedChunks).toContain("fp_milestone_");
    expect(combinedChunks).toContain("Đã tiết kiệm được");
  });

  test("P-05: CSV Import of 4-day streak (1 income + 6 expenses) updates streak, Top 5, forecast, and Health Score", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();

    const csvBody = buildCsv([
      {
        date: daysAgoIso(3),
        type: "INCOME",
        category: "SALARY",
        amount: 12_000_000,
        description: "Lương CSV P05",
      },
      {
        date: daysAgoIso(2),
        type: "EXPENSE",
        category: "OTHER",
        amount: 50_000,
        description: "Chi nhỏ nhất CSV P05",
      },
      {
        date: daysAgoIso(1),
        type: "EXPENSE",
        category: "FOOD",
        amount: 200_000,
        description: "Top5_CSV_200k",
      },
      {
        date: today,
        type: "EXPENSE",
        category: "FOOD",
        amount: 300_000,
        description: "Top5_CSV_300k",
      },
      {
        date: today,
        type: "EXPENSE",
        category: "TRANSPORT",
        amount: 400_000,
        description: "Top5_CSV_400k",
      },
      {
        date: today,
        type: "EXPENSE",
        category: "SHOPPING",
        amount: 500_000,
        description: "Top5_CSV_500k",
      },
      {
        date: today,
        type: "EXPENSE",
        category: "BILLS",
        amount: 600_000,
        description: "Top5_CSV_600k",
      },
    ]);

    const fd = new FormData();
    fd.append("file", new File([csvBody], "p05-streak.csv", { type: "text/csv" }));
    const importRes = await user.client.postRaw("/api/transactions/csv", fd);
    expect(importRes.status).toBe(200);
    const importJson = (await importRes.json()) as {
      importedCount: number;
      skippedCount: number;
      errors: unknown[];
    };
    expect(importJson).toEqual({
      importedCount: 7,
      skippedCount: 0,
      errors: [],
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);

    // 4-day logging streak
    expect(text).toMatch(/4\s*ngày/i);

    // Top 5 largest expenses
    const topMatch = text.match(/Top 5[\s\S]{0,1400}/i);
    expect(topMatch).not.toBeNull();
    expect(topMatch![0]).toContain("Top5_CSV_600k");
    expect(topMatch![0]).toContain("Top5_CSV_500k");
    expect(topMatch![0]).toContain("Top5_CSV_400k");
    expect(topMatch![0]).toContain("Top5_CSV_300k");
    expect(topMatch![0]).toContain("Top5_CSV_200k");
    expect(topMatch![0]).not.toContain("Chi nhỏ nhất CSV P05");
    expect(topMatch![0]).not.toContain("Lương CSV P05");

    // EOM forecast & Financial Health Score
    expect(text).toMatch(/dự báo|cuối tháng/i);
    expect(text).toMatch(/\d[\d.]*\sđ\/ngày/i);
    expect(text).toMatch(/điểm sức khỏe|sức khỏe tài chính/i);
    expect(text).toMatch(/\b(?:100|[1-9]?\d)\s*\/\s*100\b/);
    expect(hasForbiddenDongSymbol(dash.text)).toBe(false);
  });

  test("P-06: Transaction Delete updates /dashboard category breakdown, Top 5, 6-month bar, and forecast", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();
    const largeDesc = `BigExpenseDelete_${uniqueId()}`;
    const smallDesc = `SmallExpenseKeep_${uniqueId()}`;

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 10_000_000,
      date: today,
      description: "Lương tháng P06",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 200_000,
      date: today,
      description: smallDesc,
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "SHOPPING",
      amount: 4_000_000,
      date: today,
      description: largeDesc,
    });

    const dashBefore = await user.client.getText("/dashboard");
    expect(dashBefore.status).toBe(200);
    assertContainsVnd(dashBefore.text, 5_800_000);
    assertContainsVnd(dashBefore.text, 4_200_000);
    expect(stripTags(dashBefore.text)).toContain(largeDesc);
    const tablesBefore = extractTables(dashBefore.text);
    const catTableBefore = tablesBefore.find((t) =>
      t.rows.some((r) => r.join(" ").includes("Mua sắm")),
    );
    expect(catTableBefore).toBeDefined();
    expect(catTableBefore!.rows.map((r) => r.join(" ")).join("\n")).toContain(
      "4.000.000 đ",
    );

    const txList = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    const target = txList.data.find((r) => r.description === largeDesc);
    expect(target).toBeDefined();

    await invokeServerAction(
      user.client,
      "/transactions",
      "deleteTransaction",
      { id: target!.id },
      { signature: "formData" },
    );

    const dashAfter = await user.client.getText("/dashboard");
    expect(dashAfter.status).toBe(200);
    const textAfter = stripTags(dashAfter.text);
    assertContainsVnd(dashAfter.text, 9_800_000);
    expect(textAfter).not.toContain(largeDesc);
    expect(textAfter).toContain(smallDesc);
    expect(textAfter).not.toContain("4.200.000 đ");
    expect(textAfter).not.toContain("4.000.000 đ");

    const tablesAfter = extractTables(dashAfter.text);
    const catTableAfter = tablesAfter.find((t) =>
      t.rows.some((r) => r.join(" ").includes("Ăn uống")),
    );
    expect(catTableAfter).toBeDefined();
    const catTextAfter = catTableAfter!.rows.map((r) => r.join(" ")).join("\n");
    expect(catTextAfter).toContain("200.000 đ");
    expect(catTextAfter).not.toContain("Mua sắm");
  });

  test("P-07: 50/30/20 Rule combines INVESTMENT expense and retained cash into Savings (50%)", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 10_000_000,
      date: today,
      description: "Lương 10M",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 3_000_000,
      date: today,
      description: "Ăn uống 3M",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "SHOPPING",
      amount: 2_000_000,
      date: today,
      description: "Mua sắm 2M",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "INVESTMENT",
      amount: 1_000_000,
      date: today,
      description: "Đầu tư 1M",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toContain("50/30/20");
    assertContainsVnd(dash.text, 4_000_000); // retained cash balance
    assertContainsVnd(dash.text, 3_000_000); // Needs
    assertContainsVnd(dash.text, 2_000_000); // Wants
    assertContainsVnd(dash.text, 5_000_000); // Savings = 1M INVESTMENT + 4M retained cash
    expect(text).toContain("30%");
    expect(text).toContain("20%");
    expect(text).toContain("50%");
  });

  test("P-08: Custom 50/30/20 Targets (60/20/20) persist via updateRule503020 and update /dashboard", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 10_000_000,
      date: today,
      description: "Thu nhập P08",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 5_500_000,
      date: today,
      description: "Thiết yếu 55%",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "SHOPPING",
      amount: 2_000_000,
      date: today,
      description: "Mong muốn 20%",
    });

    const updateRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "updateRule503020",
      {
        needsPct: 60,
        wantsPct: 20,
        savingsPct: 20,
      },
    );
    expect(updateRes.result?.ok).toBe(true);

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const text = stripTags(dash.text);
    expect(text).toContain("60%");
    expect(text).toContain("20%");
    expect(text).toContain("55%");
    expect(text).toContain("25%");

    // Invalid sum (60/30/20) must be rejected and preserve 60/20/20
    const badRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/dashboard",
      "updateRule503020",
      {
        needsPct: 60,
        wantsPct: 30,
        savingsPct: 20,
      },
    );
    expect(badRes.result?.ok).not.toBe(true);
  });

  test("P-09: Wishlist targetDate + New Income Transaction halves monthly suggested and updates progress 20% -> 60%", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 1_000_000,
      date: today,
      description: "Vốn ban đầu 1M",
    });
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Xe máy điện P09",
      price: 5_000_000,
      priority: "HIGH",
      targetDate: futureMonthsIso(4),
    });

    const pageBefore = await user.client.getText("/wishlist");
    expect(pageBefore.status).toBe(200);
    const textBefore = stripTags(pageBefore.text);
    expect(textBefore).toContain("20%");
    assertContainsVnd(pageBefore.text, 4_000_000);
    const monthlyBefore = extractMonthlySuggestedAmount(textBefore);
    expect(monthlyBefore).toBeGreaterThan(0);

    // Add 2M income -> balance 3M / 5M = 60%, remaining drops 4M -> 2M
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 2_000_000,
      date: today,
      description: "Thưởng 2M",
    });

    const pageAfter = await user.client.getText("/wishlist");
    expect(pageAfter.status).toBe(200);
    const textAfter = stripTags(pageAfter.text);
    expect(textAfter).toContain("60%");
    assertContainsVnd(pageAfter.text, 2_000_000);
    const monthlyAfter = extractMonthlySuggestedAmount(textAfter);
    expect(monthlyAfter).toBeGreaterThan(0);
    expect(Math.abs(monthlyAfter - monthlyBefore / 2)).toBeLessThanOrEqual(1);
    expect(textAfter).toMatch(/đ\/ngày/i);
  });

  test("P-10: Accessible <dialog> modals and A11y Chart <table> across /dashboard, /transactions, /wishlist", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 5_000_000,
      date: today,
      description: "Thu nhập A11y",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 300_000,
      date: today,
      description: "Chi tiêu A11y",
    });
    await invokeServerAction(user.client, "/dashboard", "upsertBudget", {
      category: "FOOD",
      month: getCurrentYearMonth(),
      limitAmount: 1_000_000,
    });
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Mục tiêu A11y",
      price: 2_000_000,
      priority: "MEDIUM",
    });

    const dashBundle = await fetchPageChunks(user.client, "/dashboard");
    expect(hasForbiddenDongSymbol(dashBundle.html)).toBe(false);
    expect(hasAriaHiddenSvg(dashBundle.html)).toBe(true);

    const expandedBtns = extractAriaExpandedButtons(dashBundle.html);
    expect(expandedBtns.length).toBeGreaterThanOrEqual(1);
    expect(expandedBtns.some((b) => b.ariaExpanded === "false")).toBe(true);

    const tables = extractTables(dashBundle.html);
    expect(tables.length).toBeGreaterThanOrEqual(1);
    expect(
      tables.some((t) => Boolean(t.caption) && t.headers.some((h) => h.scope === "col")),
    ).toBe(true);

    for (const path of ["/dashboard", "/transactions", "/wishlist"]) {
      const bundle = await fetchPageChunks(user.client, path);
      expect(hasForbiddenDongSymbol(bundle.html)).toBe(false);
      const allCode = bundle.chunks.map((c) => c.code).join("\n");
      expect(allCode).not.toContain("window.confirm(");
      expect(allCode).not.toMatch(/confirm\s*\(\s*["']Bạn có chắc/);
      expect(
        hasDialogElement(bundle.html) ||
          allCode.includes("<dialog") ||
          allCode.includes('"dialog"') ||
          allCode.includes("showModal"),
      ).toBe(true);
    }
  });
});
