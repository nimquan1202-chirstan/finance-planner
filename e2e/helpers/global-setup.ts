import type { TestProject } from "vitest/node";
import { resolveE2eServer } from "./server";

export async function setup(project: TestProject): Promise<() => Promise<void>> {
  const server = await resolveE2eServer();
  project.provide("e2eBaseUrl", server.baseUrl);
  return async () => {
    await server.stop();
  };
}
