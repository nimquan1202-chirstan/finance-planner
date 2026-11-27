import { describe, expect, inject, test } from "vitest";
import {
  createIsolatedUser,
  getSession,
  trySignIn,
} from "../../helpers/auth";
import {
  buildCsv,
  buildOversizedCsv,
  getCurrentYearMonth,
  todayIso,
  uniqueId,
} from "../../helpers/fixtures";
import {
  assertContainsVnd,
  hasDialogElement,
  hasForbiddenDongSymbol,
  stripTags,
} from "../../helpers/html";
import { HttpClient } from "../../helpers/http-client";
import {
  fetchPageChunks,
  invokeServerAction,
} from "../../helpers/next-action";

interface TransactionApiRow {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string | null;
  date: string;
}

interface ActionFormState {
  ok?: boolean;
  error?: string;
  message?: string;
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
}

const baseUrl = inject("e2eBaseUrl");

function previousMonthMidIso(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
  return d.toISOString().slice(0, 10);
}

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

function parseCsvRecords(csvText: string): string[][] {
  const text = csvText.startsWith("\uFEFF") ? csvText.slice(1) : csvText;
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") {
        i++;
      }
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }
  return records;
}

describe("Tier 2 — Area A: Auth & IDOR Boundaries", () => {
  test("A-T2-01: unauthenticated GET / does not leak User A/B transaction totals or counts", async () => {
    const userA = await createIsolatedUser(baseUrl);
    const userB = await createIsolatedUser(baseUrl);

    await invokeServerAction<ActionFormState>(
      userA.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 12_345_678,
        date: todayIso(),
        description: `SecretUserA_${uniqueId()}`,
      },
    );
    await invokeServerAction<ActionFormState>(
      userB.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "SHOPPING",
        amount: 7_654_321,
        date: todayIso(),
        description: `SecretUserB_${uniqueId()}`,
      },
    );

    const anon = new HttpClient(baseUrl);
    const res = await anon.getText("/");
    expect(res.status).toBe(200);
    expect(hasForbiddenDongSymbol(res.text)).toBe(false);
    const text = stripTags(res.text);
    expect(text).not.toContain("12.345.678 đ");
    expect(text).not.toContain("7.654.321 đ");
    expect(text).not.toContain("4.691.357 đ");
    expect(text).not.toContain("SecretUserA_");
    expect(text).not.toContain("SecretUserB_");
    expect(res.text).toMatch(/href="\/(?:login|dashboard)"/);
  });

  test("A-T2-02: unauthenticated GET /api/transactions, CSV export, and POST CSV import all return 401 JSON", async () => {
    const anon = new HttpClient(baseUrl);

    const listRes = await anon.getJson<{ error?: string }>("/api/transactions");
    expect(listRes.status).toBe(401);
    expect(listRes.data?.error).toBeTruthy();

    const csvExportRes = await anon.getJson<{ error?: string }>(
      "/api/transactions?format=csv",
    );
    expect(csvExportRes.status).toBe(401);
    expect(csvExportRes.data?.error).toBeTruthy();

    const fd = new FormData();
    fd.append(
      "file",
      new File(
        [`date,type,category,amount,description\n${todayIso()},EXPENSE,FOOD,50000,Unauth`],
        "unauth.csv",
        { type: "text/csv" },
      ),
    );
    const csvImportRes = await anon.postRaw("/api/transactions/csv", fd);
    expect(csvImportRes.status).toBe(401);
    const importJson = (await csvImportRes.json()) as { error?: string };
    expect(importJson.error).toBeTruthy();
  });

  test("A-T2-03: unauthenticated GET /dashboard, /transactions, /wishlist redirect (307/302) to /login", async () => {
    const anon = new HttpClient(baseUrl);
    for (const protectedPath of ["/dashboard", "/transactions", "/wishlist"]) {
      const res = await anon.request(protectedPath);
      expect([302, 307]).toContain(res.status);
      expect(res.headers.get("location") ?? "").toContain("/login");
    }
  });

  test("A-T2-04: cross-user IDOR on updateTransaction & deleteTransaction fails with ok:false and leaves User A tx untouched", async () => {
    const userA = await createIsolatedUser(baseUrl);
    const userB = await createIsolatedUser(baseUrl);
    const originalDesc = `OwnerTx_${uniqueId()}`;

    const createRes = await invokeServerAction<ActionFormState>(
      userA.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 150_000,
        date: todayIso(),
        description: originalDesc,
      },
    );
    expect(createRes.result?.ok).toBe(true);

    const listA = await userA.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    const tx = listA.data.find((r) => r.description === originalDesc);
    expect(tx).toBeDefined();

    const attackerUpdate = await invokeServerAction<ActionFormState>(
      userB.client,
      "/transactions",
      "updateTransaction",
      {
        id: tx!.id,
        type: "EXPENSE",
        category: "OTHER",
        amount: 999_999,
        date: todayIso(),
        description: "Tampered by User B",
      },
    );
    expect(attackerUpdate.result?.ok).toBe(false);

    const attackerDelete = await invokeServerAction<{ ok?: boolean; error?: string }>(
      userB.client,
      "/transactions",
      "deleteTransaction",
      { id: tx!.id },
      { signature: "formData" },
    );
    expect(attackerDelete.result?.ok).toBe(false);

    const listAAfter = await userA.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    const preserved = listAAfter.data.find((r) => r.id === tx!.id);
    expect(preserved).toBeDefined();
    expect(preserved?.description).toBe(originalDesc);
    expect(preserved?.amount).toBe(150_000);
    expect(preserved?.category).toBe("FOOD");
  });

  test("A-T2-05: cross-user IDOR on updateWishlistItem & deleteWishlistItem fails with ok:false and leaves User A item untouched", async () => {
    const userA = await createIsolatedUser(baseUrl);
    const userB = await createIsolatedUser(baseUrl);
    const wishName = `OwnerWish_${uniqueId()}`;

    const createRes = await invokeServerAction<ActionFormState>(
      userA.client,
      "/wishlist",
      "createWishlistItem",
      {
        name: wishName,
        price: 5_000_000,
        priority: "HIGH",
      },
    );
    expect(createRes.result?.ok).toBe(true);

    const wishPageA = await userA.client.getText("/wishlist");
    const candidateIds = extractEntityIdsFromHtml(wishPageA.text).filter(
      (id) => id !== userA.user.id,
    );
    expect(candidateIds.length).toBeGreaterThan(0);

    for (const id of candidateIds) {
      const attackerUpdate = await invokeServerAction<ActionFormState>(
        userB.client,
        "/wishlist",
        "updateWishlistItem",
        {
          id,
          name: "TamperedWish",
          price: 100_000,
          priority: "LOW",
        },
      );
      expect(attackerUpdate.result?.ok).toBe(false);

      const attackerDelete = await invokeServerAction<{ ok?: boolean; error?: string }>(
        userB.client,
        "/wishlist",
        "deleteWishlistItem",
        { id },
        { signature: "formData" },
      );
      expect(attackerDelete.result?.ok).toBe(false);
    }

    const wishPageAAfter = await userA.client.getText("/wishlist");
    const textA = stripTags(wishPageAAfter.text);
    expect(textA).toContain(wishName);
    expect(textA).not.toContain("TamperedWish");
    assertContainsVnd(wishPageAAfter.text, 5_000_000);
  });

  test("A-T2-06: cross-user IDOR on deleteBudget fails with ok:false and leaves User A budget untouched", async () => {
    const userA = await createIsolatedUser(baseUrl);
    const userB = await createIsolatedUser(baseUrl);
    const month = getCurrentYearMonth();

    const createRes = await invokeServerAction<ActionFormState>(
      userA.client,
      "/dashboard",
      "upsertBudget",
      {
        category: "FOOD",
        month,
        limitAmount: 2_222_000,
      },
    );
    expect(createRes.result?.ok).toBe(true);

    const dashA = await userA.client.getText("/dashboard");
    const candidateIds = extractEntityIdsFromHtml(dashA.text).filter(
      (id) => id !== userA.user.id,
    );
    expect(candidateIds.length).toBeGreaterThan(0);

    for (const id of candidateIds) {
      const attackerDelete = await invokeServerAction<{ ok?: boolean; error?: string }>(
        userB.client,
        "/dashboard",
        "deleteBudget",
        { id },
      );
      expect(attackerDelete.result?.ok).toBe(false);
    }

    const dashAAfter = await userA.client.getText("/dashboard");
    assertContainsVnd(dashAAfter.text, 2_222_000);
    expect(stripTags(dashAAfter.text)).toContain("Ăn uống");
  });

  test("A-T2-07: POST /api/auth/sign-in/email with wrong or short password rejects and sets no session cookie", async () => {
    const user = await createIsolatedUser(baseUrl);

    const wrongAttempt = await trySignIn(baseUrl, user.email, "WrongPass@999");
    expect(wrongAttempt.ok).toBe(false);
    expect([400, 401, 403]).toContain(wrongAttempt.status);
    expect(wrongAttempt.client.getCookies().size).toBe(0);
    expect(await getSession(wrongAttempt.client)).toBeNull();

    const shortAttempt = await trySignIn(baseUrl, user.email, "123");
    expect(shortAttempt.ok).toBe(false);
    expect([400, 401, 422]).toContain(shortAttempt.status);
    expect(shortAttempt.client.getCookies().size).toBe(0);
    expect(await getSession(shortAttempt.client)).toBeNull();
  });
});

