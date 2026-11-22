import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Planner - Quản lý tài chính cá nhân",
  description: "Đồ án cá nhân môn Phát triển ứng dụng web (PHY10615)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased">
        <Navbar />
        <div className="flex-1">
          {children}
        </div>
        <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>Finance Planner © 2026 – Đồ án cá nhân môn PHY10615</p>
            <p>Next.js 16.4 App Router · Prisma ORM 7 · Neon PostgreSQL</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
