"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const label = isSignUp ? "Đăng ký tài khoản" : "Đăng nhập";

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
        setError(res.error.message || "Đăng nhập không thành công. Vui lòng thử lại.");
      } else {
        router.push("/transactions");
        router.refresh();
      }
    } catch {
      setError("Đã xảy ra lỗi kết nối. Vui lòng kiểm tra lại mạng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <Link href="/" className="inline-block text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Finance Planner
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            {label}
          </h1>
          <p className="text-xs text-zinc-500">
            {isSignUp
              ? "Tạo tài khoản cá nhân để bắt đầu quản lý tài chính"
              : "Chào mừng bạn quay lại, nhập thông tin để tiếp tục"}
          </p>
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div
            role="alert"
            className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium"
          >
            ⚠️ {error}
          </div>
        )}

        {/* Form Đăng nhập / Đăng ký */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isSignUp && (
            <div className="space-y-1">
              <label className="font-medium text-zinc-700 block">Họ và tên</label>
              <input
                name="name"
                type="text"
                required
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="font-medium text-zinc-700 block">Địa chỉ Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="ten@vidu.vn"
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700 block">Mật khẩu</label>
            <input
              name="password"
              type="password"
              required
              placeholder="Tối thiểu 8 ký tự"
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-medium text-xs transition cursor-pointer"
          >
            {loading ? "Đang xử lý..." : label}
          </button>
        </form>

        {/* Nút đăng nhập với GitHub */}
        <div className="space-y-3 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={() =>
              authClient.signIn.social({
                provider: "github",
                callbackURL: "/transactions",
              })
            }
            className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-800 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
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

          {/* Chuyển đổi Đăng nhập / Đăng ký */}
          <div className="text-center text-xs">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-zinc-600 hover:text-zinc-900 font-medium underline cursor-pointer"
            >
              {isSignUp ? "Đã có tài khoản? Đăng nhập ngay" : "Chưa có tài khoản? Tạo tài khoản mới"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