describe("Tier 2 — Area B: Transactions & Filter Boundaries", () => {
  test("B-T2-01: invalid filter range=next-year returns 400 JSON and range=last-month returns only prior-month transactions", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 50_000,
      date: todayIso(),
      description: "Giao dịch tháng hiện tại",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "BILLS",
      amount: 120_000,
      date: previousMonthMidIso(),
      description: "Giao dịch tháng trước",
    });

    const invalidRes = await user.client.getJson<{ error?: string }>(
      "/api/transactions?range=next-year",
    );
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.data?.error).toBeTruthy();

    const lastMonthRes = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=last-month",
    );
    expect(lastMonthRes.status).toBe(200);
    expect(lastMonthRes.data.map((r) => r.description)).toContain("Giao dịch tháng trước");
    expect(lastMonthRes.data.map((r) => r.description)).not.toContain(
      "Giao dịch tháng hiện tại",
    );
  });

  test("B-T2-02: createTransaction with amount -5000, 0, and 12.5 returns errors.amount and preserves values without DB insert", async () => {
    const user = await createIsolatedUser(baseUrl);

    for (const badAmount of [-5000, 0, 12.5]) {
      const res = await invokeServerAction<ActionFormState>(
        user.client,
        "/transactions",
        "createTransaction",
        {
          type: "EXPENSE",
          category: "FOOD",
          amount: badAmount,
          date: todayIso(),
          description: "TestAmountBoundary",
        },
      );
      expect(res.result?.ok).not.toBe(true);
      expect(res.result?.errors?.amount?.length ?? 0).toBeGreaterThan(0);
      expect(res.result?.values?.amount).toBe(String(badAmount));
      expect(res.result?.values?.description).toBe("TestAmountBoundary");
    }

    const list = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(list.data).toHaveLength(0);
  });

  test("B-T2-03: createTransaction rejects whitespace description, >120-char description, and invalid date 2026-02-30", async () => {
    const user = await createIsolatedUser(baseUrl);

    const blankRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 45_000,
        date: todayIso(),
        description: "   ",
      },
    );
    expect(blankRes.result?.ok).not.toBe(true);
    expect(blankRes.result?.errors?.description?.length ?? 0).toBeGreaterThan(0);

    const longDesc = "x".repeat(121);
    const longRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 45_000,
        date: todayIso(),
        description: longDesc,
      },
    );
    expect(longRes.result?.ok).not.toBe(true);
    expect(longRes.result?.errors?.description?.length ?? 0).toBeGreaterThan(0);
    expect(longRes.result?.values?.description).toBe(longDesc);

    const badDateRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 45_000,
        date: "2026-02-30",
        description: "Valid description",
      },
    );
    expect(badDateRes.result?.ok).not.toBe(true);
    expect(badDateRes.result?.errors?.date?.length ?? 0).toBeGreaterThan(0);
    expect(badDateRes.result?.values?.date).toBe("2026-02-30");

    const list = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(list.data).toHaveLength(0);
  });

  test("B-T2-04: GET /transactions?range=all&q=nonexistent_xyz_999 returns 200 and clean empty-state message", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 35_000,
      date: todayIso(),
      description: "Bún bò Huế",
    });

    const page = await user.client.getText(
      "/transactions?range=all&q=nonexistent_xyz_999",
    );
    expect(page.status).toBe(200);
    const text = stripTags(page.text);
    expect(text).not.toContain("Bún bò Huế");
    expect(text).toMatch(/Chưa có giao dịch nào/i);
  });

  test("B-T2-05: negative balance (-500.000 đ) displays -500.000 đ (U+0111) and deficit indicator on /dashboard", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 1_000_000,
      date: todayIso(),
      description: "Thu nhập nhỏ",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "BILLS",
      amount: 1_500_000,
      date: todayIso(),
      description: "Chi tiêu vượt thu",
    });

    const dash = await user.client.getText("/dashboard");
    expect(dash.status).toBe(200);
    expect(hasForbiddenDongSymbol(dash.text)).toBe(false);
    assertContainsVnd(dash.text, -500_000);
    expect(stripTags(dash.text)).toMatch(/thâm hụt/i);
  });

  test("B-T2-06: /transactions uses <dialog> with close/cancel controls and non-existent deleteTransaction fails safely", async () => {
    const user = await createIsolatedUser(baseUrl);
    const keepDesc = `KeepValid_${uniqueId()}`;
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 55_000,
      date: todayIso(),
      description: keepDesc,
    });

    const bundle = await fetchPageChunks(user.client, "/transactions");
    const combinedChunks = bundle.chunks.map((c) => c.code).join("\n");
    expect(combinedChunks).not.toContain("window.confirm(");
    expect(
      hasDialogElement(bundle.html) ||
        combinedChunks.includes("<dialog") ||
        combinedChunks.includes('"dialog"') ||
        combinedChunks.includes("showModal"),
    ).toBe(true);
    expect(combinedChunks).toMatch(/Huỷ|Hủy|Đóng|Cancel/i);

    const missingDel = await invokeServerAction<{ ok?: boolean; error?: string }>(
      user.client,
      "/transactions",
      "deleteTransaction",
      { id: "nonexistent_tx_id_999999" },
      { signature: "formData" },
    );
    expect(missingDel.result?.ok).toBe(false);
    expect(missingDel.result?.error).toBeTruthy();

    const listAfter = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(listAfter.data).toHaveLength(1);
    expect(listAfter.data[0]?.description).toBe(keepDesc);
  });
});

