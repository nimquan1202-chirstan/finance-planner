import { prisma } from "@/lib/prisma";
import { formatVND, getDateRange, wishlistProgress } from "@/lib/finance";
import { requireUser } from "@/lib/dal";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; hex: string }
> = {
  BILLS: { label: "Hoá đơn & Nhà ở", color: "bg-emerald-700", hex: "#047857" },
  FOOD: { label: "Ăn uống", color: "bg-amber-600", hex: "#d97706" },
  TRANSPORT: { label: "Di chuyển", color: "bg-sky-600", hex: "#0284c7" },
  SHOPPING: { label: "Mua sắm", color: "bg-rose-600", hex: "#e11d48" },
  ENTERTAINMENT: { label: "Giải trí", color: "bg-purple-600", hex: "#9333ea" },
  INVESTMENT: { label: "Đầu tư tích lũy", color: "bg-indigo-600", hex: "#4f46e5" },
  SALARY: { label: "Lương & Thu nhập", color: "bg-teal-600", hex: "#0d9488" },
  OTHER: { label: "Chi tiêu khác", color: "bg-zinc-500", hex: "#71717a" },
};

const PRIORITY_LABELS: Record<string, { label: string; badge: string }> = {
  LOW: { label: "Thấp", badge: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  MEDIUM: { label: "Vừa", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  HIGH: { label: "Cao", badge: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const thisMonthRange = getDateRange("this-month", now);
  const lastMonthRange = getDateRange("last-month", now);
  const currentMonthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  const lastMonthName = now.getMonth() === 0 ? "tháng 12" : `tháng ${now.getMonth()}`;

  const [
    thisMonthThu,
    thisMonthChi,
    lastMonthChi,
    lastMonthThu,
    totalThu,
    totalChi,
    theo,
    recentTransactions,
    wishlistItems,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "INCOME", date: thisMonthRange },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "EXPENSE", date: thisMonthRange },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "EXPENSE", date: lastMonthRange },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "INCOME", date: lastMonthRange },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "INCOME" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "EXPENSE" },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      _sum: { amount: true },
      where: { userId: user.id, type: "EXPENSE" },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      take: 6,
      orderBy: { date: "desc" },
    }),
    prisma.wishlistItem.findMany({
      where: { userId: user.id },
      take: 4,
      orderBy: { priority: "desc" },
    }),
  ]);

  const allIncome = totalThu._sum.amount ?? 0;
  const allExpense = totalChi._sum.amount ?? 0;
  const balance = allIncome - allExpense;

  const currentMonthExpense = thisMonthChi._sum.amount ?? 0;
  const prevMonthExpense = lastMonthChi._sum.amount ?? 0;
  const currentMonthIncome = thisMonthThu._sum.amount ?? 0;
  const prevMonthIncome = lastMonthThu._sum.amount ?? 0;

  // Xử lý logic trạng thái số dư (không kết luận vội khi dữ liệu rỗng)
  const burnRate = currentMonthExpense > 0 ? currentMonthExpense : prevMonthExpense;
  let runwayText = "Chưa phát sinh thu chi";
  let runwayColor = "text-zinc-500";

  if (allIncome === 0 && allExpense === 0) {
    runwayText = "Chưa có giao dịch ghi nhận";
    runwayColor = "text-zinc-400";
  } else if (balance < 0) {
    runwayText = "Thâm hụt chi tiêu";
    runwayColor = "text-rose-600 font-medium";
  } else if (balance === 0) {
    runwayText = "Cân bằng thu chi";
    runwayColor = "text-zinc-600";
  } else if (burnRate > 0) {
    const months = (balance / burnRate).toFixed(1).replace(".", ",");
    runwayText = `Còn dùng được ~${months} tháng chi tiêu`;
    runwayColor = "text-emerald-700 font-medium";
  } else {
    runwayText = "Số dư dương an toàn";
    runwayColor = "text-emerald-700 font-medium";
  }

  // So sánh chi tiêu với tháng trước (chỉ hiển thị khi có dữ liệu thật)
  let expenseCompText = "Tháng đầu tiên theo dõi";
  let expenseCompColor = "text-zinc-400";
  if (prevMonthExpense > 0 && currentMonthExpense > 0) {
    const diff = ((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100;
    const diffStr = Math.abs(diff).toFixed(1).replace(".", ",");
    if (diff > 0) {
      expenseCompText = `▲ +${diffStr}% so với ${lastMonthName}`;
      expenseCompColor = "text-rose-600 font-medium";
    } else if (diff < 0) {
      expenseCompText = `▼ -${diffStr}% so với ${lastMonthName}`;
      expenseCompColor = "text-emerald-700 font-medium";
    } else {
      expenseCompText = `Bằng mức ${lastMonthName}`;
      expenseCompColor = "text-zinc-500";
    }
  }

  // So sánh thu nhập với tháng trước
  let incomeCompText = "Tháng đầu tiên theo dõi";
  let incomeCompColor = "text-zinc-400";
  if (prevMonthIncome > 0 && currentMonthIncome > 0) {
    const diff = ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100;
    const diffStr = Math.abs(diff).toFixed(1).replace(".", ",");
    if (diff > 0) {
      incomeCompText = `▲ +${diffStr}% so với ${lastMonthName}`;
      incomeCompColor = "text-emerald-700 font-medium";
    } else if (diff < 0) {
      incomeCompText = `▼ -${diffStr}% so với ${lastMonthName}`;
      incomeCompColor = "text-rose-600 font-medium";
    } else {
      incomeCompText = `Bằng mức ${lastMonthName}`;
      incomeCompColor = "text-zinc-500";
    }
  }

  // Donut chart math: chu vi bán kính r = 38 là 2 * PI * 38 ≈ 238.76
  const CIRCLE_CIRCUMFERENCE = 238.76;
  let accumulatedLength = 0;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-7 space-y-6">
      {/* Tiêu đề ngắn gọn: một tiêu đề lớn, phụ đề tháng, nút hành động chính */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Tổng quan tài chính
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{currentMonthLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/transactions?format=csv"
            className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium text-xs transition"
            download="transactions.csv"
          >
            Xuất CSV
          </a>
          <Link
            href="/transactions"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition inline-flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Ghi khoản mới</span>
          </Link>
        </div>
      </div>

      {/* 3 Thẻ thống kê: Bo góc 8px, viền mảnh 1px, số dư nổi bật */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        {/* Số dư chiếm 2 cột */}
        <div className="md:col-span-2 bg-white rounded-lg border border-zinc-200/80 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs text-zinc-500 block">Số dư hiện tại</span>
            <p className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight font-mono tabular-nums mt-1 select-all">
              {formatVND(balance)}
            </p>
          </div>
          <p className={`text-xs mt-3.5 ${runwayColor}`}>{runwayText}</p>
        </div>

        {/* Thu nhập chiếm 1 cột */}
        <div className="md:col-span-1 bg-white rounded-lg border border-zinc-200/80 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs text-zinc-500 block">Tổng thu</span>
            <p
              className={`text-xl font-bold tracking-tight font-mono tabular-nums mt-1 ${
                allIncome > 0 ? "text-emerald-700" : "text-zinc-700"
              }`}
            >
              {allIncome > 0 ? `+${formatVND(allIncome)}` : formatVND(0)}
            </p>
          </div>
          <p className={`text-xs mt-3.5 ${incomeCompColor}`}>{incomeCompText}</p>
        </div>

        {/* Chi tiêu chiếm 1 cột */}
        <div className="md:col-span-1 bg-white rounded-lg border border-zinc-200/80 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs text-zinc-500 block">Tổng chi</span>
            <p
              className={`text-xl font-bold tracking-tight font-mono tabular-nums mt-1 ${
                allExpense > 0 ? "text-rose-700" : "text-zinc-700"
              }`}
            >
              {allExpense > 0 ? `-${formatVND(allExpense)}` : formatVND(0)}
            </p>
          </div>
          <p className={`text-xs mt-3.5 ${expenseCompColor}`}>{expenseCompText}</p>
        </div>
      </div>

      {/* Cơ cấu chi tiêu: Không để ô trắng to khi trống, thu gọn và có action trực tiếp */}
      <div className="bg-white rounded-lg border border-zinc-200/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
          <h2 className="text-sm font-bold text-zinc-900">Cơ cấu chi tiêu</h2>
          <span className="text-[11px] text-zinc-400">Theo danh mục</span>
        </div>

        {theo.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs space-y-2">
            <p className="text-zinc-500">Chưa có chi tiêu tháng này. Ghi lại khoản chi đầu tiên để xem phân bổ.</p>
            <Link
              href="/transactions"
              className="inline-block px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition"
            >
              + Ghi khoản chi đầu tiên
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-1">
            {/* SVG Donut Chart */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44">
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

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] text-zinc-400">Đã chi</span>
                  <span className="text-xs font-bold text-zinc-900 font-mono tabular-nums">
                    {formatVND(allExpense)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bảng phân bổ danh mục */}
            <div className="md:col-span-7 space-y-2.5">
              {theo.map((item) => {
                const amount = item._sum.amount ?? 0;
                const percent = allExpense > 0 ? (amount / allExpense) * 100 : 0;
                const config = CATEGORY_MAP[item.category] || CATEGORY_MAP.OTHER;

                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: config.hex }}
                        ></span>
                        <span className="text-zinc-800">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
                        <span className="text-zinc-400 text-[11px]">
                          {percent.toFixed(1).replace(".", ",")}%
                        </span>
                        <span className="font-semibold text-zinc-900">{formatVND(amount)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${percent}%`,
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

      {/* Danh sách muốn mua trên Dashboard */}
      <div className="bg-white rounded-lg border border-zinc-200/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Danh sách muốn mua</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Tiến độ tiết kiệm theo số dư hiện tại</p>
          </div>
          <Link
            href="/wishlist"
            className="text-xs text-zinc-600 hover:text-zinc-900 font-medium"
          >
            Xem tất cả &rarr;
          </Link>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="py-6 px-4 text-center text-xs space-y-2">
            <p className="text-zinc-500">Chưa có món nào. Thêm món đầu tiên đi.</p>
            <Link
              href="/wishlist"
              className="inline-block px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition"
            >
              + Thêm món muốn mua
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {wishlistItems.map((item) => {
              const p = wishlistProgress(balance, item.price);
              const pInfo = PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.MEDIUM;

              return (
                <div key={item.id} className="p-3.5 rounded-lg border border-zinc-200/70 bg-zinc-50/50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-xs text-zinc-900 truncate">{item.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${pInfo.badge}`}>
                      {pInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="text-zinc-500">{formatVND(item.price)}</span>
                    <span className={`font-bold ${p >= 100 ? "text-emerald-700" : "text-zinc-800"}`}>
                      {p}% {p >= 100 ? "· Đủ tiền" : ""}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        p >= 100 ? "bg-emerald-600" : "bg-zinc-800"
                      }`}
                      style={{ width: `${p}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Giao dịch gần đây */}
      <div className="bg-white rounded-lg border border-zinc-200/80 overflow-hidden">
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
          <div className="py-6 px-4 text-center text-xs text-zinc-500">
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
                    className={`font-semibold font-mono tabular-nums whitespace-nowrap ${
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
