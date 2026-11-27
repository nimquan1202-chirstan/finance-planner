import { redirect } from "next/navigation";
import { isGithubOAuthConfigured } from "@/lib/auth";
import { getSession } from "@/lib/dal";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm githubEnabled={isGithubOAuthConfigured} />;
}