describe("Tier 2 — Area C: CSV Security & Validation Boundaries", () => {
  test("C-T2-01: CSV export neutralizes =, +, -, @ formula injection payloads with leading apostrophe", async () => {
    const user = await createIsolatedUser(baseUrl);
    const payloads = [
      "=SUM(A1)",
      "+CMD|' /C calc'!A0",
      "-1+1",
      "@SUM(1,1)",
    ];

    for (const payload of payloads) {
      const res = await invokeServerAction<ActionFormState>(
        user.client,
        "/transactions",
        "createTransaction",
        {
          type: "EXPENSE",
          category: "FOOD",
          amount: 25_000,
          date: todayIso(),
          description: payload,
        },
      );
      expect(res.result?.ok).toBe(true);
    }

    const csvRes = await user.client.getText("/api/transactions?format=csv&range=all");
    expect(csvRes.status).toBe(200);
    const records = parseCsvRecords(csvRes.text.trim());
    const header = records[0].map((h) => h.trim().toLowerCase());
    const descIdx = header.indexOf("description");
    expect(descIdx).toBeGreaterThanOrEqual(0);

    const exportedDescriptions = records.slice(1).map((r) => r[descIdx]);
    for (const payload of payloads) {
      expect(exportedDescriptions).toContain(`'${payload}`);
      expect(exportedDescriptions).not.toContain(payload);
    }
  });

  test("C-T2-02: CSV export neutralizes tab and carriage-return formula injection payloads with leading apostrophe", async () => {
    const user = await createIsolatedUser(baseUrl);
    const csvInput = buildCsv([
      {
        date: todayIso(),
        type: "EXPENSE",
        category: "FOOD",
        amount: 30_000,
        description: "\t=1+1",
      },
      {
        date: todayIso(),
        type: "EXPENSE",
        category: "FOOD",
        amount: 35_000,
        description: "\r=1+1",
      },
    ]);

    const fd = new FormData();
    fd.append("file", new File([csvInput], "tab-cr.csv", { type: "text/csv" }));
    const importRes = await user.client.postRaw("/api/transactions/csv", fd);
    expect(importRes.status).toBe(200);

    const csvRes = await user.client.getText("/api/transactions?format=csv&range=all");
    expect(csvRes.status).toBe(200);
    const records = parseCsvRecords(csvRes.text.trim());
    const header = records[0].map((h) => h.trim().toLowerCase());
    const descIdx = header.indexOf("description");
    expect(descIdx).toBeGreaterThanOrEqual(0);

    const exportedDescriptions = records.slice(1).map((r) => r[descIdx]);
    expect(exportedDescriptions.length).toBe(2);
    for (const cell of exportedDescriptions) {
      expect(cell.startsWith("'")).toBe(true);
      expect(cell).toContain("=1+1");
    }
  });

  test("C-T2-03: RFC 4180 CSV export quotes embedded commas, double quotes, and newlines without breaking columns", async () => {
    const user = await createIsolatedUser(baseUrl);
    const trickyDesc = 'Cà phê "sữa đá", size L\nGhi chú thêm';

    const createRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 49_000,
        date: todayIso(),
        description: trickyDesc,
      },
    );
    expect(createRes.result?.ok).toBe(true);

    const csvRes = await user.client.getText("/api/transactions?format=csv&range=all");
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain('""sữa đá""');

    const records = parseCsvRecords(csvRes.text.trim());
    expect(records.length).toBe(2);
    expect(records[1]).toHaveLength(records[0].length);
    const descIdx = records[0].findIndex((h) => h.trim().toLowerCase() === "description");
    expect(descIdx).toBeGreaterThanOrEqual(0);
    expect(records[1][descIdx]).toBe(trickyDesc);
  });

  test("C-T2-04: POST /api/transactions/csv with empty body or empty file returns 400 JSON and inserts zero rows", async () => {
    const user = await createIsolatedUser(baseUrl);

    const emptyFd = new FormData();
    emptyFd.append("file", new File([""], "empty.csv", { type: "text/csv" }));
    const fileRes = await user.client.postRaw("/api/transactions/csv", emptyFd);
    expect(fileRes.status).toBe(400);
    const fileJson = (await fileRes.json()) as { error?: string };
    expect(fileJson.error).toBeTruthy();

    const rawRes = await user.client.postRaw("/api/transactions/csv", "", {
      headers: { "content-type": "text/csv" },
    });
    expect(rawRes.status).toBe(400);
    const rawJson = (await rawRes.json()) as { error?: string };
    expect(rawJson.error).toBeTruthy();

    const list = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(list.data).toHaveLength(0);
  });

  test("C-T2-05: POST /api/transactions/csv > 1MB (1,048,577 bytes) returns 400 JSON and inserts zero rows", async () => {
    const user = await createIsolatedUser(baseUrl);
    const oversized = buildOversizedCsv(1_048_577);
    expect(Buffer.byteLength(oversized, "utf8")).toBeGreaterThan(1_048_576);

    const fd = new FormData();
    fd.append("file", new File([oversized], "huge.csv", { type: "text/csv" }));
    const res = await user.client.postRaw("/api/transactions/csv", fd);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBeTruthy();

    const list = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(list.data).toHaveLength(0);
  });

  test("C-T2-06: POST /api/transactions/csv with wrong headers (foo,bar,baz) returns 400 JSON", async () => {
    const user = await createIsolatedUser(baseUrl);
    const badHeaderCsv = "foo,bar,baz\n2026-11-20,EXPENSE,FOOD\n";

    const fd = new FormData();
    fd.append("file", new File([badHeaderCsv], "bad-headers.csv", { type: "text/csv" }));
    const res = await user.client.postRaw("/api/transactions/csv", fd);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBeTruthy();
  });

  test("C-T2-07: POST /api/transactions/csv with 2 valid + 3 invalid rows inserts zero invalid rows and reports 1-based error rows", async () => {
    const user = await createIsolatedUser(baseUrl);
    const mixedCsv = buildCsv([
      {
        date: todayIso(),
        type: "EXPENSE",
        category: "FOOD",
        amount: 50_000,
        description: "Hợp lệ 1",
      },
      {
        date: todayIso(),
        type: "EXPENSE",
        category: "FOOD",
        amount: -5000,
        description: "Số tiền âm",
      },
      {
        date: todayIso(),
        type: "INCOME",
        category: "SALARY",
        amount: 1_000_000,
        description: "Hợp lệ 2",
      },
      {
        date: "invalid-date",
        type: "EXPENSE",
        category: "FOOD",
        amount: 20_000,
        description: "Ngày sai",
      },
      {
        date: todayIso(),
        type: "EXPENSE",
        category: "UNKNOWN_CAT",
        amount: 30_000,
        description: "Danh mục sai",
      },
    ]);

    const fd = new FormData();
    fd.append("file", new File([mixedCsv], "mixed.csv", { type: "text/csv" }));
    const res = await user.client.postRaw("/api/transactions/csv", fd);
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      importedCount: number;
      skippedCount: number;
      errors: Array<{ row: number; message: string }>;
    };
    expect(json.importedCount).toBe(2);
    expect(json.skippedCount).toBe(3);
    expect(json.errors).toHaveLength(3);
    expect(json.errors.every((e) => Number.isInteger(e.row) && e.row >= 1)).toBe(true);
    expect(json.errors[0]!.row).toBeLessThan(json.errors[1]!.row);
    expect(json.errors[1]!.row).toBeLessThan(json.errors[2]!.row);

    const rowsRes = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(rowsRes.data).toHaveLength(2);
    const descriptions = rowsRes.data.map((r) => r.description);
    expect(descriptions).toContain("Hợp lệ 1");
    expect(descriptions).toContain("Hợp lệ 2");
    expect(descriptions).not.toContain("Số tiền âm");
    expect(descriptions).not.toContain("Ngày sai");
    expect(descriptions).not.toContain("Danh mục sai");
  });

  test("C-T2-08: POST /api/transactions/csv where all rows are invalid returns 400 JSON with importedCount 0 and row errors", async () => {
    const user = await createIsolatedUser(baseUrl);
    const allBadCsv = buildCsv([
      {
        date: "not-a-date",
        type: "EXPENSE",
        category: "FOOD",
        amount: 10_000,
        description: "Bad date",
      },
      {
        date: todayIso(),
        type: "EXPENSE",
        category: "FOOD",
        amount: 0,
        description: "Zero amount",
      },
      {
        date: todayIso(),
        type: "EXPENSE",
        category: "NOPE",
        amount: 10_000,
        description: "Bad category",
      },
    ]);

    const fd = new FormData();
    fd.append("file", new File([allBadCsv], "all-bad.csv", { type: "text/csv" }));
    const res = await user.client.postRaw("/api/transactions/csv", fd);
    expect(res.status).toBe(400);

    const json = (await res.json()) as {
      importedCount?: number;
      errors?: Array<{ row: number; message: string }>;
      error?: string;
    };
    expect(json.importedCount ?? 0).toBe(0);
    expect(Array.isArray(json.errors)).toBe(true);
    expect(json.errors).toHaveLength(3);

    const rowsRes = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(rowsRes.data).toHaveLength(0);
  });
});
