"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const label = isSignUp ? "Tạo tài khoản" : "Đăng nhập";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const data = new FormData(e.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    const name = String(data.get("name") ?? "").trim();

    if (!email || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu phải có tối thiểu 8 ký tự");
      setLoading(false);
      return;
    }

    if (isSignUp && !name) {
      setError("Vui lòng nhập họ và tên của bạn");
      setLoading(false);
      return;
    }

    try {
      const res = isSignUp
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });

      if (res.error) {
        setError(res.error.message || "Thông tin không chính xác. Vui lòng thử lại.");
      } else {
        router.push("/transactions");
        router.refresh();
      }
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng kiểm tra lại mạng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-4xl bg-white border border-zinc-200/80 rounded-lg overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
        {/* Cột trái: Form nhập liệu */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold text-[11px] tracking-wider">
                  FP
                </span>
                <span className="text-xs font-semibold text-zinc-900 tracking-tight">
                  Finance Planner
                </span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-xs text-zinc-600 hover:text-zinc-900 font-medium underline cursor-pointer"
              >
                {isSignUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}
              </button>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                {label}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                {isSignUp
                  ? "Điền thông tin để bắt đầu quản lý sổ thu chi cá nhân."
                  : "Nhập tài khoản để tiếp tục theo dõi dòng tiền."}
              </p>
            </div>

            {/* Thông báo lỗi */}
            {error && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2"
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
                    placeholder="Nguyễn Văn A"
                    className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
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
                  placeholder="ten@vidu.vn"
                  className="w-full h-9 px-3 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
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
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full h-9 px-3 pr-10 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                tabIndex={5}
                disabled={loading}
                className="w-full h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-medium text-xs transition cursor-pointer mt-1"
              >
                {loading ? "Đang xử lý..." : label}
              </button>
            </form>
          </div>

          {/* Social login */}
          <div className="pt-4 border-t border-zinc-100">
            <button
              type="button"
              tabIndex={6}
              onClick={() =>
                authClient.signIn.social({
                  provider: "github",
                  callbackURL: "/transactions",
                })
              }
              className="w-full h-9 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-800 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Đăng nhập với GitHub</span>
            </button>
          </div>
        </div>

        {/* Cột phải: Bố cục đặc trưng sản phẩm (Asymmetric brand side) */}
        <div className="hidden md:flex md:col-span-5 bg-zinc-50 border-l border-zinc-200/80 p-8 flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Quản lý tài chính cá nhân
            </span>
            <h2 className="text-xl font-bold text-zinc-900 leading-snug">
              Rõ ràng thu chi, <br />
              tiết kiệm có mục tiêu.
            </h2>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Theo dõi biến động dòng tiền, nắm bắt tỷ trọng chi phí và kiểm soát ngân sách mỗi ngày.
            </p>
          </div>

          {/* Minh họa trực quan của ứng dụng */}
          <div className="p-4 bg-white border border-zinc-200/80 rounded-lg space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">Số dư khả dụng</span>
              <span className="font-mono tabular-nums font-bold text-zinc-900">12.500.000 đ</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-600">Mục tiêu: Laptop mới</span>
                <span className="font-mono tabular-nums text-emerald-700 font-medium">75%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full w-3/4"></div>
              </div>
            </div>

            <p className="text-[11px] text-emerald-800 font-medium pt-1 border-t border-zinc-100">
              Còn dùng được ~4,2 tháng chi tiêu
            </p>
          </div>

          <div className="text-[11px] text-zinc-400">
            PHY10615 · HK1 2026–2027
          </div>
        </div>
      </div>
    </main>
  );
}
