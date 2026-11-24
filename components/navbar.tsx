"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const navLinks = [
    { href: "/dashboard", label: "Tổng quan" },
    { href: "/transactions", label: "Sổ giao dịch" },
    { href: "/wishlist", label: "Mục tiêu tiết kiệm" },
  ];

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

  return (
    <header className="sticky top-0 z-50 bg-[#fafaf9]/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              FP
            </div>
            <span className="font-semibold text-zinc-900 text-sm tracking-tight hidden sm:inline">
              Finance Planner
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    active
                      ? "bg-zinc-200/70 text-zinc-900 font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {session?.user ? (
            <div className="flex items-center gap-3">
              <span className="text-zinc-700 font-medium hidden md:inline truncate max-w-[140px]">
                {session.user.name || session.user.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:text-rose-600 hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 rounded-md transition cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg text-xs font-medium transition"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
