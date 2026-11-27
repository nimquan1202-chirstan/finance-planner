"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "@/components/logo";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/wishlist");

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  const navLinks = [
    {
      href: "/dashboard",
      label: "Tổng quan",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: "/transactions",
      label: "Sổ giao dịch",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" />
        </svg>
      ),
    },
    {
      href: "/wishlist",
      label: "Danh sách muốn mua",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
  ];

  const userName = session?.user?.name || session?.user?.email || "Người dùng";
  const initial = userName.trim().charAt(0).toUpperCase();

  // 1. Giao diện Public (Landing page / Login page)
  if (!isAppRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8f7f4] text-[#1a1e1b] antialiased">
        <header className="sticky top-0 z-40 bg-[#f8f7f4]/95 border-b border-[#e6e4dc]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Logo size="md" href="/" />
            <div className="flex items-center gap-3">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="px-3.5 py-1.5 bg-[#183d2e] text-white hover:bg-[#204e3b] rounded-[10px] text-xs font-semibold transition shadow-2xs"
                >
                  Vào ứng dụng &rarr;
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 bg-[#183d2e] text-white hover:bg-[#204e3b] rounded-[10px] text-xs font-semibold transition shadow-2xs"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[#e6e4dc] bg-white py-6 mt-12 text-center text-xs text-zinc-500">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-medium text-zinc-600">Finance Planner © 2026 – Đồ án cá nhân môn PHY10615</p>
            <p className="text-zinc-400">Next.js 16.4 · Prisma ORM 7 · PostgreSQL Neon</p>
          </div>
        </footer>
      </div>
    );
  }

  // 2. Giao diện Sidebar chuẩn ứng dụng tài chính (FARE layout) cho Dashboard / Transactions / Wishlist
  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1a1e1b] antialiased flex flex-col">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-[#e6e4dc] z-40 p-5 justify-between shadow-[2px_0_12px_rgba(0,0,0,0.01)]">
        <div className="space-y-6">
          <Logo size="md" href="/dashboard" />

          {/* Navigation Links */}
          <nav className="space-y-1 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 block mb-2">
              Menu nghiệp vụ
            </span>
            {navLinks.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-xs font-medium transition ${
                    active
                      ? "bg-[#eaf1ec] text-[#183d2e] font-semibold shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70"
                  }`}
                >
                  <span className={active ? "text-[#183d2e]" : "text-zinc-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="pt-4 border-t border-[#edebe4] space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <span className="w-8 h-8 rounded-[9px] bg-[#eaf1ec] border border-[#c8decb] text-[#183d2e] flex items-center justify-center text-xs font-bold shrink-0">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-900 truncate">{userName}</p>
              <p className="text-[11px] text-zinc-400 truncate">{session?.user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[10px] border border-[#e2dfd5] bg-white hover:bg-rose-50 hover:border-rose-200 text-zinc-700 hover:text-rose-700 text-xs font-medium transition cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-[#e6e4dc] px-4 h-14 flex items-center justify-between">
        <Logo size="sm" href="/dashboard" />
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg border border-[#e2dfd5] text-zinc-700 hover:bg-zinc-100"
          aria-label="Mở menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 flex">
          <div className="w-64 max-w-[80%] bg-white h-full p-5 flex flex-col justify-between shadow-xl animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Logo size="sm" href="/dashboard" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <nav className="space-y-1">
                {navLinks.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-[10px] text-xs font-medium transition ${
                        active
                          ? "bg-[#eaf1ec] text-[#183d2e] font-semibold"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      <span className={active ? "text-[#183d2e]" : "text-zinc-400"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#edebe4] space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-[9px] bg-[#eaf1ec] text-[#183d2e] flex items-center justify-center text-xs font-bold">
                  {initial}
                </span>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold text-zinc-900 truncate">{userName}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{session?.user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 text-rose-600 text-xs font-medium rounded-lg border border-rose-200 hover:bg-rose-50"
              >
                Đăng xuất
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Main Content Area (Padded left for desktop sidebar) */}
      <div className="md:pl-64 flex-1 flex flex-col">
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[#e6e4dc] bg-white py-5 text-center text-xs text-zinc-500 mt-12">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-medium text-zinc-600">Finance Planner © 2026 – Đồ án cá nhân môn PHY10615</p>
            <p className="text-zinc-400">Next.js 16.4 · Prisma ORM 7 · PostgreSQL Neon</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
