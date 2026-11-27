import type { Metadata } from "next";
import { AppLayoutWrapper } from "@/components/app-layout-wrapper";
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
      <body>
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
