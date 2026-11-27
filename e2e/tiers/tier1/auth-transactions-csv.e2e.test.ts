import { describe, expect, inject, test } from "vitest";
import {
  createIsolatedUser,
  getSession,
  signIn,
  signOut,
} from "../../helpers/auth";
import {
  buildCsv,
  daysAgoIso,
  todayIso,
  uniqueId,
} from "../../helpers/fixtures";
import {
  assertContainsVnd,
  extractExportCsvHref,
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
  message?: string;
  errors?: Record<string, string[]>;
  values?: Record<string, string>;
}

const baseUrl = inject("e2eBaseUrl");

describe("Tier 1 — Area A: Auth, Session Protection & IDOR Isolation", () => {
  test("A-T1-01: unauthenticated GET / renders safe landing page without leaking user totals", async () => {
    const markerUser = await createIsolatedUser(baseUrl);
    const secretAmount = 9_876_543;
    await invokeServerAction<ActionFormState>(
      markerUser.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: secretAmount,
        date: todayIso(),
        description: `SecretIncome_${uniqueId()}`,
      },
    );

    const anon = new HttpClient(baseUrl);
    const res = await anon.getText("/");
    expect(res.status).toBe(200);
    const text = stripTags(res.text);
    expect(res.text).toMatch(/href="\/(?:login|dashboard)"/);
    expect(text).not.toContain("9.876.543 đ");
    expect(hasForbiddenDongSymbol(res.text)).toBe(false);
  });

  test("A-T1-02: authenticated GET / displays CTA and scopes any summary strictly to current user in đ", async () => {
    const userA = await createIsolatedUser(baseUrl);
    const userB = await createIsolatedUser(baseUrl);

    await invokeServerAction<ActionFormState>(
      userA.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 4_321_000,
        date: todayIso(),
        description: "Thu nhập User A",
      },
    );
    await invokeServerAction<ActionFormState>(
      userB.client,
      "/transactions",
      "createTransaction",
      {
        type: "INCOME",
        category: "SALARY",
        amount: 8_765_000,
        date: todayIso(),
        description: "Thu nhập User B",
      },
    );

    const resA = await userA.client.getText("/");
    expect(resA.status).toBe(200);
    expect(resA.text).toMatch(/href="\/(?:dashboard|transactions)"/);
    expect(hasForbiddenDongSymbol(resA.text)).toBe(false);
    const textA = stripTags(resA.text);
    expect(textA).not.toContain("8.765.000 đ");
    expect(textA).not.toContain("13.086.000 đ");
  });

  test("A-T1-03: POST /api/auth/sign-up/email issues session cookie and GET /api/auth/get-session returns user", async () => {
    const created = await createIsolatedUser(baseUrl, {
      name: "Trần Thị Minh",
    });

    expect(created.client.getCookies().size).toBeGreaterThan(0);
    const session = await getSession(created.client);
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe(created.email);
    expect(session?.user.name).toBe("Trần Thị Minh");
  });

  test("A-T1-04: POST /api/auth/sign-out clears session and protected routes redirect to /login", async () => {
    const user = await createIsolatedUser(baseUrl);
    const out = await signOut(user.client);
    expect(out.ok).toBe(true);
    expect(await getSession(user.client)).toBeNull();

    for (const protectedPath of ["/dashboard", "/transactions", "/wishlist"]) {
      const res = await user.client.request(protectedPath);
      expect([302, 307]).toContain(res.status);
      expect(res.headers.get("location")).toContain("/login");
    }
  });

  test("A-T1-05: GET /login renders email/password form and handles GitHub OAuth option cleanly", async () => {
    const anon = new HttpClient(baseUrl);
    const res = await anon.getText("/login");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/name=["']email["']/);
    expect(res.text).toMatch(/name=["']password["']/);

    // Sign-in with an existing user works over the email/password endpoint
    const user = await createIsolatedUser(baseUrl);
    const signedIn = await signIn(baseUrl, user.email, user.password);
    expect(signedIn.user.email).toBe(user.email);

    // GitHub OAuth button is either wired when env configured or cleanly omitted/disabled
    const hasGithubButton = res.text.includes("GitHub");
    if (hasGithubButton) {
      const bundle = await fetchPageChunks(anon, "/login");
      const allCode = bundle.chunks.map((c) => c.code).join("\n");
      expect(allCode).toMatch(/github/i);
    }
  });

  test("A-T1-06: owner can create, update, and delete own transaction via Server Actions", async () => {
    const user = await createIsolatedUser(baseUrl);
    const initialDesc = `Cafe_${uniqueId()}`;
    const updatedDesc = `CafeSua_${uniqueId()}`;

    const createRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 45_000,
        date: todayIso(),
        description: initialDesc,
      },
    );
    expect(createRes.result?.ok).toBe(true);

    const list1 = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(list1.status).toBe(200);
    const createdRow = list1.data.find((r) => r.description === initialDesc);
    expect(createdRow).toBeDefined();

    const updateRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "updateTransaction",
      {
        id: createdRow!.id,
        type: "EXPENSE",
        category: "ENTERTAINMENT",
        amount: 55_000,
        date: todayIso(),
        description: updatedDesc,
      },
    );
    expect(updateRes.result?.ok).toBe(true);

    const list2 = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    const updatedRow = list2.data.find((r) => r.id === createdRow!.id);
    expect(updatedRow?.description).toBe(updatedDesc);
    expect(updatedRow?.amount).toBe(55_000);
    expect(updatedRow?.category).toBe("ENTERTAINMENT");

    await invokeServerAction(
      user.client,
      "/transactions",
      "deleteTransaction",
      { id: createdRow!.id },
      { signature: "formData" },
    );

    const list3 = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(list3.data.find((r) => r.id === createdRow!.id)).toBeUndefined();
  });
});

