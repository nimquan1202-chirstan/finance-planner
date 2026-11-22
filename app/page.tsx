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
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
            Finance Planner
          </h1>
          <p className="text-zinc-600 text-sm leading-relaxed max-w-xl">
            Sổ quản lý tài chính cá nhân đơn giản, trực quan và bảo mật. Theo dõi thu chi, kiểm soát cơ cấu ngân sách và lập kế hoạch chi tiêu thực tế.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition"
          >
            Vào bảng tổng quan
          </Link>
          <Link
            href="/transactions"
            className="px-4 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-medium text-xs transition"
          >
            Quản lý sổ giao dịch
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-zinc-200 space-y-1">
          <span className="text-xs font-medium text-zinc-500">Số dư hiện tại</span>
          <p className="text-xl font-bold text-zinc-900 font-mono">{formatVND(balance)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 space-y-1">
          <span className="text-xs font-medium text-zinc-500">Tổng thu tích lũy</span>
          <p className="text-xl font-bold text-zinc-900 font-mono">+{formatVND(totalIncome)}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 space-y-1">
          <span className="text-xs font-medium text-zinc-500">Tổng chi ({count} giao dịch)</span>
          <p className="text-xl font-bold text-zinc-900 font-mono">-{formatVND(totalExpense)}</p>
        </div>
      </div>
    </main>
  );
}
