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
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#f8f7f4] text-[#1a1e1b] antialiased">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-[#e6e4dc] bg-white/70 py-6 mt-12 text-center text-xs text-zinc-500">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-medium text-zinc-600">Finance Planner © 2026 – Đồ án cá nhân môn PHY10615</p>
            <p className="text-zinc-400">Next.js 16.4 · Prisma ORM 7 · PostgreSQL Neon</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
