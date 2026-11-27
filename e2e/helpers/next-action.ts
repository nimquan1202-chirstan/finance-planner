import { HttpClient } from "./http-client";

export type ServerActionSignature = "useActionState" | "formData";

export interface ServerActionResult<T = unknown> {
  status: number;
  headers: Headers;
  actionRedirect: string | null;
  rawBody: string;
  result: T | undefined;
}

export interface PageChunkBundle {
  html: string;
  chunkUrls: string[];
  chunks: Array<{ url: string; code: string }>;
}

const actionCache = new Map<string, Map<string, string>>();
const chunkCache = new Map<string, string>();

export function clearActionCache(): void {
  actionCache.clear();
  chunkCache.clear();
}

export function extractChunkUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>();
  const regex = /\/_next\/static\/chunks\/[^"'\s\\]+\.js/g;
  for (const match of html.matchAll(regex)) {
    urls.add(match[0]);
  }
  return Array.from(urls);
}

export function parseServerReferences(jsCode: string): Map<string, string> {
  const actions = new Map<string, string>();
  const regex =
    /(?:\(\s*0\s*,\s*[A-Za-z0-9_$.]+\.createServerReference\s*\)|(?:[A-Za-z0-9_$]+\.)?createServerReference)\(\s*["']([a-fA-F0-9]+)["']\s*,[^)]*?,\s*["']([A-Za-z0-9_$]+)["']\s*\)/g;
  for (const match of jsCode.matchAll(regex)) {
    const [, actionId, actionName] = match;
    if (actionId && actionName) {
      actions.set(actionName, actionId);
    }
  }
  return actions;
}

export async function fetchPageChunks(
  client: HttpClient,
  pagePath: string,
  opts?: { bypassCache?: boolean },
): Promise<PageChunkBundle> {
  const pageRes = await client.getText(pagePath);
  if (pageRes.status !== 200) {
    throw new Error(
      `Failed to fetch "${pagePath}" for chunk inspection (HTTP ${pageRes.status}, location=${pageRes.headers.get("location") ?? "none"})`,
    );
  }

  const chunkUrls = extractChunkUrlsFromHtml(pageRes.text);
  const chunks: Array<{ url: string; code: string }> = [];

  for (const url of chunkUrls) {
    const cacheKey = `${client.baseUrl}::${url}`;
    let code = opts?.bypassCache ? undefined : chunkCache.get(cacheKey);
    if (code === undefined) {
      const chunkRes = await client.getText(url);
      if (chunkRes.status !== 200) {
        throw new Error(`Failed to fetch client chunk "${url}" (HTTP ${chunkRes.status})`);
      }
      code = chunkRes.text;
      chunkCache.set(cacheKey, code);
    }
    chunks.push({ url, code });
  }

  return {
    html: pageRes.text,
    chunkUrls,
    chunks,
  };
}

export async function discoverPageActions(
  client: HttpClient,
  pagePath: string,
  opts?: { bypassCache?: boolean },
): Promise<Map<string, string>> {
  const cacheKey = `${client.baseUrl}::${pagePath}`;
  if (!opts?.bypassCache) {
    const cached = actionCache.get(cacheKey);
    if (cached) {
      return new Map(cached);
    }
  }

  const bundle = await fetchPageChunks(client, pagePath, opts);
  const discovered = new Map<string, string>();
  for (const chunk of bundle.chunks) {
    for (const [name, id] of parseServerReferences(chunk.code)) {
      discovered.set(name, id);
    }
  }

  actionCache.set(cacheKey, discovered);
  return new Map(discovered);
}

export function buildFlightFormData(
  fields: Record<string, string | number | boolean | Blob>,
  signature: ServerActionSignature = "useActionState",
): FormData {
  const fd = new FormData();
  fd.append("0", signature === "formData" ? '["$K1"]' : '[{},"$K1"]');
  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof Blob) {
      fd.append(`_1_${key}`, value);
    } else {
      fd.append(`_1_${key}`, String(value));
    }
  }
  return fd;
}

export function parseFlightResponse<T = unknown>(rawBody: string): T | undefined {
  const frames = new Map<string, string>();
  for (const line of rawBody.split(/\r?\n/)) {
    if (!line) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) continue;
    const frameId = line.slice(0, colonIdx).trim();
    if (!/^[0-9a-zA-Z]+$/.test(frameId)) continue;
    frames.set(frameId, line.slice(colonIdx + 1));
  }

  let targetFrameId = "1";
  const frame0 = frames.get("0");
  if (frame0) {
    try {
      const meta = JSON.parse(frame0) as { a?: unknown };
      if (typeof meta?.a === "string" && meta.a.startsWith("$@")) {
        targetFrameId = meta.a.slice(2);
      }
    } catch {
      // ignore non-JSON frame 0
    }
  }

  const payload = frames.get(targetFrameId);
  if (payload === undefined || payload === "" || payload === "undefined") {
    return undefined;
  }

  if (payload.startsWith("E{")) {
    throw new Error(`Server Action Flight error frame: ${payload}`);
  }

  try {
    return JSON.parse(payload) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse Server Action Flight payload on frame "${targetFrameId}": ${
        err instanceof Error ? err.message : String(err)
      }\nPayload: ${payload.slice(0, 400)}`,
    );
  }
}

export async function invokeServerAction<T = unknown>(
  client: HttpClient,
  pagePath: string,
  actionName: string,
  fields: Record<string, string | number | boolean | Blob>,
  opts?: {
    signature?: ServerActionSignature;
    discoveryPath?: string;
    actionId?: string;
  },
): Promise<ServerActionResult<T>> {
  let actionId = opts?.actionId;
  if (!actionId) {
    const discoveryPath = opts?.discoveryPath ?? pagePath;
    const actions = await discoverPageActions(client, discoveryPath);
    actionId = actions.get(actionName);
    if (!actionId) {
      throw new Error(
        `Server Action "${actionName}" not discovered on "${discoveryPath}". Available actions: [${Array.from(actions.keys()).join(", ")}]`,
      );
    }
  }

  const fd = buildFlightFormData(fields, opts?.signature ?? "useActionState");
  const response = await client.postRaw(pagePath, fd, {
    headers: {
      "Next-Action": actionId,
      Accept: "text/x-component",
      Origin: client.baseUrl,
    },
  });

  const actionRedirect = response.headers.get("x-action-redirect");
  const rawBody = await response.text();
  let result: T | undefined;
  if (!actionRedirect) {
    result = parseFlightResponse<T>(rawBody);
  } else {
    try {
      result = parseFlightResponse<T>(rawBody);
    } catch {
      result = undefined;
    }
  }

  return {
    status: response.status,
    headers: response.headers,
    actionRedirect,
    rawBody,
    result,
  };
}
