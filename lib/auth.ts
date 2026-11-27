import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

const githubClientId = process.env.GITHUB_CLIENT_ID?.trim();
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
const hasGithubOAuth =
  Boolean(githubClientId) &&
  Boolean(githubClientSecret) &&
  githubClientId !== "your-github-oauth-client-id" &&
  githubClientSecret !== "your-github-oauth-client-secret";

export const isGithubOAuthConfigured = hasGithubOAuth;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: { enabled: true },
  ...(hasGithubOAuth
    ? {
        socialProviders: {
          github: {
            clientId: githubClientId!,
            clientSecret: githubClientSecret!,
          },
        },
      }
    : {}),
  // nextCookies() để Server Action set cookie
  plugins: [nextCookies()],
});
