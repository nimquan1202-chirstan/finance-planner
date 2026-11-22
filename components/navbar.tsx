"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Tổng quan" },
    { href: "/transactions", label: "Sổ giao dịch" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#fafaf9]/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              FP
            </div>
            <span className="font-semibold text-zinc-900 text-sm tracking-tight">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
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

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="hidden sm:inline">demo@phy10615.vn</span>
        </div>
      </div>
    </header>
  );
}
