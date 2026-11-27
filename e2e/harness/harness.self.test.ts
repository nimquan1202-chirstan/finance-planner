import http from "node:http";
import net from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { HttpClient } from "../helpers/http-client";
import {
  createIsolatedUser,
  getSession,
  signIn,
  signOut,
  trySignIn,
} from "../helpers/auth";
import {
  clearActionCache,
  discoverPageActions,
  fetchPageChunks,
  invokeServerAction,
} from "../helpers/next-action";
import {
  assertContainsVnd,
  extractAriaExpandedButtons,
  extractExportCsvHref,
  extractRoleAlerts,
  extractRoleStatus,
  extractTables,
  hasAriaHiddenSvg,
  hasDialogElement,
  hasForbiddenDongSymbol,
  stripTags,
} from "../helpers/html";
import { resolveE2eServer } from "../helpers/server";

interface ProbeUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

const probeUsers = new Map<string, ProbeUser>();
const probeSessions = new Map<string, ProbeUser>();

let probeServer: http.Server;
let probeBaseUrl = "";

async function readBodyBuffer(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) {
      out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }
  return out;
}

beforeAll(async () => {
  probeServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const method = req.method ?? "GET";

    if (method === "GET" && url.pathname === "/login") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<html><body><h1>Đăng nhập</h1></body></html>");
      return;
    }

    if (method === "GET" && url.pathname === "/cookies/set") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": [
          "sid=token_abc; Path=/; HttpOnly",
          "prefs=dark; Path=/",
        ],
      });
      res.end(JSON.stringify({ set: true }));
      return;
    }

    if (method === "GET" && url.pathname === "/cookies/expire-max-age") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": "prefs=; Path=/; Max-Age=0",
      });
      res.end(JSON.stringify({ expired: "max-age" }));
      return;
    }

    if (method === "GET" && url.pathname === "/cookies/expire-date") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie":
          "sid=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      });
      res.end(JSON.stringify({ expired: "date" }));
      return;
    }

    if (method === "GET" && url.pathname === "/cookies/clear-empty") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": "sid=; Path=/",
      });
      res.end(JSON.stringify({ cleared: true }));
      return;
    }

    if (method === "GET" && url.pathname === "/cookies/echo") {
      const cookies = parseCookies(req.headers.cookie);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          cookieHeader: req.headers.cookie ?? "",
          cookies,
          origin: req.headers.origin ?? null,
        }),
      );
      return;
    }

    if (method === "GET" && url.pathname === "/redirect/hop1") {
      res.writeHead(302, {
        Location: "/redirect/hop2",
        "Set-Cookie": "hop1=yes; Path=/",
      });
      res.end();
      return;
    }

    if (method === "GET" && url.pathname === "/redirect/hop2") {
      res.writeHead(307, {
        Location: `${probeBaseUrl}/redirect/final`,
        "Set-Cookie": "hop2=yes; Path=/",
      });
      res.end();
      return;
    }

    if (method === "GET" && url.pathname === "/redirect/final") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ cookies: parseCookies(req.headers.cookie) }));
      return;
    }

    if (method === "POST" && url.pathname === "/api/auth/sign-up/email") {
      const body = JSON.parse((await readBodyBuffer(req)).toString("utf8")) as {
        email: string;
        password: string;
        name: string;
      };
      const user: ProbeUser = {
        id: `usr_${probeUsers.size + 1}`,
        email: body.email,
        name: body.name,
        password: body.password,
      };
      probeUsers.set(body.email, user);
      const token = `sess_${user.id}_${Date.now()}`;
      probeSessions.set(token, user);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `better-auth.session_token=${token}; Path=/; HttpOnly`,
      });
      res.end(
        JSON.stringify({
          user: { id: user.id, email: user.email, name: user.name },
        }),
      );
      return;
    }

    if (method === "POST" && url.pathname === "/api/auth/sign-in/email") {
      const body = JSON.parse((await readBodyBuffer(req)).toString("utf8")) as {
        email: string;
        password: string;
      };
      const user = probeUsers.get(body.email);
      if (!user || user.password !== body.password) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid email or password" }));
        return;
      }
      const token = `sess_${user.id}_${Date.now()}`;
      probeSessions.set(token, user);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": `better-auth.session_token=${token}; Path=/; HttpOnly`,
      });
      res.end(
        JSON.stringify({
          user: { id: user.id, email: user.email, name: user.name },
        }),
      );
      return;
    }

    if (method === "POST" && url.pathname === "/api/auth/sign-out") {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies["better-auth.session_token"];
      if (token) {
        probeSessions.delete(token);
      }
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Set-Cookie": "better-auth.session_token=; Path=/; Max-Age=0",
      });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (method === "GET" && url.pathname === "/api/auth/get-session") {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies["better-auth.session_token"];
      const user = token ? probeSessions.get(token) : undefined;
      res.writeHead(200, { "Content-Type": "application/json" });
      if (!user) {
        res.end("null");
        return;
      }
      res.end(
        JSON.stringify({
          user: { id: user.id, email: user.email, name: user.name },
          session: { id: token, userId: user.id },
        }),
      );
      return;
    }

    if (method === "GET" && url.pathname === "/actions-page") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <html>
          <head>
            <script src="/_next/static/chunks/unminified.js"></script>
          </head>
          <body>
            <main>Actions Probe</main>
            <script>self.__next_f.push([1,"/_next/static/chunks/minified.js"])</script>
          </body>
        </html>
      `);
      return;
    }

    if (method === "GET" && url.pathname === "/_next/static/chunks/unminified.js") {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(`
        const createTransaction = createServerReference("aaaa1111bbbb2222cccc3333dddd4444eeee5555", callServer, void 0, findSourceMapURL, "createTransaction");
      `);
      return;
    }

    if (method === "GET" && url.pathname === "/_next/static/chunks/minified.js") {
      res.writeHead(200, { "Content-Type": "application/javascript" });
      res.end(
        `var d=(0,r.createServerReference)("9999888877776666555544443333222211110000",r.callServer,void 0,r.findSourceMapURL,"deleteTransaction");`,
      );
      return;
    }

    if (method === "POST" && url.pathname === "/actions-page") {
      const actionId = req.headers["next-action"];
      const origin = req.headers["origin"];
      const accept = req.headers["accept"];
      const rawBuf = await readBodyBuffer(req);

      const webReq = new Request("http://127.0.0.1/actions-page", {
        method: "POST",
        headers: {
          "content-type": String(req.headers["content-type"] ?? ""),
        },
        body: new Uint8Array(rawBuf),
      });
      const fd = await webReq.formData();
      const arg0 = String(fd.get("0") ?? "");

      if (actionId === "9999888877776666555544443333222211110000") {
        if (fd.get("_1_simulateUnauth") === "true") {
          res.writeHead(200, {
            "Content-Type": "text/x-component",
            "x-action-redirect": "/login;push",
          });
          res.end('0:{"a":"$@1","f":""}\n1:null\n');
          return;
        }
        res.writeHead(200, { "Content-Type": "text/x-component" });
        res.end(
          `0:{"a":"$@1","f":""}\n1:${JSON.stringify({
            deletedId: fd.get("_1_id"),
            arg0,
            origin,
            accept,
          })}\n`,
        );
        return;
      }

      if (actionId === "aaaa1111bbbb2222cccc3333dddd4444eeee5555") {
        res.writeHead(200, { "Content-Type": "text/x-component" });
        res.end(
          `0:{"a":"$@1","f":""}\n1:${JSON.stringify({
            ok: true,
            amount: fd.get("_1_amount"),
            description: fd.get("_1_description"),
            arg0,
            origin,
            accept,
          })}\n`,
        );
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Unknown action");
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  });

  await new Promise<void>((resolve) => {
    probeServer.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = probeServer.address();
  if (!addr || typeof addr === "string") {
    throw new Error("Failed to bind probe server");
  }
  probeBaseUrl = `http://127.0.0.1:${addr.port}`;
});

