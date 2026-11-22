import { prisma } from "@/lib/prisma";
import { formatVND, getDateRange } from "@/lib/finance";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; hex: string }
> = {
  FOOD: { label: "Ăn uống", color: "bg-amber-600", hex: "#d97706" },
  TRANSPORT: { label: "Di chuyển", color: "bg-sky-600", hex: "#0284c7" },
  ENTERTAINMENT: { label: "Giải trí", color: "bg-purple-600", hex: "#9333ea" },
  SHOPPING: { label: "Mua sắm", color: "bg-rose-600", hex: "#e11d48" },
  BILLS: { label: "Hoá đơn", color: "bg-emerald-700", hex: "#047857" },
  SALARY: { label: "Lương", color: "bg-teal-600", hex: "#0d9488" },
  INVESTMENT: { label: "Đầu tư", color: "bg-indigo-600", hex: "#4f46e5" },
  OTHER: { label: "Khác", color: "bg-zinc-500", hex: "#71717a" },
};

export default async function DashboardPage() {
  const now = new Date();
  const thisMonthRange = getDateRange("this-month", now);
  const lastMonthRange = getDateRange("last-month", now);

  const [
    thisMonthThu,
    thisMonthChi,
    lastMonthChi,
    lastMonthThu,
    totalThu,
    totalChi,
    theo,
    recentTransactions,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME", date: thisMonthRange },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE", date: thisMonthRange },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE", date: lastMonthRange },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME", date: lastMonthRange },
    }),
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
    prisma.transaction.findMany({
      take: 5,
      orderBy: { date: "desc" },
    }),
  ]);

  const allIncome = totalThu._sum.amount ?? 0;
  const allExpense = totalChi._sum.amount ?? 0;
  const balance = allIncome - allExpense;

  const currentMonthExpense = thisMonthChi._sum.amount ?? 0;
  const prevMonthExpense = lastMonthChi._sum.amount ?? 0;
  const currentMonthIncome = thisMonthThu._sum.amount ?? 0;
  const prevMonthIncome = lastMonthThu._sum.amount ?? 0;

  // Tính số tháng chi tiêu còn dùng được (Runway)
  const burnRate = currentMonthExpense > 0 ? currentMonthExpense : prevMonthExpense;
  let runwayText = "Chưa có đủ dữ liệu chi tiêu";
  if (balance <= 0) {
    runwayText = "Ngân sách đang âm hoặc bằng 0";
  } else if (burnRate > 0) {
    const months = (balance / burnRate).toFixed(1);
    runwayText = `Còn dùng được ~${months} tháng chi tiêu`;
  }

  // So sánh chi tiêu với tháng trước
  let expenseComp = "Chưa có dữ liệu đối chiếu";
  if (prevMonthExpense > 0) {
    const diff = Math.round(
      ((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100,
    );
    expenseComp =
      diff > 0
        ? `▲ ${diff}% so với tháng trước`
        : diff < 0
        ? `▼ ${Math.abs(diff)}% so với tháng trước`
        : `Bằng mức tháng trước`;
  }

  // So sánh thu nhập với tháng trước
  let incomeComp = "Chưa có dữ liệu đối chiếu";
  if (prevMonthIncome > 0) {
    const diff = Math.round(
      ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100,
    );
    incomeComp =
      diff > 0
        ? `▲ ${diff}% so với tháng trước`
        : diff < 0
        ? `▼ ${Math.abs(diff)}% so với tháng trước`
        : `Bằng mức tháng trước`;
  }

  // Donut chart math: chu vi bán kính r = 38 là 2 * PI * 38 ≈ 238.76
  const CIRCLE_CIRCUMFERENCE = 238.76;
  let accumulatedLength = 0;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Tổng quan tài chính
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Theo dõi dòng tiền, cơ cấu chi phí và dự báo ngân quỹ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/transactions"
            className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-medium text-xs transition"
          >
            Quản lý giao dịch
          </Link>
          <a
            href="/api/transactions?format=csv"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition"
            download="transactions.csv"
          >
            Xuất CSV
          </a>
        </div>
      </div>

      {/* 3 Thẻ KPI cùng phong cách phẳng, viền mảnh 1px, bo góc 10px */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Số dư */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500">Số dư hiện tại</span>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-mono">
              {formatVND(balance)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-emerald-800">
            <span className="font-medium text-zinc-600">{runwayText}</span>
          </div>
        </div>

        {/* Tổng thu */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500">Tổng thu nhập</span>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-mono">
              +{formatVND(allIncome)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 text-xs text-zinc-500">
            <span>{incomeComp}</span>
          </div>
        </div>

        {/* Tổng chi */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-500">Tổng chi tiêu</span>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-mono">
              -{formatVND(allExpense)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 text-xs text-zinc-500">
            <span>{expenseComp}</span>
          </div>
        </div>
      </div>

      {/* Biểu đồ Donut thật & Cơ cấu chi tiêu */}
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Cơ cấu chi tiêu theo danh mục</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Phân bổ tỷ trọng các khoản chi tích lũy
            </p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {theo.length} nhóm chi
          </span>
        </div>

        {theo.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            Chưa có giao dịch chi tiêu nào được ghi nhận.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* SVG Donut Chart thực tế */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#f4f4f5"
                    strokeWidth="11"
                  />
                  {theo.map((item) => {
                    const amount = item._sum.amount ?? 0;
                    if (allExpense <= 0 || amount <= 0) return null;
                    const segmentLength = (amount / allExpense) * CIRCLE_CIRCUMFERENCE;
                    const dashoffset = -accumulatedLength;
                    accumulatedLength += segmentLength;
                    const config = CATEGORY_MAP[item.category] || CATEGORY_MAP.OTHER;

                    return (
                      <circle
                        key={item.category}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={config.hex}
                        strokeWidth="11"
                        strokeDasharray={`${segmentLength} ${CIRCLE_CIRCUMFERENCE}`}
                        strokeDashoffset={dashoffset}
                        className="transition-all duration-300"
                      />
                    );
                  })}
                </svg>
                {/* Trung tâm Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-medium text-zinc-400">Tổng chi</span>
                  <span className="text-xs font-bold text-zinc-900 font-mono">
                    {formatVND(allExpense)}
                  </span>
                </div>
              </div>
            </div>

            {/* Chi tiết từng danh mục với thanh màu riêng biệt */}
            <div className="md:col-span-7 space-y-3.5">
              {theo.map((d) => {
                const amount = d._sum.amount ?? 0;
                const percentage =
                  allExpense > 0 ? Math.round((amount / allExpense) * 100) : 0;
                const config = CATEGORY_MAP[d.category] || CATEGORY_MAP.OTHER;

                return (
                  <div key={d.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs"
                          style={{ backgroundColor: config.hex }}
                        ></span>
                        <span className="font-medium text-zinc-800">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-zinc-400">{percentage}%</span>
                        <span className="font-semibold text-zinc-900">
                          {formatVND(amount)}
                        </span>
                      </div>
                    </div>
                    {/* Thanh tiến độ có màu riêng tương ứng từng danh mục */}
                    <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: config.hex,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Danh sách giao dịch gần đây */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900">Giao dịch gần đây</h2>
          <Link
            href="/transactions"
            className="text-xs text-zinc-600 hover:text-zinc-900 font-medium"
          >
            Xem toàn bộ &rarr;
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            Chưa có giao dịch nào được lưu.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {recentTransactions.map((t) => {
              const isIncome = t.type === "INCOME";
              const catConfig = CATEGORY_MAP[t.category] || CATEGORY_MAP.OTHER;

              return (
                <li
                  key={t.id}
                  className="px-4 py-3 hover:bg-zinc-50/70 transition flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700">{catConfig.label}</span>
                      <span className="text-zinc-400 text-[11px]">
                        {new Date(t.date).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <p className="text-zinc-900 font-medium truncate">{t.description}</p>
                  </div>

                  <span
                    className={`font-semibold font-mono whitespace-nowrap ${
                      isIncome ? "text-emerald-700" : "text-zinc-900"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatVND(t.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
