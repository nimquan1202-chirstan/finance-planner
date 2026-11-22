import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatVND } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [thu, chi, count] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE" },
    }),
    prisma.transaction.count(),
  ]);

  const totalIncome = thu._sum.amount ?? 0;
  const totalExpense = chi._sum.amount ?? 0;
  const balance = totalIncome - totalExpense;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Hero Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            <span>✨</span> Môn học PHY10615 · Phát triển ứng dụng web
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Finance Planner – Sổ tay tài chính cá nhân
          </h1>
          <p className="text-slate-600 text-base leading-relaxed">
            Ứng dụng full-stack giúp theo dõi thu chi, kiểm soát ngân sách theo danh mục,
            lọc dữ liệu bằng URL và chuẩn bị cho các mục tiêu tiết kiệm.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm"
            >
              Xem Dashboard tổng quan &rarr;
            </Link>
            <Link
              href="/transactions"
              className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition shadow-sm"
            >
              Quản lý sổ giao dịch &rarr;
            </Link>
            <a
              href="/api/transactions?format=csv"
              className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition"
            >
              Xuất CSV
            </a>
          </div>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Số dư hiện tại
          </span>
          <p className="text-2xl font-bold text-slate-900">{formatVND(balance)}</p>
          <p className="text-xs text-slate-500">Cập nhật tức thời từ Neon DB</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-1.5">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Tổng thu nhập
          </span>
          <p className="text-2xl font-bold text-emerald-700">+{formatVND(totalIncome)}</p>
          <p className="text-xs text-slate-500">Thu nhập tích lũy</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-1.5">
          <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
            Tổng chi tiêu
          </span>
          <p className="text-2xl font-bold text-rose-700">-{formatVND(totalExpense)}</p>
          <p className="text-xs text-slate-500">{count} giao dịch đã ghi nhận</p>
        </div>
      </div>

      {/* Progress & Specifications Overview */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Tiến độ đồ án cá nhân (Tuần 8 – 9)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Mốc FP1 (Tuần 8)</span>
              <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Hoàn thành
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Khởi tạo Prisma ORM 7, kết nối Neon PostgreSQL, seed 30 giao dịch mẫu và Dashboard chỉ đọc.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Mốc FP2 (Tuần 9)</span>
              <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Hoàn thành
              </span>
            </div>
            <p className="text-xs text-slate-600">
              CRUD giao dịch với Server Actions, validate Zod 4, bộ lọc URL searchParams, Route Handler xuất CSV và 10 unit test Vitest.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
