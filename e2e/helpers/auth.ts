import { uniqueEmail } from "./fixtures";
import { HttpClient } from "./http-client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  [key: string]: unknown;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    id: string;
    userId: string;
    [key: string]: unknown;
  };
}

export interface IsolatedUserContext {
  client: HttpClient;
  user: AuthUser;
  email: string;
  password: string;
  name: string;
}

export async function getSession(client: HttpClient): Promise<AuthSession | null> {
  const res = await client.getJson<AuthSession | null>("/api/auth/get-session");
  if (res.status !== 200 || !res.data || !res.data.user) {
    return null;
  }
  return res.data;
}

export async function createIsolatedUser(
  baseUrl: string,
  opts?: { name?: string; email?: string; password?: string },
): Promise<IsolatedUserContext> {
  const email = opts?.email ?? uniqueEmail("e2e");
  const password = opts?.password ?? "TestPass@12345";
  const name = opts?.name ?? "E2E Test User";
  const client = new HttpClient(baseUrl);

  const res = await client.postJson<{ user?: AuthUser; message?: string; code?: string }>(
    "/api/auth/sign-up/email",
    { email, password, name },
  );

  if (res.status !== 200) {
    throw new Error(
      `createIsolatedUser failed (HTTP ${res.status}) for ${email}: ${JSON.stringify(res.data)}`,
    );
  }
  if (client.getCookies().size === 0) {
    throw new Error(
      `createIsolatedUser expected session cookie after sign-up for ${email}, but CookieJar is empty`,
    );
  }

  let user = res.data?.user;
  if (!user) {
    const session = await getSession(client);
    user = session?.user;
  }
  if (!user) {
    throw new Error(
      `createIsolatedUser succeeded (HTTP 200) for ${email} but no user was returned in payload or /api/auth/get-session`,
    );
  }

  return { client, user, email, password, name };
}

export async function trySignIn(
  baseUrl: string,
  email: string,
  password: string,
): Promise<{
  client: HttpClient;
  status: number;
  data: { user?: AuthUser; message?: string; code?: string } | null;
  ok: boolean;
}> {
  const client = new HttpClient(baseUrl);
  const res = await client.postJson<{ user?: AuthUser; message?: string; code?: string } | null>(
    "/api/auth/sign-in/email",
    { email, password },
  );
  return {
    client,
    status: res.status,
    data: res.data,
    ok: res.status === 200 && client.getCookies().size > 0,
  };
}

export async function signIn(
  baseUrl: string,
  email: string,
  password: string,
): Promise<{ client: HttpClient; user: AuthUser; email: string; password: string }> {
  const attempt = await trySignIn(baseUrl, email, password);
  if (attempt.status !== 200 || attempt.client.getCookies().size === 0) {
    throw new Error(
      `signIn failed (HTTP ${attempt.status}) for ${email}: ${JSON.stringify(attempt.data)}`,
    );
  }

  let user = attempt.data?.user;
  if (!user) {
    const session = await getSession(attempt.client);
    user = session?.user;
  }
  if (!user) {
    throw new Error(`signIn succeeded for ${email} but session user could not be resolved`);
  }

  return { client: attempt.client, user, email, password };
}

export async function signOut(
  client: HttpClient,
): Promise<{ status: number; ok: boolean; data: unknown }> {
  const res = await client.postJson("/api/auth/sign-out", {});
  return {
    status: res.status,
    ok: res.status >= 200 && res.status < 300,
    data: res.data,
  };
}

export async function signInDemo(
  baseUrl: string,
): Promise<{ client: HttpClient; user: AuthUser; email: string; password: string }> {
  return signIn(baseUrl, "demo@phy10615.vn", "Demo@123456");
}
