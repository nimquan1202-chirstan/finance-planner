import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export interface E2eServerHandle {
  baseUrl: string;
  stop: () => Promise<void>;
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, "../..");

function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const parsed = new URL(trimmed);
  return parsed.toString().replace(/\/+$/, "");
}

async function allocateFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close(() => reject(new Error("Failed to allocate ephemeral port")));
        return;
      }
      const { port } = addr;
      srv.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollServerReady(
  baseUrl: string,
  timeoutMs: number,
  getExitInfo?: () => { exited: boolean; code: number | null; signal: NodeJS.Signals | null; logs: string },
): Promise<void> {
  const probeUrl = `${baseUrl}/login`;
  const deadline = Date.now() + timeoutMs;
  let lastError = "no attempt made";

  while (Date.now() < deadline) {
    if (getExitInfo) {
      const exitInfo = getExitInfo();
      if (exitInfo.exited) {
        throw new Error(
          `Next.js server exited prematurely (code=${exitInfo.code}, signal=${exitInfo.signal}) before becoming ready at ${probeUrl}.\nLogs:\n${exitInfo.logs}`,
        );
      }
    }

    try {
      const res = await fetch(probeUrl, { redirect: "manual" });
      if (res.status === 200) {
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    await sleep(250);
  }

  const extraLogs = getExitInfo ? `\nServer logs:\n${getExitInfo().logs}` : "";
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for ${probeUrl} to return HTTP 200 (last error: ${lastError}).${extraLogs}`,
  );
}

async function stopChildProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    child.once("exit", finish);
    try {
      child.kill("SIGTERM");
    } catch {
      finish();
      return;
    }

    const forceTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
      }
      setTimeout(finish, 500);
    }, 3_000);
    forceTimer.unref();
  });
}

export interface ResolveE2eServerOptions {
  externalTimeoutMs?: number;
  startTimeoutMs?: number;
}

export async function resolveE2eServer(
  opts?: ResolveE2eServerOptions,
): Promise<E2eServerHandle> {
  const externalTimeoutMs = opts?.externalTimeoutMs ?? 15_000;
  const startTimeoutMs = opts?.startTimeoutMs ?? 30_000;
  const externalUrl = process.env.E2E_BASE_URL;
  if (externalUrl && externalUrl.trim().length > 0) {
    const baseUrl = normalizeBaseUrl(externalUrl);
    await pollServerReady(baseUrl, externalTimeoutMs);
    return {
      baseUrl,
      stop: async () => {},
    };
  }

  const serverMode = process.env.E2E_SERVER_MODE === "dev" ? "dev" : "start";
  if (serverMode !== "dev") {
    const buildIdPath = path.join(projectRoot, ".next", "BUILD_ID");
    if (!fs.existsSync(buildIdPath)) {
      throw new Error(
        `Missing ${buildIdPath}. Run npm run build first or set E2E_BASE_URL`,
      );
    }
  }

  const port = await allocateFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const require = createRequire(import.meta.url);
  const nextBin = require.resolve("next/dist/bin/next");

  const logLines: string[] = [];
  const pushLog = (chunk: Buffer) => {
    const text = chunk.toString("utf8");
    for (const line of text.split(/\r?\n/)) {
      if (line.length > 0) {
        logLines.push(line);
        if (logLines.length > 80) {
          logLines.shift();
        }
      }
    }
  };

  const child = spawn(
    process.execPath,
    [nextBin, serverMode, "-H", "127.0.0.1", "-p", String(port)],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        BETTER_AUTH_URL: baseUrl,
        BETTER_AUTH_TRUSTED_ORIGINS: `${baseUrl},http://localhost:${port}`,
      },
    },
  );

  let exited = false;
  let exitCode: number | null = null;
  let exitSignal: NodeJS.Signals | null = null;

  child.stdout?.on("data", pushLog);
  child.stderr?.on("data", pushLog);
  child.on("exit", (code, signal) => {
    exited = true;
    exitCode = code;
    exitSignal = signal;
  });
  child.on("error", (err) => {
    exited = true;
    logLines.push(`spawn error: ${err.message}`);
  });

  try {
    await pollServerReady(baseUrl, startTimeoutMs, () => ({
      exited,
      code: exitCode,
      signal: exitSignal,
      logs: logLines.join("\n"),
    }));
  } catch (err) {
    await stopChildProcess(child);
    throw err;
  }

  return {
    baseUrl,
    stop: () => stopChildProcess(child),
  };
}