describe("Tier 1 — Area B: Transactions CRUD, URL Filtering & Core Contracts", () => {
  test("B-T1-01: createTransaction persists row and renders Vietnamese category & -65.000 đ on /transactions", async () => {
    const user = await createIsolatedUser(baseUrl);
    const res = await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "createTransaction",
      {
        type: "EXPENSE",
        category: "FOOD",
        amount: 65_000,
        date: todayIso(),
        description: "Phở bò",
      },
    );
    expect(res.result?.ok).toBe(true);
    expect(res.result?.message).toBeTruthy();

    const page = await user.client.getText("/transactions");
    expect(page.status).toBe(200);
    const text = stripTags(page.text);
    expect(text).toContain("Phở bò");
    expect(text).toContain("Ăn uống");
    assertContainsVnd(page.text, "-65.000 đ");
  });

  test("B-T1-02: /transactions URL filters scope visible list and footer totals", async () => {
    const user = await createIsolatedUser(baseUrl);
    const today = todayIso();

    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 65_000,
      date: today,
      description: "Phở bò buổi sáng",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "TRANSPORT",
      amount: 120_000,
      date: today,
      description: "Grab sân bay",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 5_000_000,
      date: today,
      description: "Phở thu nhập",
    });

    const filtered = await user.client.getText(
      "/transactions?range=all&type=EXPENSE&category=FOOD&q=Ph%E1%BB%9F",
    );
    expect(filtered.status).toBe(200);
    const text = stripTags(filtered.text);
    expect(text).toContain("Phở bò buổi sáng");
    expect(text).not.toContain("Grab sân bay");
    expect(text).not.toContain("Phở thu nhập");
    expect(text).toMatch(/Đang xem\s*1\s*khoản/);
    assertContainsVnd(filtered.text, "65.000 đ");
  });

  test("B-T1-03: sort=asc and sort=desc order transactions accurately", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 20_000,
      date: daysAgoIso(3),
      description: "Ngày cũ nhất",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 30_000,
      date: todayIso(),
      description: "Ngày mới nhất",
    });

    const asc = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all&sort=asc",
    );
    expect(asc.status).toBe(200);
    expect(asc.data.map((r) => r.description)).toEqual([
      "Ngày cũ nhất",
      "Ngày mới nhất",
    ]);

    const desc = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all&sort=desc",
    );
    expect(desc.status).toBe(200);
    expect(desc.data.map((r) => r.description)).toEqual([
      "Ngày mới nhất",
      "Ngày cũ nhất",
    ]);
  });

  test("B-T1-04: /transactions replaces window.confirm with <dialog> and deletes via deleteTransaction action", async () => {
    const user = await createIsolatedUser(baseUrl);
    const desc = `ToDelete_${uniqueId()}`;
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 40_000,
      date: todayIso(),
      description: desc,
    });

    const bundle = await fetchPageChunks(user.client, "/transactions");
    const combinedChunks = bundle.chunks.map((c) => c.code).join("\n");
    expect(combinedChunks).not.toContain("window.confirm(");
    expect(combinedChunks).not.toMatch(/confirm\s*\(\s*["']Bạn có chắc/);
    expect(
      hasDialogElement(bundle.html) ||
        combinedChunks.includes("<dialog") ||
        combinedChunks.includes('"dialog"') ||
        combinedChunks.includes("showModal"),
    ).toBe(true);

    const listBefore = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    const target = listBefore.data.find((r) => r.description === desc);
    expect(target).toBeDefined();

    await invokeServerAction(
      user.client,
      "/transactions",
      "deleteTransaction",
      { id: target!.id },
      { signature: "formData" },
    );

    const listAfter = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(listAfter.data.find((r) => r.id === target!.id)).toBeUndefined();
  });

  test("B-T1-05: currency formatting across /dashboard and /transactions uses đ (U+0111) and zero ₫ (U+20AB)", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 1_250_000,
      date: todayIso(),
      description: "Tiền thưởng",
    });

    for (const path of ["/dashboard", "/transactions?range=all"]) {
      const page = await user.client.getText(path);
      expect(page.status).toBe(200);
      expect(hasForbiddenDongSymbol(page.text)).toBe(false);
      assertContainsVnd(page.text, 1_250_000);
    }
  });

  test("B-T1-06: updateTransaction modifies amount, category, and description", async () => {
    const user = await createIsolatedUser(baseUrl);
    const desc = `BeforeEdit_${uniqueId()}`;
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "OTHER",
      amount: 100_000,
      date: todayIso(),
      description: desc,
    });

    const list1 = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    const row = list1.data.find((r) => r.description === desc);
    expect(row).toBeDefined();

    const updateRes = await invokeServerAction<ActionFormState>(
      user.client,
      "/transactions",
      "updateTransaction",
      {
        id: row!.id,
        type: "EXPENSE",
        category: "SHOPPING",
        amount: 250_000,
        date: todayIso(),
        description: "Sau khi chỉnh sửa",
      },
    );
    expect(updateRes.result?.ok).toBe(true);

    const list2 = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    const updated = list2.data.find((r) => r.id === row!.id);
    expect(updated?.amount).toBe(250_000);
    expect(updated?.category).toBe("SHOPPING");
    expect(updated?.description).toBe("Sau khi chỉnh sửa");
  });
});

