import { prisma } from "@/lib/prisma";
import { formatVND } from "@/lib/finance";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [thu, chi, theo] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE" },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      _sum: { amount: true },
      where: { type: "EXPENSE" },
      orderBy: { _sum: { amount: "desc" } },
    }),
  ]);

  const totalIncome = thu._sum.amount ?? 0;
  const totalExpense = chi._sum.amount ?? 0;
  const balance = totalIncome - totalExpense;

  const categoryLabels: Record<string, string> = {
    FOOD: "Ăn uống",
    TRANSPORT: "Di chuyển",
    ENTERTAINMENT: "Giải trí",
    SHOPPING: "Mua sắm",
    BILLS: "Hoá đơn",
    SALARY: "Lương",
    INVESTMENT: "Đầu tư",
    OTHER: "Khác",
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Bảng điều khiển tài chính
            </h1>
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
              Chỉ đọc (FP1)
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi tổng quan số dư, thu chi và cơ cấu chi tiêu hiện tại
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/transactions"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm flex items-center gap-1.5"
          >
            <span>💳</span> Sổ giao dịch &rarr;
          </Link>
          <a
            href="/api/transactions?format=csv"
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition"
            download="transactions.csv"
          >
            Xuất CSV
          </a>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-blue-200 text-xs font-semibold uppercase tracking-wider">
              <span>Số dư hiện tại</span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-[11px]">Tổng thu − Tổng chi</span>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-3">
              {formatVND(balance)}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-blue-200">
            <span>Tình trạng quỹ:</span>
            <span className={`font-semibold px-2 py-0.5 rounded ${balance >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>
              {balance >= 0 ? "✓ An toàn tài chính" : "⚠ Thâm hụt ngân sách"}
            </span>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Tổng thu nhập</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="text-3xl font-bold text-emerald-600 tracking-tight mt-3">
              +{formatVND(totalIncome)}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-6 pt-4 border-t border-slate-100">
            Lương và các khoản thu nhập khác
          </p>
        </div>

        {/* Expense Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Tổng chi tiêu</span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            </div>
            <p className="text-3xl font-bold text-rose-600 tracking-tight mt-3">
              -{formatVND(totalExpense)}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-6 pt-4 border-t border-slate-100">
            Đã phân bổ vào {theo.length} danh mục
          </p>
        </div>
      </div>

      {/* Spending by Category Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Chi tiêu theo danh mục</h2>
            <p className="text-xs text-slate-500">
              Tỷ lệ phần trăm trên tổng chi tiêu tích lũy
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg">
            {theo.length} danh mục có phát sinh
          </span>
        </div>

        {/* Visual Progress Breakdown */}
        <div className="space-y-4">
          {theo.map((d) => {
            const amount = d._sum.amount ?? 0;
            const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
            const label = categoryLabels[d.category] || d.category;

            return (
              <div key={d.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{label}</span>
                    <span className="text-xs text-slate-400 font-mono">({d.category})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">{percentage}%</span>
                    <span className="font-bold text-slate-900">{formatVND(amount)}</span>
                  </div>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Screen Reader Table (Accessibility Requirement - Section A.3) */}
        <div className="pt-4 border-t border-slate-100">
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-medium hover:text-slate-800">
              Bảng số liệu chi tiết (Hỗ trợ trình đọc màn hình - a11y)
            </summary>
            <table className="w-full mt-3 border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2">Danh mục</th>
                  <th className="py-2 text-right">Số tiền</th>
                  <th className="py-2 text-right">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {theo.map((d) => (
                  <tr key={d.category} className="border-b border-slate-100">
                    <td className="py-1.5">{categoryLabels[d.category] || d.category}</td>
                    <td className="py-1.5 text-right font-mono">{formatVND(d._sum.amount ?? 0)}</td>
                    <td className="py-1.5 text-right">
                      {totalExpense > 0
                        ? `${Math.round(((d._sum.amount ?? 0) / totalExpense) * 100)}%`
                        : "0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      </div>
    </main>
  );
}
