export interface TextResponse {
  status: number;
  headers: Headers;
  text: string;
  response: Response;
}

export interface JsonResponse<T> {
  status: number;
  headers: Headers;
  data: T;
  response: Response;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class HttpClient {
  public readonly baseUrl: string;
  private readonly cookies = new Map<string, string>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  getCookies(): Map<string, string> {
    return new Map(this.cookies);
  }

  getCookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  clearCookies(): void {
    this.cookies.clear();
  }

  private buildCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  private updateCookiesFromResponse(headers: Headers): void {
    const setCookies =
      typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const parts = raw.split(";").map((p) => p.trim());
      const [nameVal, ...attrs] = parts;
      if (!nameVal) continue;
      const eqIdx = nameVal.indexOf("=");
      if (eqIdx <= 0) continue;
      const name = nameVal.slice(0, eqIdx).trim();
      const value = nameVal.slice(eqIdx + 1).trim();

      let expired = value === "";
      for (const attr of attrs) {
        const attrLower = attr.toLowerCase();
        if (attrLower.startsWith("max-age=")) {
          const maxAge = Number(attr.slice("max-age=".length));
          if (!Number.isNaN(maxAge) && maxAge <= 0) {
            expired = true;
          }
        } else if (attrLower.startsWith("expires=")) {
          const expiresAt = Date.parse(attr.slice("expires=".length));
          if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
            expired = true;
          }
        }
      }

      if (expired) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  private resolveUrl(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }
    const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  async request(pathOrUrl: string, init?: RequestInit): Promise<Response> {
    const url = this.resolveUrl(pathOrUrl);
    const headers = new Headers(init?.headers);
    const method = (init?.method ?? "GET").toUpperCase();

    if (this.cookies.size > 0 && !headers.has("cookie")) {
      headers.set("cookie", this.buildCookieHeader());
    }
    if (method !== "GET" && method !== "HEAD" && !headers.has("origin")) {
      headers.set("origin", this.baseUrl);
    }

    const res = await fetch(url, {
      ...init,
      method,
      headers,
      redirect: init?.redirect ?? "manual",
    });

    this.updateCookiesFromResponse(res.headers);
    return res;
  }

  async getFollow(pathOrUrl: string, maxHops = 5): Promise<Response> {
    let currentUrl = this.resolveUrl(pathOrUrl);
    for (let hop = 0; hop <= maxHops; hop++) {
      const res = await this.request(currentUrl, {
        method: "GET",
        redirect: "manual",
      });
      if (!REDIRECT_STATUSES.has(res.status)) {
        return res;
      }
      const location = res.headers.get("location");
      if (!location) {
        return res;
      }
      currentUrl = new URL(location, currentUrl).toString();
    }
    throw new Error(`Exceeded maximum redirect hops (${maxHops}) from ${pathOrUrl}`);
  }

  async getText(pathOrUrl: string, init?: RequestInit): Promise<TextResponse> {
    const response = await this.request(pathOrUrl, {
      ...init,
      method: "GET",
    });
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text,
      response,
    };
  }

  async getJson<T = unknown>(
    pathOrUrl: string,
    init?: RequestInit,
  ): Promise<JsonResponse<T>> {
    const response = await this.request(pathOrUrl, {
      ...init,
      method: "GET",
    });
    const raw = await response.text();
    let data: T;
    try {
      data = (raw ? JSON.parse(raw) : null) as T;
    } catch (err) {
      throw new Error(
        `Failed to parse JSON from GET ${pathOrUrl} (status ${response.status}): ${
          err instanceof Error ? err.message : String(err)
        }\nBody: ${raw.slice(0, 500)}`,
      );
    }
    return {
      status: response.status,
      headers: response.headers,
      data,
      response,
    };
  }

  async postJson<T = unknown>(
    pathOrUrl: string,
    body: unknown,
    init?: RequestInit,
  ): Promise<JsonResponse<T>> {
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await this.request(pathOrUrl, {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const raw = await response.text();
    let data: T;
    try {
      data = (raw ? JSON.parse(raw) : null) as T;
    } catch (err) {
      throw new Error(
        `Failed to parse JSON from POST ${pathOrUrl} (status ${response.status}): ${
          err instanceof Error ? err.message : String(err)
        }\nBody: ${raw.slice(0, 500)}`,
      );
    }
    return {
      status: response.status,
      headers: response.headers,
      data,
      response,
    };
  }

  async postRaw(
    pathOrUrl: string,
    body: BodyInit | null,
    init?: RequestInit,
  ): Promise<Response> {
    return this.request(pathOrUrl, {
      ...init,
      method: "POST",
      body,
    });
  }
}