describe("Tier 1 — Area C: CSV Export/Import & Formula-Injection Protection", () => {
  test("C-T1-01: GET /api/transactions?format=csv returns UTF-8 BOM, no-store, headers, and rows", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 2_000_000,
      date: todayIso(),
      description: "Lương part-time",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 50_000,
      date: todayIso(),
      description: "Bún chả",
    });

    const csvRes = await user.client.getText("/api/transactions?format=csv&range=all");
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("content-type")).toMatch(/text\/csv/i);
    expect(csvRes.headers.get("content-type")).toMatch(/utf-8/i);
    expect(csvRes.headers.get("cache-control") ?? "").toContain("no-store");
    expect(csvRes.text.startsWith("\uFEFF")).toBe(true);

    const lines = csvRes.text.slice(1).trim().split(/\r?\n/);
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain("type");
    expect(lines[0]).toContain("amount");
    expect(csvRes.text).toContain("Lương part-time");
    expect(csvRes.text).toContain("Bún chả");
  });

  test("C-T1-02: GET /api/transactions?format=csv honors type and category query filters", async () => {
    const user = await createIsolatedUser(baseUrl);
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "FOOD",
      amount: 45_000,
      date: todayIso(),
      description: "Mì Quảng",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "INCOME",
      category: "SALARY",
      amount: 3_000_000,
      date: todayIso(),
      description: "Lương chính",
    });
    await invokeServerAction(user.client, "/transactions", "createTransaction", {
      type: "EXPENSE",
      category: "TRANSPORT",
      amount: 35_000,
      date: todayIso(),
      description: "Vé xe buýt",
    });

    const csvRes = await user.client.getText(
      "/api/transactions?format=csv&range=all&type=EXPENSE&category=FOOD",
    );
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain("Mì Quảng");
    expect(csvRes.text).not.toContain("Lương chính");
    expect(csvRes.text).not.toContain("Vé xe buýt");
  });

  test("C-T1-03: POST /api/transactions/csv imports 3 valid rows and persists to user account", async () => {
    const user = await createIsolatedUser(baseUrl);
    const csvBody = buildCsv([
      {
        date: daysAgoIso(2),
        type: "INCOME",
        category: "SALARY",
        amount: 4_000_000,
        description: "Thưởng tháng",
      },
      {
        date: daysAgoIso(1),
        type: "EXPENSE",
        category: "FOOD",
        amount: 60_000,
        description: "Bánh mì",
      },
      {
        date: todayIso(),
        type: "EXPENSE",
        category: "BILLS",
        amount: 150_000,
        description: "Tiền điện",
      },
    ]);

    const fd = new FormData();
    fd.append("file", new File([csvBody], "import.csv", { type: "text/csv" }));

    const res = await user.client.postRaw("/api/transactions/csv", fd);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      importedCount: number;
      skippedCount: number;
      errors: unknown[];
    };
    expect(json).toEqual({
      importedCount: 3,
      skippedCount: 0,
      errors: [],
    });

    const rowsRes = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(rowsRes.data).toHaveLength(3);
  });

  test("C-T1-04: POST /api/transactions/csv + export roundtrips RFC 4180 commas and double quotes", async () => {
    const user = await createIsolatedUser(baseUrl);
    const specialDesc = 'Cơm trưa, "đặc biệt"';
    const csvBody = buildCsv([
      {
        date: todayIso(),
        type: "EXPENSE",
        category: "FOOD",
        amount: 85_000,
        description: specialDesc,
      },
    ]);

    const fd = new FormData();
    fd.append("file", new File([csvBody], "rfc4180.csv", { type: "text/csv" }));
    const importRes = await user.client.postRaw("/api/transactions/csv", fd);
    expect(importRes.status).toBe(200);

    const jsonRes = await user.client.getJson<TransactionApiRow[]>(
      "/api/transactions?range=all",
    );
    expect(jsonRes.data[0]?.description).toBe(specialDesc);

    const exportRes = await user.client.getText(
      "/api/transactions?format=csv&range=all",
    );
    expect(exportRes.status).toBe(200);
    expect(exportRes.text).toContain('"Cơm trưa, ""đặc biệt"""');
  });

  test("C-T1-05: /transactions export CSV link carries active URL filters and import UI is rendered", async () => {
    const user = await createIsolatedUser(baseUrl);
    const page = await user.client.getText(
      "/transactions?range=last-month&type=EXPENSE&category=FOOD&q=com&sort=asc",
    );
    expect(page.status).toBe(200);

    const exportHref = extractExportCsvHref(page.text);
    expect(exportHref).not.toBeNull();
    const parsedUrl = new URL(exportHref!, baseUrl);
    expect(parsedUrl.pathname).toBe("/api/transactions");
    expect(parsedUrl.searchParams.get("format")).toBe("csv");
    expect(parsedUrl.searchParams.get("range")).toBe("last-month");
    expect(parsedUrl.searchParams.get("type")).toBe("EXPENSE");
    expect(parsedUrl.searchParams.get("category")).toBe("FOOD");
    expect(parsedUrl.searchParams.get("q")).toBe("com");
    expect(parsedUrl.searchParams.get("sort")).toBe("asc");

    // CSV import UI & sample CSV trigger exist on /transactions
    expect(page.text).toMatch(/type=["']file["']|Nhập CSV/i);
    expect(page.text).toMatch(/mẫu|sample/i);
  });
});
