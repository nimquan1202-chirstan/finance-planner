"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useState, useRef, useEffect } from "react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: "/dashboard", label: "Tổng quan" },
    { href: "/transactions", label: "Sổ giao dịch" },
    { href: "/wishlist", label: "Danh sách muốn mua" },
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userName = session?.user?.name || session?.user?.email || "Người dùng";
  const initial = userName.trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-[#fafaf9]/95 backdrop-blur-xs border-b border-zinc-200/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <span className="w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              FP
            </span>
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
                  className={`px-3 py-1.5 rounded-md text-xs transition select-none ${
                    active
                      ? "bg-zinc-200/70 text-zinc-900 font-medium"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 font-normal"
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
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-lg border border-zinc-200/80 hover:bg-zinc-50 transition cursor-pointer"
              >
                <span className="text-zinc-700 text-xs font-medium max-w-[120px] truncate hidden sm:inline">
                  {userName}
                </span>
                <span className="w-6 h-6 rounded-md bg-zinc-800 text-white flex items-center justify-center text-[11px] font-semibold">
                  {initial}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg py-1 z-50 text-xs animate-in fade-in-50 zoom-in-95">
                  <div className="px-3 py-2 border-b border-zinc-100">
                    <p className="font-semibold text-zinc-800 truncate">{session.user.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate">{session.user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 transition flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-md text-xs font-medium transition"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