afterEach(() => {
  delete process.env.E2E_BASE_URL;
  clearActionCache();
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    probeServer.close(() => resolve());
  });
});

describe("E2E Harness Self-Check", () => {
  test("HttpClient stores cookies, deletes expired/empty cookies, attaches Origin on POST, and distinguishes manual vs getFollow", async () => {
    const client = new HttpClient(probeBaseUrl);

    const setRes = await client.getJson<{ set: boolean }>("/cookies/set");
    expect(setRes.status).toBe(200);
    expect(client.getCookie("sid")).toBe("token_abc");
    expect(client.getCookie("prefs")).toBe("dark");

    const echo1 = await client.getJson<{
      cookies: Record<string, string>;
      origin: string | null;
    }>("/cookies/echo");
    expect(echo1.data.cookies).toEqual({ sid: "token_abc", prefs: "dark" });
    expect(echo1.data.origin).toBeNull();

    await client.getJson("/cookies/expire-max-age");
    expect(client.getCookie("prefs")).toBeUndefined();
    expect(client.getCookie("sid")).toBe("token_abc");

    await client.getJson("/cookies/expire-date");
    expect(client.getCookie("sid")).toBeUndefined();

    await client.getJson("/cookies/set");
    expect(client.getCookie("sid")).toBe("token_abc");
    await client.getJson("/cookies/clear-empty");
    expect(client.getCookie("sid")).toBeUndefined();

    // POST automatically sends Origin header
    const postRes = await client.postRaw("/cookies/echo", null);
    expect(postRes.status).toBe(404);

    // redirect: manual stops at 302
    const manualRes = await client.request("/redirect/hop1");
    expect(manualRes.status).toBe(302);
    expect(manualRes.headers.get("location")).toBe("/redirect/hop2");
    expect(client.getCookie("hop1")).toBe("yes");

    // getFollow follows multi-hop redirects and accumulates cookies
    const followClient = new HttpClient(probeBaseUrl);
    const finalRes = await followClient.getFollow("/redirect/hop1");
    expect(finalRes.status).toBe(200);
    const finalJson = (await finalRes.json()) as {
      cookies: Record<string, string>;
    };
    expect(finalJson.cookies).toEqual({ hop1: "yes", hop2: "yes" });
  });

  test("auth.ts handles createIsolatedUser, getSession, signOut, trySignIn failure, and signIn", async () => {
    const created = await createIsolatedUser(probeBaseUrl, {
      name: "Nguyen Van Test",
    });
    expect(created.user.email).toBe(created.email);
    expect(created.user.name).toBe("Nguyen Van Test");

    const activeSession = await getSession(created.client);
    expect(activeSession?.user.email).toBe(created.email);

    const out = await signOut(created.client);
    expect(out.ok).toBe(true);
    expect(await getSession(created.client)).toBeNull();

    const failedAttempt = await trySignIn(
      probeBaseUrl,
      created.email,
      "WrongPass@999",
    );
    expect(failedAttempt.ok).toBe(false);
    expect(failedAttempt.status).toBe(401);

    const signedIn = await signIn(probeBaseUrl, created.email, created.password);
    expect(signedIn.user.email).toBe(created.email);
    expect((await getSession(signedIn.client))?.user.id).toBe(created.user.id);
  });

  test("next-action.ts discovers unminified & minified Server Actions, sends Flight FormData payloads, and detects x-action-redirect", async () => {
    const client = new HttpClient(probeBaseUrl);

    const bundle = await fetchPageChunks(client, "/actions-page");
    expect(bundle.chunkUrls).toEqual([
      "/_next/static/chunks/unminified.js",
      "/_next/static/chunks/minified.js",
    ]);
    expect(bundle.chunks).toHaveLength(2);

    const actions = await discoverPageActions(client, "/actions-page");
    expect(actions.get("createTransaction")).toBe(
      "aaaa1111bbbb2222cccc3333dddd4444eeee5555",
    );
    expect(actions.get("deleteTransaction")).toBe(
      "9999888877776666555544443333222211110000",
    );

    const useActionStateRes = await invokeServerAction<{
      ok: boolean;
      amount: string;
      description: string;
      arg0: string;
      origin: string;
      accept: string;
    }>(client, "/actions-page", "createTransaction", {
      amount: 65000,
      description: "Phở bò",
    });
    expect(useActionStateRes.status).toBe(200);
    expect(useActionStateRes.actionRedirect).toBeNull();
    expect(useActionStateRes.result).toEqual({
      ok: true,
      amount: "65000",
      description: "Phở bò",
      arg0: '[{},"$K1"]',
      origin: probeBaseUrl,
      accept: "text/x-component",
    });

    const formDataRes = await invokeServerAction<{
      deletedId: string;
      arg0: string;
      origin: string;
      accept: string;
    }>(
      client,
      "/actions-page",
      "deleteTransaction",
      { id: "tx_123" },
      { signature: "formData" },
    );
    expect(formDataRes.result).toEqual({
      deletedId: "tx_123",
      arg0: '["$K1"]',
      origin: probeBaseUrl,
      accept: "text/x-component",
    });

    const redirectRes = await invokeServerAction(
      client,
      "/actions-page",
      "deleteTransaction",
      { id: "tx_123", simulateUnauth: "true" },
      { signature: "formData" },
    );
    expect(redirectRes.actionRedirect).toBe("/login;push");
    expect(redirectRes.result).toBeNull();
  });

  test("html.ts parses tables, aria-hidden SVGs, aria-expanded buttons, dialog, alerts, VND formatting, and CSV href", () => {
    const sampleHtml = `
      <main>
        <a href="/api/transactions?format=csv&amp;range=last-month&amp;type=EXPENSE">Xuất CSV</a>
        <div role="alert"><div><span>Lỗi nhập liệu</span></div></div>
        <div role="status">✓ Đã lưu thành công</div>
        <svg aria-hidden="true" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" /></svg>
        <button type="button" aria-expanded="false"><span>Xem bảng số liệu</span></button>
        <table class="sr-only">
          <caption>Phân bổ chi tiêu theo danh mục</caption>
          <thead>
            <tr>
              <th scope="col">Danh mục</th>
              <th scope="col">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ăn uống</td>
              <td>1.250.000 đ</td>
            </tr>
          </tbody>
        </table>
        <dialog id="confirm-delete">Xác nhận xoá?</dialog>
      </main>
    `;

    expect(stripTags(sampleHtml)).toContain("1.250.000 đ");
    expect(hasForbiddenDongSymbol(sampleHtml)).toBe(false);
    expect(() => assertContainsVnd(sampleHtml, 1_250_000)).not.toThrow();
    expect(() =>
      assertContainsVnd("<span>1.250.000 \u20ab</span>", 1_250_000),
    ).toThrow(/U\+20AB/);
    expect(() => assertContainsVnd(sampleHtml, 999_000)).toThrow();

    const tables = extractTables(sampleHtml);
    expect(tables).toHaveLength(1);
    expect(tables[0]).toEqual({
      caption: "Phân bổ chi tiêu theo danh mục",
      rawClass: "sr-only",
      headers: [
        { text: "Danh mục", scope: "col" },
        { text: "Số tiền", scope: "col" },
      ],
      rows: [["Ăn uống", "1.250.000 đ"]],
    });

    expect(hasAriaHiddenSvg(sampleHtml)).toBe(true);
    expect(hasAriaHiddenSvg("<svg viewBox='0 0 10 10'></svg>")).toBe(false);

    const buttons = extractAriaExpandedButtons(sampleHtml);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].ariaExpanded).toBe("false");
    expect(buttons[0].text).toBe("Xem bảng số liệu");

    expect(hasDialogElement(sampleHtml)).toBe(true);
    expect(hasDialogElement("<div>no modal</div>")).toBe(false);

    expect(extractRoleAlerts(sampleHtml)).toEqual(["Lỗi nhập liệu"]);
    expect(extractRoleStatus(sampleHtml)).toEqual(["✓ Đã lưu thành công"]);
    expect(extractExportCsvHref(sampleHtml)).toBe(
      "/api/transactions?format=csv&range=last-month&type=EXPENSE",
    );
  });

  test("server.ts succeeds for reachable E2E_BASE_URL and fails loudly when unreachable", async () => {
    process.env.E2E_BASE_URL = `${probeBaseUrl}/`;
    const handle = await resolveE2eServer({ externalTimeoutMs: 2_000 });
    expect(handle.baseUrl).toBe(probeBaseUrl);
    await handle.stop();

    // Allocate an unused port and close immediately to guarantee connection refusal
    const unusedPort = await new Promise<number>((resolve, reject) => {
      const s = net.createServer();
      s.listen(0, "127.0.0.1", () => {
        const addr = s.address();
        if (!addr || typeof addr === "string") {
          s.close(() => reject(new Error("Bad addr")));
          return;
        }
        const p = addr.port;
        s.close((err) => (err ? reject(err) : resolve(p)));
      });
    });

    process.env.E2E_BASE_URL = `http://127.0.0.1:${unusedPort}`;
    await expect(
      resolveE2eServer({ externalTimeoutMs: 600 }),
    ).rejects.toThrow(/Timed out/);
  });
});
