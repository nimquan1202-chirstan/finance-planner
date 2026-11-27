import { describe, expect, inject, test } from "vitest";
import { createIsolatedUser, signInDemo } from "../../helpers/auth";
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
  formatExpectedVnd,
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

describe("Tier 4 — Real-World Application Scenarios (S-01 .. S-06)", () => {
  test("S-01: Student Monthly Onboarding, Streak & Financial Health Check with demo account cleanup", async () => {
    const demo = await signInDemo(baseUrl);

    const dashBefore = await demo.client.getText("/dashboard");
    expect(dashBefore.status).toBe(200);
    expect(hasForbiddenDongSymbol(dashBefore.text)).toBe(false);
    const beforeText = stripTags(dashBefore.text);
    expect(beforeText).toMatch(/\d\s\u0111/);
    expect(beforeText).toMatch(/\d+\s*ngày/i);
    expect(beforeText).toMatch(/Top 5/i);
    expect(beforeText).toContain("50/30/20");
    expect(beforeText).toMatch(/\b(?:100|[1-9]?\d)\s*\/\s*100\b/);
    expect(beforeText).toMatch(/6 tháng/i);
    expect(hasAriaHiddenSvg(dashBefore.text)).toBe(true);
    expect(beforeText).toMatch(/mô phỏng|what-if|tiết kiệm 1 năm/i);
    expect(beforeText).toMatch(/3\s*tháng/i);
    expect(beforeText).toMatch(/6\s*tháng/i);
    expect(beforeText).toMatch(/12\s*tháng/i);
    expect(dashBefore.text).toMatch(/<input\b[^>]*type=["']number["']/i);

    const beforeMonthTx = await demo.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=this-month",
    );
    expect(beforeMonthTx.status).toBe(200);
    const beforeFoodTotal = beforeMonthTx.data
      .filter((t) => t.type === "EXPENSE" && t.category === "FOOD")
      .reduce((sum, t) => sum + t.amount, 0);

    const markerDesc = `Cơm sinh viên S01_${uniqueId()}`;
    let createdTxId: string | undefined;

    try {
      const createRes = await invokeServerAction<ActionFormState>(
        demo.client,
        "/transactions",
        "createTransaction",
        {
          type: "EXPENSE",
          category: "FOOD",
          amount: 50_000,
          date: todayIso(),
          description: markerDesc,
        },
      );
      expect(createRes.result?.ok).toBe(true);

      const afterMonthTx = await demo.client.getJson<TransactionApiRow[]>(
        "/api/transactions?range=this-month",
      );
      expect(afterMonthTx.status).toBe(200);
      const created = afterMonthTx.data.find((r) => r.description === markerDesc);
      expect(created).toBeDefined();
      createdTxId = created!.id;

      const txPage = await demo.client.getText("/transactions?range=this-month");
      expect(txPage.status).toBe(200);
      expect(stripTags(txPage.text)).toContain(markerDesc);
      assertContainsVnd(txPage.text, -50_000);

      const dashAfter = await demo.client.getText("/dashboard");
      expect(dashAfter.status).toBe(200);
      const afterText = stripTags(dashAfter.text);
      expect(afterText).toMatch(/[1-9]\d*\s*ngày/i);
      expect(afterText).toMatch(/\d[\d.]*\sđ\/ngày/i);

      const tablesAfter = extractTables(dashAfter.text);
      const catTable = tablesAfter.find((t) =>
        t.rows.some((r) => r.join(" ").includes("Ăn uống")),
      );
      expect(catTable).toBeDefined();
      const foodRow = catTable!.rows.find((r) => r.join(" ").includes("Ăn uống"));
      expect(foodRow).toBeDefined();
      expect(foodRow!.join(" ")).toContain(
        formatExpectedVnd(beforeFoodTotal + 50_000),
      );
    } finally {
      if (createdTxId) {
        await invokeServerAction(
          demo.client,
          "/transactions",
          "deleteTransaction",
          { id: createdTxId },
          { signature: "formData" },
        );
        const verifyClean = await demo.client.getJson<TransactionApiRow[]>(
          "/api/transactions?range=all",
        );
        expect(verifyClean.data.find((r) => r.id === createdTxId)).toBeUndefined();
      }
    }
  });

  test("S-02: Budget Alert Escalation (SAFE -> WARNING_80 -> EXCEEDED_100) and Recovery via Transaction Delete", async () => {
    const user = await createIsolatedUser(baseUrl, { name: "Budget Lifecycle User" });
    const today = todayIso();
    const month = getCurrentYearMonth();

    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 10_000_000,
        date: today,
        description: "Lương tháng S02",
      },
    );

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

    // 50% -> SAFE
    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 500_000,
        date: today,
        description: "Bữa ăn S02 SAFE",
      },
    );
    const dashSafe = await user.client.getText("/dashboard");
    expect(stripTags(dashSafe.text)).toContain("50%");
    assertContainsVnd(dashSafe.text, 500_000);
    expect(stripTags(dashSafe.text)).not.toMatch(
      /Vượt ngân sách|Sắp chạm ngưỡng/i,
    );

    // +300k = 80% -> WARNING_80
    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 300_000,
        date: today,
        description: "Bữa ăn S02 WARNING",
      },
    );
    const dashWarn = await user.client.getText("/dashboard");
    expect(stripTags(dashWarn.text)).toContain("80%");
    expect(stripTags(dashWarn.text)).toMatch(/cảnh báo|sắp|80%/i);
    expect(stripTags(dashWarn.text)).not.toMatch(/Vượt ngân sách/i);

    // +300k = 110% -> EXCEEDED_100
    const thirdDesc = `Bữa ăn S02 EXCEED_${uniqueId()}`;
    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 300_000,
        date: today,
        description: thirdDesc,
      },
    );
    const dashExceeded = await user.client.getText("/dashboard");
    expect(stripTags(dashExceeded.text)).toContain("110%");
    expect(stripTags(dashExceeded.text)).toMatch(/vượt/i);

    // Verify <dialog> delete UI on /transactions and delete the 3rd transaction
    const txBundle = await fetchPageChunks(user.client, "/transactions");
    const txChunks = txBundle.chunks.map((c) => c.code).join("\n");
    expect(txChunks).not.toContain("window.confirm(");
    expect(
      hasDialogElement(txBundle.html) ||
        txChunks.includes("<dialog") ||
        txChunks.includes("showModal"),
    ).toBe(true);

    const txRows = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    const thirdTx = txRows.data.find((r) => r.description === thirdDesc);
    expect(thirdTx).toBeDefined();

    await invokeServerAction(
      user.client,
      "/transactions",
      "deleteTransaction",
      { id: thirdTx!.id },
      { signature: "formData" },
    );

    // Recovers back to 80% WARNING_80
    const dashRecovered = await user.client.getText("/dashboard");
    const recoveredText = stripTags(dashRecovered.text);
    expect(recoveredText).toContain("80%");
    assertContainsVnd(dashRecovered.text, 200_000);
    expect(recoveredText).not.toContain("110%");
    expect(recoveredText).not.toMatch(/Vượt ngân sách/i);
  });

  test("S-03: Wishlist Deadline Planning, Milestone Crossings & Price Revision", async () => {
    const user = await createIsolatedUser(baseUrl, { name: "Wishlist Planner" });
    const today = todayIso();
    const targetDate = futureMonthsIso(3);
    const wishName = `Laptop_${uniqueId()}`;

    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 1_000_000,
        date: today,
        description: "Tiết kiệm khởi điểm",
      },
    );

    const createWish = await invokeServerAction<ActionFormState>(
      user.client,
      "/wishlist",
      "createWishlistItem",
      {
        name: wishName,
        price: 4_000_000,
        priority: "HIGH",
        targetDate,
      },
    );
    expect(createWish.result?.ok).toBe(true);

    const page1 = await user.client.getText("/wishlist");
    expect(page1.status).toBe(200);
    const text1 = stripTags(page1.text);
    expect(text1).toContain(wishName);
    expect(text1).toContain("25%");
    assertContainsVnd(page1.text, 3_000_000);
    expect(text1).toMatch(/đ\/tháng/i);
    expect(text1).toMatch(/đ\/ngày/i);

    // Add 2M income -> balance 3M / 4M = 75% (crosses 50% & 75%)
    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 2_000_000,
        date: today,
        description: "Thu nhập chạm 75%",
      },
    );

    const bundle2 = await fetchPageChunks(user.client, "/wishlist");
    expect(stripTags(bundle2.html)).toContain("75%");
    assertContainsVnd(bundle2.html, 1_000_000);
    const combinedChunks = bundle2.chunks.map((c) => c.code).join("\n");
    expect(combinedChunks).toContain("fp_milestone_");
    expect(combinedChunks).toContain("Đã tiết kiệm được");

    // Raise price from 4M -> 8M (3M / 8M = 37%, reconciles notifiedMilestone down)
    const ids = extractEntityIdsFromHtml(bundle2.html).filter(
      (id) => id !== user.user.id,
    );
    expect(ids.length).toBeGreaterThan(0);

    let updated = false;
    for (const id of ids) {
      const res = await invokeServerAction<ActionFormState>(
        user.client,
        "/wishlist",
        "updateWishlistItem",
        {
          id,
          name: wishName,
          price: 8_000_000,
          priority: "HIGH",
          targetDate,
        },
      );
      if (res.result?.ok) {
        updated = true;
        break;
      }
    }
    expect(updated).toBe(true);

    const page3 = await user.client.getText("/wishlist");
    expect(page3.status).toBe(200);
    expect(stripTags(page3.text)).toContain("37%");
    assertContainsVnd(page3.text, 8_000_000);
    assertContainsVnd(page3.text, 5_000_000);
    if (page3.text.includes("notifiedMilestone")) {
      expect(page3.text).toMatch(/\\?"notifiedMilestone\\?":0/);
    }

    // Add 1.5M income -> balance 4.5M / 8M = 56% (re-crosses 50%)
    await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 1_500_000,
        date: today,
        description: "Thu nhập vượt lại 50%",
      },
    );

    const page4 = await user.client.getText("/wishlist");
    expect(page4.status).toBe(200);
    expect(stripTags(page4.text)).toContain("56%");
    assertContainsVnd(page4.text, 3_500_000);
  });

  test("S-04: Filtered CSV Export, Formula-Injection Defense & Mixed-Row Re-Import Roundtrip", async () => {
    const user = await createIsolatedUser(baseUrl, { name: "CSV Roundtrip User" });
    const today = todayIso();

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 10_000_000,
      date: daysAgoIso(5),
      description: "Lương tháng S04",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 40_000,
      date: daysAgoIso(2),
      description: "=SUM(A1)",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 60_000,
      date: daysAgoIso(1),
      description: "-2+3",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "ENTERTAINMENT",
      amount: 80_000,
      date: today,
      description: "Quoted, Coffee",
    });

    const filteredPage = await user.client.getText(
      "/transactions?range=all&type=EXPENSE&sort=asc",
    );
    expect(filteredPage.status).toBe(200);

    const exportHref = extractExportCsvHref(filteredPage.text);
    expect(exportHref).not.toBeNull();
    const exportUrl = new URL(exportHref!, baseUrl);
    expect(exportUrl.searchParams.get("format")).toBe("csv");
    expect(exportUrl.searchParams.get("range")).toBe("all");
    expect(exportUrl.searchParams.get("type")).toBe("EXPENSE");
    expect(exportUrl.searchParams.get("sort")).toBe("asc");

    const csvRes = await user.client.getText(exportHref!);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("cache-control") ?? "").toContain("no-store");
    expect(csvRes.text.startsWith("\uFEFF")).toBe(true);
    expect(csvRes.text).toContain("'=SUM(A1)");
    expect(csvRes.text).toContain("'-2+3");
    expect(csvRes.text).toContain('"Quoted, Coffee"');
    expect(csvRes.text).not.toContain("Lương tháng S04");

    const exportedLines = csvRes.text.slice(1).trim().split(/\r?\n/);
    expect(exportedLines).toHaveLength(4);
    expect(exportedLines[1]).toContain("'=SUM(A1)");
    expect(exportedLines[2]).toContain("'-2+3");
    expect(exportedLines[3]).toContain('"Quoted, Coffee"');

    // Mixed CSV import: 3 valid rows (completing 4-day streak with daysAgo(2)) + 2 invalid rows
    const mixedCsv = buildCsv([
      {
        date: daysAgoIso(3),
        type: "EXPENSE",
        category: "FOOD",
        amount: 90_000,
        description: "Import hợp lệ ngày -3",
      },
      {
        date: today,
        type: "EXPENSE",
        category: "FOOD",
        amount: -500,
        description: "Dòng lỗi âm",
      },
      {
        date: daysAgoIso(1),
        type: "EXPENSE",
        category: "TRANSPORT",
        amount: 120_000,
        description: "Import hợp lệ ngày -1",
      },
      {
        date: "not-a-date",
        type: "EXPENSE",
        category: "FOOD",
        amount: 25_000,
        description: "Dòng lỗi ngày",
      },
      {
        date: today,
        type: "EXPENSE",
        category: "BILLS",
        amount: 5_000_000,
        description: "Tiền thuê trọ S04",
      },
    ]);

    const fd = new FormData();
    fd.append("file", new File([mixedCsv], "mixed-s04.csv", { type: "text/csv" }));
    const importRes = await user.client.postRaw("/api/transactions/csv", fd);
    expect(importRes.status).toBe(200);
    const importJson = (await importRes.json()) as {
      importedCount: number;
      skippedCount: number;
      errors: Array<{ row?: number; line?: number; message?: string } | string>;
    };
    expect(importJson.importedCount).toBe(3);
    expect(importJson.skippedCount).toBe(2);
    expect(importJson.errors).toHaveLength(2);

    const allRows = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(allRows.status).toBe(200);
    expect(allRows.data).toHaveLength(7);
    expect(allRows.data.find((r) => r.description === "Dòng lỗi âm")).toBeUndefined();
    expect(allRows.data.find((r) => r.description === "Dòng lỗi ngày")).toBeUndefined();

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    const dashText = stripTags(dash.text);
    expect(dashText).toMatch(/4\s*ngày/i);
    expect(dashText).toContain("Tiền thuê trọ S04");
    expect(dashText).toMatch(/\d[\d.]*\sđ\/ngày/i);
  });

  test("S-05: Multi-User Isolation & Adversarial Cross-User IDOR Defense across all entities", async () => {
    const userA = await createIsolatedUser(baseUrl, { name: "Victim User A" });
    const userB = await createIsolatedUser(baseUrl, { name: "Attacker User B" });
    const today = todayIso();

    const secretInc = `SecretIncomeA_${uniqueId()}`;
    const secretExp = `SecretExpenseA_${uniqueId()}`;
    const secretWish = `SecretWishA_${uniqueId()}`;

    await invokeServerAction(userA.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 8_000_000,
      date: today,
      description: secretInc,
    });
    await invokeServerAction(userA.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 1_500_000,
      date: today,
      description: secretExp,
    });
    await invokeServerAction(userA.client, "/dashboard", "upsertBudget", {
      category: "FOOD",
      month: getCurrentYearMonth(),
      limitAmount: 2_000_000,
    });
    await invokeServerAction(userA.client, "/wishlist", "createWishlistItem", {
      name: secretWish,
      price: 10_000_000,
      priority: "HIGH",
    });

    // 1. Unauthenticated checks
    const anon = new HttpClient(baseUrl);
    const anonHome = await anon.getText("/");
    expect(anonHome.status).toBe(200);
    const anonHomeText = stripTags(anonHome.text);
    expect(anonHomeText).not.toContain(secretInc);
    expect(anonHomeText).not.toContain(secretExp);
    expect(anonHomeText).not.toContain("8.000.000 đ");

    for (const protectedRoute of ["/dashboard", "/transactions", "/wishlist"]) {
      const r = await anon.request(protectedRoute);
      expect([302, 307]).toContain(r.status);
      expect(r.headers.get("location")).toContain("/login");
    }

    for (const apiPath of [
      "/api/transactions",
      "/api/transactions?format=csv",
    ]) {
      const res = await anon.getJson<{ error?: string }>(apiPath);
      expect(res.status).toBe(401);
      expect(res.data?.error).toBeTruthy();
    }
    const anonPostCsv = await anon.postRaw(
      "/api/transactions/csv",
      new FormData(),
    );
    expect(anonPostCsv.status).toBe(401);

    // 2. User B sees zero of User A's records
    const bTxJson = await userB.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(bTxJson.status).toBe(200);
    expect(bTxJson.data).toEqual([]);

    const bCsv = await userB.client.getText("/api/transactions?format=csv&range=all");
    expect(bCsv.status).toBe(200);
    expect(bCsv.text).not.toContain(secretInc);
    expect(bCsv.text).not.toContain(secretExp);

    for (const path of ["/dashboard", "/transactions?range=all", "/wishlist"]) {
      const pageB = await userB.client.getText(path);
      expect(pageB.status).toBe(200);
      const textB = stripTags(pageB.text);
      expect(textB).not.toContain(secretInc);
      expect(textB).not.toContain(secretExp);
      expect(textB).not.toContain(secretWish);
      expect(textB).not.toContain("2.000.000 đ");
    }

    // 3. Adversarial IDOR attacks by User B on User A's IDs
    const aTxJson = await userA.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(aTxJson.data).toHaveLength(2);
    const aTxIds = new Set(aTxJson.data.map((r) => r.id));

    for (const txId of aTxIds) {
      const updRes = await invokeServerAction<ActionFormState>(
        userB.client,
        "/transactions",
        "updateTransaction",
        {
          id: txId,
          type: "EXPENSE",
          category: "OTHER",
          amount: 1,
          date: today,
          description: "IDOR Hijacked",
        },
      );
      expect(updRes.result?.ok).toBe(false);

      const delRes = await invokeServerAction<{ ok?: boolean }>(
        userB.client,
        "/transactions",
        "deleteTransaction",
        { id: txId },
        { signature: "formData" },
      );
      expect(delRes.result?.ok).toBe(false);
    }

    const aDash = await userA.client.getText("/dashboard");
    const aWish = await userA.client.getText("/wishlist");

    const candidateBudgetIds = extractEntityIdsFromHtml(aDash.text).filter(
      (id) => id !== userA.user.id && !aTxIds.has(id),
    );
    expect(candidateBudgetIds.length).toBeGreaterThan(0);

    for (const budgetId of candidateBudgetIds) {
      const delBudgetRes = await invokeServerAction<{ ok?: boolean }>(
        userB.client,
        "/dashboard",
        "deleteBudget",
        { id: budgetId },
      );
      expect(delBudgetRes.result?.ok).toBe(false);
    }

    const candidateWishIds = extractEntityIdsFromHtml(aWish.text).filter(
      (id) => id !== userA.user.id && !aTxIds.has(id),
    );
    expect(candidateWishIds.length).toBeGreaterThan(0);

    for (const wishId of candidateWishIds) {
      const updWishRes = await invokeServerAction<ActionFormState>(
        userB.client,
        "/wishlist",
        "updateWishlistItem",
        {
          id: wishId,
          name: "IDOR Wish Hijacked",
          price: 1,
          priority: "LOW",
        },
      );
      expect(updWishRes.result?.ok).toBe(false);

      const delWishRes = await invokeServerAction<{ ok?: boolean }>(
        userB.client,
        "/wishlist",
        "deleteWishlistItem",
        { id: wishId },
        { signature: "formData" },
      );
      expect(delWishRes.result?.ok).toBe(false);
    }

    // 4. Confirm User A's records remain 100% intact
    const aTxAfter = await userA.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(aTxAfter.data).toHaveLength(2);
    expect(aTxAfter.data.find((r) => r.description === secretInc)?.amount).toBe(
      8_000_000,
    );
    expect(aTxAfter.data.find((r) => r.description === secretExp)?.amount).toBe(
      1_500_000,
    );

    const aDashAfter = await userA.client.getText("/dashboard");
    assertContainsVnd(aDashAfter.text, 6_500_000);
    assertContainsVnd(aDashAfter.text, 2_000_000);

    const aWishAfter = await userA.client.getText("/wishlist");
    expect(stripTags(aWishAfter.text)).toContain(secretWish);
    assertContainsVnd(aWishAfter.text, 10_000_000);
  });

  test("S-06: Accessible Semantic UI & đ (U+0111) Formatting Audit across /, /login, /dashboard, /transactions, /wishlist", async () => {
    const anon = new HttpClient(baseUrl);
    const loginBundle = await fetchPageChunks(anon, "/login");
    expect(hasForbiddenDongSymbol(loginBundle.html)).toBe(false);
    const loginChunks = loginBundle.chunks.map((c) => c.code).join("\n");
    expect(loginChunks).toContain("alert");

    const homePage = await anon.getText("/");
    expect(homePage.status).toBe(200);
    expect(hasForbiddenDongSymbol(homePage.text)).toBe(false);

    const user = await createIsolatedUser(baseUrl, { name: "A11y Auditor" });
    const today = todayIso();

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 6_000_000,
      date: today,
      description: "Thu nhập Audit",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 450_000,
      date: today,
      description: "Chi tiêu Audit",
    });
    await invokeServerAction(user.client, "/dashboard", "upsertBudget", {
      category: "FOOD",
      month: getCurrentYearMonth(),
      limitAmount: 1_000_000,
    });
    await invokeServerAction(user.client, "/wishlist", "createWishlistItem", {
      name: "Mục tiêu Audit",
      price: 12_000_000,
      priority: "MEDIUM",
      targetDate: futureMonthsIso(4),
    });

    // Dashboard A11y & đ audit
    const dashBundle = await fetchPageChunks(user.client, "/dashboard");
    expect(hasForbiddenDongSymbol(dashBundle.html)).toBe(false);
    expect(stripTags(dashBundle.html)).toMatch(/\d\s\u0111/);
    expect(hasAriaHiddenSvg(dashBundle.html)).toBe(true);

    const expandedBtns = extractAriaExpandedButtons(dashBundle.html);
    expect(expandedBtns.length).toBeGreaterThanOrEqual(1);
    expect(expandedBtns.some((b) => b.ariaExpanded === "false")).toBe(true);

    const tables = extractTables(dashBundle.html);
    expect(tables.length).toBeGreaterThanOrEqual(1);
    expect(
      tables.some(
        (t) =>
          Boolean(t.caption) &&
          t.headers.length > 0 &&
          t.headers.some((h) => h.scope === "col"),
      ),
    ).toBe(true);

    // Transactions & Wishlist <dialog>, zero window.confirm, and đ audit
    for (const path of ["/dashboard", "/transactions", "/wishlist"]) {
      const bundle = await fetchPageChunks(user.client, path);
      expect(hasForbiddenDongSymbol(bundle.html)).toBe(false);
      expect(stripTags(bundle.html)).toMatch(/\d\s\u0111/);

      const allChunks = bundle.chunks.map((c) => c.code).join("\n");
      expect(allChunks).not.toContain("window.confirm(");
      expect(allChunks).not.toMatch(/confirm\s*\(\s*["']Bạn có chắc/);
      expect(
        hasDialogElement(bundle.html) ||
          allChunks.includes("<dialog") ||
          allChunks.includes('"dialog"') ||
          allChunks.includes("showModal"),
      ).toBe(true);
    }

    // Verify Server Action validation error surfaces field errors for role="alert" UI
    const invalidTx = await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: -100,
        date: today,
        description: "   ",
      },
    );
    expect(invalidTx.result?.ok).not.toBe(true);
    expect(invalidTx.result?.errors?.amount?.length).toBeGreaterThan(0);
    expect(invalidTx.result?.errors?.description?.length).toBeGreaterThan(0);

    const txBundle = await fetchPageChunks(user.client, "/transactions");
    expect(txBundle.chunks.map((c) => c.code).join("\n")).toContain("alert");
  });
});
