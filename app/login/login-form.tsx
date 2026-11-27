"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Logo } from "@/components/logo";

interface LoginFormProps {
  githubEnabled: boolean;
}

export function LoginForm({ githubEnabled }: LoginFormProps) {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const label = isSignUp ? "Tạo tài khoản" : "Đăng nhập";

  function handleFillDemo() {
    setIsSignUp(false);
    setEmail("demo@phy10615.vn");
    setPassword("Demo@123456");
    setError("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu phải có tối thiểu 8 ký tự");
      setLoading(false);
      return;
    }

    if (isSignUp && !trimmedName) {
      setError("Vui lòng nhập họ và tên của bạn");
      setLoading(false);
      return;
    }

    try {
      const res = isSignUp
        ? await authClient.signUp.email({
            email: trimmedEmail,
            password,
            name: trimmedName,
          })
        : await authClient.signIn.email({
            email: trimmedEmail,
            password,
          });

      if (res.error) {
        setError(
          res.error.message || "Thông tin không chính xác. Vui lòng thử lại.",
        );
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng kiểm tra lại mạng.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGithubSignIn() {
    if (!githubEnabled) return;
    setError("");
    setGithubLoading(true);
    try {
      const res = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard",
      });
      if (res?.error) {
        setError(
          res.error.message || "Không thể đăng nhập bằng GitHub. Vui lòng thử lại.",
        );
        setGithubLoading(false);
      }
    } catch {
      setError("Không thể kết nối GitHub OAuth. Vui lòng thử lại.");
      setGithubLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-4xl bg-white border border-[#e6e4dc] rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(24,61,46,0.06)] grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Cột trái: Form nhập liệu */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Logo size="md" href="/" />

              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-xs text-[#183d2e] hover:text-[#204e3b] font-medium underline cursor-pointer"
              >
                {isSignUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}
              </button>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight font-display">
                {label}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                {isSignUp
                  ? "Điền thông tin để bắt đầu quản lý sổ thu chi cá nhân."
                  : "Nhập tài khoản để tiếp tục theo dõi dòng tiền."}
              </p>
            </div>

            {!isSignUp && (
              <div className="p-3 bg-[#f8f7f4] border border-[#e6e4dc] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-zinc-800">Tài khoản dùng thử (Demo)</p>
                  <p className="text-[11px] text-zinc-600 font-sans tabular-nums">
                    demo@phy10615.vn / Demo@123456
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="px-3 py-1.5 rounded-lg border border-[#c8decb] bg-[#edf4ef] hover:bg-[#e1ece4] text-[#183d2e] font-semibold text-[11px] transition cursor-pointer"
                >
                  Điền nhanh
                </button>
              </div>
            )}

            {/* Thông báo lỗi */}
            {error && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2"
              >
                <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {isSignUp && (
                <div className="space-y-1">
                  <label className="font-medium text-zinc-700 block">Họ và tên</label>
                  <input
                    name="name"
                    type="text"
                    required
                    tabIndex={1}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full h-9 px-3 border border-[#e2dfd5] rounded-xl text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#183d2e] focus:ring-1 focus:ring-[#183d2e] transition"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-medium text-zinc-700 block">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  tabIndex={2}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@vidu.vn"
                  className="w-full h-9 px-3 border border-[#e2dfd5] rounded-xl text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#183d2e] focus:ring-1 focus:ring-[#183d2e] transition"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-zinc-700 block">Mật khẩu</label>
                  <button
                    type="button"
                    tabIndex={4}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-800 cursor-pointer"
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    tabIndex={3}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full h-9 px-3 pr-10 border border-[#e2dfd5] rounded-xl text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#183d2e] focus:ring-1 focus:ring-[#183d2e] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                tabIndex={5}
                disabled={loading || githubLoading}
                className="w-full h-10 rounded-xl bg-[#183d2e] hover:bg-[#204e3b] disabled:bg-zinc-400 text-white font-semibold text-xs transition cursor-pointer mt-1 shadow-xs"
              >
                {loading ? "Đang xử lý..." : label}
              </button>
            </form>
          </div>

          {/* Social login (conditional) */}
          {githubEnabled && (
            <div className="pt-4 border-t border-[#edebe4]">
              <button
                type="button"
                tabIndex={6}
                disabled={loading || githubLoading}
                onClick={handleGithubSignIn}
                className="w-full h-9 rounded-xl border border-[#e2dfd5] hover:bg-zinc-50 disabled:opacity-60 text-zinc-800 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>{githubLoading ? "Đang chuyển hướng..." : "Đăng nhập với GitHub"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Cột phải: Thông tin tinh giản và tài khoản demo */}
        <div className="hidden md:flex md:col-span-5 bg-[#183d2e] text-white p-8 flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[11px] font-semibold tracking-wider text-emerald-300 uppercase">
              Hệ thống tài chính cá nhân
            </span>
            <h2 className="text-xl font-bold text-white font-display leading-snug">
              Kiểm soát dòng tiền & Mục tiêu tiết kiệm
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed">
              Ứng dụng quản lý tài chính xây dựng trên Next.js 16 App Router, Prisma ORM 7 và Better Auth.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-emerald-100/90">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Ghi chép thu chi, phân loại và xuất CSV an toàn</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Ngân sách theo tỷ lệ tùy chỉnh (50/30/20, 60/20/20...)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Thuật toán đánh giá khả năng mua theo hạn chót thực tế</span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 bg-[#122e22] border border-[#265e47] rounded-[10px] space-y-1 text-xs">
            <p className="font-semibold text-emerald-200">Tài khoản nghiệm thu Demo:</p>
            <p className="font-sans text-[11px] text-emerald-100/90 tabular-nums">
              demo@phy10615.vn / Demo@123456
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
