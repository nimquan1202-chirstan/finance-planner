import { prisma } from "@/lib/prisma";
import {
  formatVND,
  getDateRange,
  wishlistProgress,
  calculate503020Rule,
  calculateStreak,
  calculateMonthEndForecast,
  calculateWishlistPace,
  calculateBudgetStatus,
} from "@/lib/finance";
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

function Money({
  amount,
  sign = "",
  className = "",
  unitClassName = "text-[0.78em] font-normal opacity-75 ml-0.5",
}: {
  amount: number;
  sign?: string;
  className?: string;
  unitClassName?: string;
}) {
  const formatted = Math.round(Math.abs(amount)).toLocaleString("vi-VN");
  return (
    <span className={`tabular-nums font-sans inline-flex items-baseline ${className}`}>
      <span>{sign}{formatted}</span>
      <span className={unitClassName}>đ</span>
    </span>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const thisMonthRange = getDateRange("this-month", now);
  const lastMonthRange = getDateRange("last-month", now);
  const currentMonthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
    allTxDates,
    categoryBudgets,
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
      _count: { id: true },
      where: { userId: user.id, type: "EXPENSE", date: thisMonthRange },
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
    prisma.transaction.findMany({
      where: { userId: user.id },
      select: { date: true },
      orderBy: { date: "desc" },
      take: 120,
    }),
    prisma.categoryBudget.findMany({
      where: { userId: user.id, month: currentMonthKey },
    }),
  ]);

  const allIncome = totalThu._sum.amount ?? 0;
  const allExpense = totalChi._sum.amount ?? 0;
  const balance = allIncome - allExpense;

  const currentMonthExpense = thisMonthChi._sum.amount ?? 0;
  const prevMonthExpense = lastMonthChi._sum.amount ?? 0;
  const currentMonthIncome = thisMonthThu._sum.amount ?? 0;
  const prevMonthIncome = lastMonthThu._sum.amount ?? 0;

  // Tính chuỗi ngày ghi chép liên tiếp (Streak)
  const streak = calculateStreak(
    allTxDates.map((t) => t.date),
    now,
  );

  // Dự báo chi tiêu & số dư cuối tháng
  const forecast = calculateMonthEndForecast(
    currentMonthIncome,
    currentMonthExpense,
    now,
  );

  // Phân tích quy tắc 50/30/20
  const expensesFor503020 = theo.map((item) => ({
    category: item.category,
    amount: item._sum.amount ?? 0,
  }));
  const rule503020 = calculate503020Rule(expensesFor503020, currentMonthIncome);

  // Map ngân sách danh mục
  const budgetMap = new Map<string, number>();
  for (const b of categoryBudgets) {
    budgetMap.set(b.category, b.limitAmount);
  }

  // Xử lý logic trạng thái số dư (không kết luận vội khi dữ liệu rỗng)
  const burnRate = currentMonthExpense > 0 ? currentMonthExpense : prevMonthExpense;
  let runwayText = "Chưa phát sinh thu chi trong tháng";

  if (allIncome === 0 && allExpense === 0) {
    runwayText = "Chưa có khoản nào, bắt đầu ghi khoản đầu tiên nhé";
  } else if (balance < 0) {
    runwayText = "Chi tiêu đang vượt thu nhập, cần chú ý kiểm soát";
  } else if (balance === 0) {
    runwayText = "Thu chi đang ở mức cân bằng";
  } else if (burnRate > 0) {
    const months = (balance / burnRate).toFixed(1).replace(".", ",");
    runwayText = `Duy trì được ~${months} tháng theo nhịp chi hiện tại`;
  } else {
    runwayText = "Số dư duy trì mức an toàn";
  }

  // So sánh chi tiêu với tháng trước
  let expenseCompText = "Chưa có dữ liệu đối chiếu";
  let expenseCompColor = "text-zinc-400";
  if (prevMonthExpense > 0 && currentMonthExpense > 0) {
    const diff = ((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100;
    const diffStr = Math.abs(diff).toFixed(1).replace(".", ",");
    if (diff > 0) {
      expenseCompText = `+${diffStr}% so với ${lastMonthName}`;
      expenseCompColor = "text-[#cf6b34] font-medium";
    } else if (diff < 0) {
      expenseCompText = `-${diffStr}% so với ${lastMonthName}`;
      expenseCompColor = "text-emerald-700 font-medium";
    } else {
      expenseCompText = `Ngang mức ${lastMonthName}`;
      expenseCompColor = "text-zinc-500";
    }
  }

  // So sánh thu nhập với tháng trước
  let incomeCompText = "Chưa có dữ liệu đối chiếu";
  let incomeCompColor = "text-zinc-400";
  if (prevMonthIncome > 0 && currentMonthIncome > 0) {
    const diff = ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100;
    const diffStr = Math.abs(diff).toFixed(1).replace(".", ",");
    if (diff > 0) {
      incomeCompText = `+${diffStr}% so với ${lastMonthName}`;
      incomeCompColor = "text-emerald-700 font-medium";
    } else if (diff < 0) {
      incomeCompText = `-${diffStr}% so với ${lastMonthName}`;
      incomeCompColor = "text-rose-600 font-medium";
    } else {
      incomeCompText = `Ngang mức ${lastMonthName}`;
      incomeCompColor = "text-zinc-500";
    }
  }

  const currentHour = now.getHours();
  const greeting =
    currentHour < 12
      ? "Chào buổi sáng"
      : currentHour < 18
      ? "Chào buổi chiều"
      : "Chào buổi tối";
  const userFirstName = user.name ? user.name.trim().split(" ").slice(-1)[0] : "bạn";

  // Donut chart math: chu vi bán kính r = 38 là 2 * PI * 38 ≈ 238.76
  const CIRCLE_CIRCUMFERENCE = 238.76;
  let accumulatedLength = 0;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-7">
      {/* Tiêu đề ngắn gọn và các nút tác vụ (Bỏ đường kẻ ngang) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#183d2e] flex items-center gap-1.5">
            <span>{greeting}, {userFirstName}</span>
            <span>👋</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight font-display mt-0.5">
            Tổng quan tài chính
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{currentMonthLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/transactions?format=csv"
            className="px-3.5 py-2 rounded-[10px] border border-[#e2dfd5] bg-white hover:bg-[#f3f1ea] text-zinc-700 font-medium text-xs transition shadow-2xs hover:shadow-xs"
            download="transactions.csv"
          >
            Xuất CSV
          </a>
          <Link
            href="/transactions"
            className="px-4 py-2 rounded-[10px] bg-[#183d2e] hover:bg-[#204e3b] text-white font-medium text-xs transition inline-flex items-center gap-1.5 shadow-xs hover:shadow-sm"
          >
            <span>+</span>
            <span>Ghi khoản mới</span>
          </Link>
        </div>
      </div>

      {/* Khối thống kê tổng quan bất đối xứng */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* Số dư hiện tại chiếm 7 cột, nổi bật với Hero card Pine Green */}
        <div className="md:col-span-7 rounded-2xl bg-gradient-to-br from-[#16382a] via-[#1a4030] to-[#122e22] text-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(22,56,42,0.12)] flex flex-col justify-between relative overflow-hidden group">
          {/* Họa tiết sparkline & ánh sáng mờ nhẹ nhàng tạo chiều sâu tự nhiên */}
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none"></div>
          <svg
            className="absolute right-0 bottom-0 w-52 h-28 text-emerald-300/10 pointer-events-none"
            viewBox="0 0 200 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M0,80 Q50,45 100,65 T200,25" />
          </svg>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200/80">
                Số dư khả dụng
              </span>
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-200 text-[11px] font-medium">
                  <span>🔥</span>
                  <span>Chuỗi {streak} ngày</span>
                </span>
              )}
            </div>

            <div className="mt-3">
              <Money
                amount={balance}
                sign={balance < 0 ? "-" : ""}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white font-sans"
                unitClassName="text-[0.6em] font-normal text-emerald-200/80 ml-1"
              />
            </div>

            {/* Khi chưa có giao dịch: hiển thị nút hành động nổi bật ngay trong card số dư */}
            {allIncome === 0 && allExpense === 0 && (
              <div className="mt-3.5">
                <Link
                  href="/transactions"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-white text-[#183d2e] font-semibold text-xs hover:bg-emerald-50 transition shadow-xs"
                >
                  <span>+</span>
                  <span>Ghi khoản thu chi đầu tiên</span>
                </Link>
              </div>
            )}
          </div>

          <div className="relative z-10 pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <p className="text-emerald-100/95 font-medium">{runwayText}</p>
            <span className="text-emerald-200/80 text-[11px] font-medium hidden sm:inline">Thời gian thực</span>
          </div>
        </div>

        {/* Tổng thu & Tổng chi chiếm 5 cột, dạng panel mở không đóng hộp card trắng */}
        <div className="md:col-span-5 bg-white/70 backdrop-blur-xs rounded-2xl border border-[#e6e4dc] p-5 sm:p-6 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="space-y-4">
            {/* Tổng thu */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                  Thu nhập tháng này
                </span>
                {prevMonthIncome > 0 && currentMonthIncome > 0 && (
                  <span className={`text-[11px] ${incomeCompColor}`}>{incomeCompText}</span>
                )}
              </div>
              <div className="mt-1">
                <Money
                  amount={allIncome}
                  sign={allIncome > 0 ? "+" : ""}
                  className={`text-2xl font-bold tracking-tight ${
                    allIncome > 0 ? "text-emerald-700" : "text-zinc-900"
                  }`}
                />
              </div>
            </div>

            {/* Tổng chi */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#cf6b34] inline-block"></span>
                  Chi tiêu tháng này
                </span>
                {prevMonthExpense > 0 && currentMonthExpense > 0 && (
                  <span className={`text-[11px] ${expenseCompColor}`}>{expenseCompText}</span>
                )}
              </div>
              <div className="mt-1">
                <Money
                  amount={allExpense}
                  sign={allExpense > 0 ? "-" : ""}
                  className={`text-2xl font-bold tracking-tight ${
                    allExpense > 0 ? "text-rose-700" : "text-zinc-900"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Chỉ hiển thị tỷ lệ tích lũy khi có thu nhập thực tế */}
          {allIncome > 0 ? (
            <div className="pt-3 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Tỷ lệ tích lũy thu nhập:</span>
              <span className="font-semibold text-zinc-800 tabular-nums font-sans">
                {Math.max(0, Math.round(((allIncome - allExpense) / allIncome) * 100))}%
              </span>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400">
              Ghi nhận thu chi để kích hoạt đối chiếu
            </div>
          )}
        </div>
      </div>

      {/* Thẻ Dự báo cuối tháng & Phân tích Quy tắc 50/30/20 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dự báo số dư cuối tháng */}
        <div className="bg-white rounded-2xl border border-[#e6e4dc] p-5 sm:p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 font-display">Dự báo cuối tháng</h2>
            {forecast.dailyAverageExpense > 0 && (
              <span className="text-[11px] text-zinc-500 tabular-nums font-sans">
                Chi bình quân: ~<Money amount={forecast.dailyAverageExpense} />/ngày
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Ước tính chi cả tháng:</span>
              <span className="font-semibold text-zinc-900 font-sans">
                {forecast.projectedExpense > 0 ? (
                  <>~<Money amount={forecast.projectedExpense} /></>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Dự kiến số dư cuối tháng:</span>
              <span
                className={`font-bold font-sans ${
                  forecast.projectedBalance >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                <Money amount={forecast.projectedBalance} />
              </span>
            </div>
          </div>

          <div>
            {forecast.status === "deficit" ? (
              <div className="p-3 bg-rose-50/80 border border-rose-200/60 rounded-[10px] text-rose-800 text-xs flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                <p className="font-medium">Tốc độ tiêu hơi nhanh, coi chừng hụt tiền cuối tháng nhé.</p>
              </div>
            ) : forecast.status === "warning" ? (
              <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-[10px] text-amber-900 text-xs flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                <p className="font-medium">Số dư cuối tháng dự kiến còn khá mỏng, nên tiết chế bớt các khoản mua sắm.</p>
              </div>
            ) : (
              <div className="p-3 bg-[#eaf1ec] border border-[#c8decb] text-[#183d2e] rounded-[10px] text-xs flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#183d2e] mt-1.5 shrink-0"></span>
                <p className="font-medium">Nhịp chi tiêu ổn, cuối tháng vẫn còn dư dôi.</p>
              </div>
            )}
          </div>
        </div>

        {/* Phân tích Quy tắc 50/30/20 */}
        <div className="bg-white rounded-2xl border border-[#e6e4dc] p-5 sm:p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 font-display">Quy tắc 50/30/20</h2>
            <span className="text-[11px] text-zinc-400">Tỷ lệ chi tiêu</span>
          </div>

          <div className="space-y-4 pt-1 text-xs">
            {/* Thiết yếu (50%) */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1.5">
                <span className="text-zinc-700 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1f4e3b] inline-block"></span>
                  Thiết yếu (Ăn uống, Nhà ở, Đi lại)
                </span>
                <span className="tabular-nums font-semibold text-zinc-900 font-sans">
                  <Money amount={rule503020.needs.amount} />
                  {currentMonthIncome > 0 && (
                    <span className="text-zinc-400 font-normal"> / <Money amount={currentMonthIncome * 0.5} /></span>
                  )}
                </span>
              </div>
              <div className="relative w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-[#1f4e3b]"
                  style={{ width: `${Math.min(100, rule503020.needs.percent)}%` }}
                ></div>
                {/* Vạch mốc 50% rõ nét */}
                <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/90 shadow-2xs rounded-full"></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                <span>Hiện tại: {rule503020.needs.percent}%</span>
                <span>Mục tiêu: 50%</span>
              </div>
            </div>

            {/* Mong muốn (30%) */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1.5">
                <span className="text-zinc-700 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#cf6b34] inline-block"></span>
                  Mong muốn (Mua sắm, Giải trí)
                </span>
                <span className="tabular-nums font-semibold text-zinc-900 font-sans">
                  <Money amount={rule503020.wants.amount} />
                  {currentMonthIncome > 0 && (
                    <span className="text-zinc-400 font-normal"> / <Money amount={currentMonthIncome * 0.3} /></span>
                  )}
                </span>
              </div>
              <div className="relative w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-[#cf6b34]"
                  style={{ width: `${Math.min(100, rule503020.wants.percent)}%` }}
                ></div>
                {/* Vạch mốc 30% rõ nét */}
                <div className="absolute top-0 bottom-0 left-[30%] w-1 bg-white/90 shadow-2xs rounded-full"></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                <span>Hiện tại: {rule503020.wants.percent}%</span>
                <span>Mục tiêu: 30%</span>
              </div>
            </div>

            {/* Tích lũy (20%) */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1.5">
                <span className="text-zinc-700 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2b6cb0] inline-block"></span>
                  Tích lũy & Đầu tư
                </span>
                <span className="tabular-nums font-semibold text-zinc-900 font-sans">
                  <Money amount={rule503020.savings.amount} />
                  {currentMonthIncome > 0 && (
                    <span className="text-zinc-400 font-normal"> / <Money amount={currentMonthIncome * 0.2} /></span>
                  )}
                </span>
              </div>
              <div className="relative w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2b6cb0] transition-all duration-300"
                  style={{ width: `${Math.min(100, rule503020.savings.percent)}%` }}
                ></div>
                {/* Vạch mốc 20% rõ nét */}
                <div className="absolute top-0 bottom-0 left-[20%] w-1 bg-white/90 shadow-2xs rounded-full"></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 mt-1">
                <span>Hiện tại: {rule503020.savings.percent}%</span>
                <span>Mục tiêu: 20%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cơ cấu chi tiêu & Bảng số liệu a11y thay thế */}
      <div className="bg-white rounded-2xl border border-[#e6e4dc] p-5 sm:p-6 space-y-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 font-display">Cơ cấu chi tiêu</h2>
          <span className="text-[11px] text-zinc-400">
            Theo danh mục · {currentMonthLabel}
          </span>
        </div>

        {theo.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#edf4ef] text-[#183d2e] flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-zinc-800 text-xs">Chưa phát sinh chi tiêu tháng này</p>
              <p className="text-zinc-500 text-[11px] mt-0.5">Ghi lại khoản chi đầu tiên để bắt đầu phân tích cơ cấu chi tiêu nhé.</p>
            </div>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#183d2e] text-white text-xs font-medium hover:bg-[#204e3b] transition shadow-2xs"
            >
              <span>+ Ghi khoản chi đầu tiên</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
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
                      if (currentMonthExpense <= 0 || amount <= 0) return null;
                      const segmentLength = (amount / currentMonthExpense) * CIRCLE_CIRCUMFERENCE;
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
                    <span className="text-[11px] text-zinc-400">Đã chi tháng này</span>
                    <span className="text-xs font-bold text-zinc-900 tabular-nums font-sans">
                      <Money amount={currentMonthExpense} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Danh sách thanh phân bổ trực quan */}
              <div className="md:col-span-7 space-y-2.5">
                {theo.map((item) => {
                  const amount = item._sum.amount ?? 0;
                  const percent = currentMonthExpense > 0 ? (amount / currentMonthExpense) * 100 : 0;
                  const config = CATEGORY_MAP[item.category] || CATEGORY_MAP.OTHER;
                  const budgetLimit = budgetMap.get(item.category);
                  const bStatus = budgetLimit
                    ? calculateBudgetStatus(amount, budgetLimit)
                    : null;

                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: config.hex }}
                          ></span>
                          <span className="text-zinc-800">{config.label}</span>
                          {bStatus?.status === "warning" && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-medium">
                              Cảnh báo 80%
                            </span>
                          )}
                          {bStatus?.status === "exceeded" && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-medium">
                              Vượt ngân sách
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 tabular-nums text-xs font-sans">
                          <span className="text-zinc-400 text-[11px]">
                            {percent.toFixed(1).replace(".", ",")}%
                          </span>
                          <span className="font-semibold text-zinc-900">
                            <Money amount={amount} />
                          </span>
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

            {/* Bảng số liệu chi tiết Accessibility (a11y) cho trình đọc màn hình */}
            <div className="pt-2">
              <h3 className="text-xs font-semibold text-zinc-700 mb-2 font-display">
                Bảng số liệu chi tiết (Hỗ trợ tiếp cận & Trợ năng)
              </h3>
              <div className="overflow-x-auto">
                <table
                  className="w-full text-left text-xs border border-[#e6e4dc] rounded-xl overflow-hidden"
                  aria-label="Bảng số liệu chi tiêu theo danh mục"
                >
                  <thead className="bg-[#faf9f6] border-b border-[#e6e4dc] text-zinc-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Danh mục</th>
                      <th className="py-2.5 px-3 text-right">Số lượng</th>
                      <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                      <th className="py-2.5 px-3 text-right">Tỷ trọng</th>
                      <th className="py-2.5 px-3 text-right">Ngân sách</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edebe4] text-zinc-800">
                    {theo.map((item) => {
                      const amount = item._sum.amount ?? 0;
                      const percent = currentMonthExpense > 0 ? (amount / currentMonthExpense) * 100 : 0;
                      const config = CATEGORY_MAP[item.category] || CATEGORY_MAP.OTHER;
                      const budgetLimit = budgetMap.get(item.category);

                      return (
                        <tr key={item.category} className="hover:bg-[#faf9f6]/70 transition">
                          <td className="py-2 px-3 flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: config.hex }}
                            ></span>
                            <span>{config.label}</span>
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-zinc-600 font-sans">
                            {item._count?.id ?? 1}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums font-semibold font-sans">
                            <Money amount={amount} />
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-zinc-600 font-sans">
                            {percent.toFixed(1).replace(".", ",")}%
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums text-zinc-600 font-sans">
                            {budgetLimit ? <Money amount={budgetLimit} /> : "Chưa đặt"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Danh sách muốn mua (Wishlist) kèm Deadline & Tốc độ tiết kiệm */}
      <div className="bg-white rounded-2xl border border-[#e6e4dc] p-5 sm:p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 font-display">Danh sách muốn mua</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">Tiến độ tích lũy theo số dư và hạn chót</p>
          </div>
          <Link
            href="/wishlist"
            className="text-xs text-[#183d2e] hover:text-[#204e3b] font-medium"
          >
            Xem tất cả &rarr;
          </Link>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#faf6ee] text-[#cf6b34] flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-zinc-800 text-xs">Chưa có món nào trong danh sách</p>
              <p className="text-zinc-500 text-[11px] mt-0.5">Thêm món đồ bạn ấp ủ để bắt đầu theo dõi tiến độ tích lũy nhé.</p>
            </div>
            <Link
              href="/wishlist"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#183d2e] text-white text-xs font-medium hover:bg-[#204e3b] transition shadow-2xs"
            >
              <span>+ Thêm món muốn mua</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {wishlistItems.map((item) => {
              const p = wishlistProgress(balance, item.price);
              const pInfo = PRIORITY_LABELS[item.priority] || PRIORITY_LABELS.MEDIUM;
              const pace = calculateWishlistPace(item.price, balance, item.targetDate, now);

              return (
                <div key={item.id} className="p-3.5 rounded-xl border border-[#e6e4dc] bg-[#faf9f6]/70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-zinc-900 truncate">{item.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${pInfo.badge}`}>
                      {pInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs tabular-nums font-sans">
                    <span className="text-zinc-500"><Money amount={item.price} /></span>
                    <span className={`font-bold ${p >= 100 ? "text-emerald-700" : "text-zinc-800"}`}>
                      {p}% {p >= 100 ? "· Đủ tiền" : ""}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-zinc-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        p >= 100 ? "bg-emerald-600" : "bg-[#183d2e]"
                      }`}
                      style={{ width: `${p}%` }}
                    ></div>
                  </div>

                  {pace.hasTargetDate && (
                    <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500 border-t border-[#edebe4]">
                      <span>
                        Hạn: {new Date(item.targetDate!).toLocaleDateString("vi-VN")}
                        {pace.daysRemaining > 0 && ` (còn ${pace.daysRemaining} ngày)`}
                      </span>
                      {p < 100 && pace.daysRemaining > 0 && (
                        <span className="font-medium text-[#183d2e]">
                          ~<Money amount={pace.neededPerDay} />/ngày
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Giao dịch gần đây */}
      <div className="bg-white rounded-2xl border border-[#e6e4dc] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="p-4 sm:p-5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 font-display">Giao dịch gần đây</h2>
          <Link
            href="/transactions"
            className="text-xs text-[#183d2e] hover:text-[#204e3b] font-medium"
          >
            Xem toàn bộ &rarr;
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 px-4 text-center text-xs text-zinc-500">
            Chưa có giao dịch nào được lưu. Bấm "Ghi khoản mới" để bắt đầu.
          </div>
        ) : (
          <ul className="divide-y divide-[#edebe4]">
            {recentTransactions.map((t) => {
              const isIncome = t.type === "INCOME";
              const catConfig = CATEGORY_MAP[t.category] || CATEGORY_MAP.OTHER;

              return (
                <li
                  key={t.id}
                  className="px-4 sm:px-5 py-3 hover:bg-[#faf9f6] transition flex items-center justify-between gap-4 text-xs"
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
                    className={`font-semibold tabular-nums whitespace-nowrap font-sans text-xs ${
                      isIncome ? "text-emerald-700" : "text-zinc-900"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    <Money amount={t.amount} />
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
