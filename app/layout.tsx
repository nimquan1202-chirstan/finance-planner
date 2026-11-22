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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#fafaf9] text-zinc-900 antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-zinc-200 bg-white py-6 mt-12 text-center text-xs text-zinc-500">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>Finance Planner © 2026 – Đồ án cá nhân môn PHY10615</p>
            <p>Next.js 16.4 · Prisma ORM 7 · PostgreSQL Neon</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
