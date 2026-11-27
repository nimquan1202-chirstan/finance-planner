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
    <header className="sticky top-0 z-40 bg-[#f8f7f4]/95 backdrop-blur-md border-b border-[#e6e4dc]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <span className="w-7 h-7 rounded-lg bg-[#183d2e] text-emerald-100 flex items-center justify-center font-bold text-xs tracking-wider shadow-xs group-hover:bg-[#204e3b] transition">
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
                  className={`relative px-3 py-1.5 rounded-[10px] text-xs transition select-none ${
                    active
                      ? "bg-[#eaf1ec] text-[#183d2e] font-semibold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-[#183d2e] after:rounded-full"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-black/5 font-normal"
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
                className="flex items-center gap-2 p-1 pl-2.5 rounded-[10px] border border-[#e2dfd5] bg-white/70 hover:bg-white hover:border-[#cfcbc0] transition cursor-pointer shadow-2xs"
              >
                <span className="text-zinc-700 text-xs font-medium max-w-[120px] truncate hidden sm:inline">
                  {userName}
                </span>
                <span className="w-6 h-6 rounded-[8px] bg-[#eaf1ec] border border-[#c8decb] text-[#183d2e] flex items-center justify-center text-[11px] font-bold">
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
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-[#e6e4dc] rounded-[10px] shadow-lg py-1.5 z-50 text-xs animate-in fade-in-50 zoom-in-95">
                  <div className="px-3.5 py-2.5 border-b border-zinc-100">
                    <p className="font-semibold text-zinc-900 truncate">{session.user.name}</p>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{session.user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 transition flex items-center gap-2 cursor-pointer mt-1 rounded-[8px]"
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
              className="px-3.5 py-1.5 bg-[#183d2e] text-white hover:bg-[#204e3b] rounded-[10px] text-xs font-medium transition shadow-2xs"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
