import { prisma } from "@/lib/prisma";
import { getDateRange, formatVND } from "@/lib/finance";
import { transactionFilterSchema } from "@/lib/validation";
import { requireUser } from "@/lib/dal";
import { TransactionForm } from "./transaction-form";
import { TransactionFilters } from "./transaction-filters";
import { TransactionList } from "./transaction-list";
import type { Prisma } from "@/generated/prisma/client";

const CATEGORY_NAMES: Record<string, string> = {
  FOOD: "Ăn uống",
  TRANSPORT: "Di chuyển",
  ENTERTAINMENT: "Giải trí",
  SHOPPING: "Mua sắm",
  BILLS: "Hoá đơn & Nhà ở",
  SALARY: "Lương",
  INVESTMENT: "Đầu tư",
  OTHER: "Khác",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const resolvedParams = await searchParams;
  const filter = transactionFilterSchema
    .catch({ range: "this-month", sort: "desc" })
    .parse(resolvedParams);

  const where: Prisma.TransactionWhereInput = {
    userId: user.id,
    date: getDateRange(filter.range),
  };

  if (filter.type) {
    where.type = filter.type;
  }

  if (filter.category) {
    where.category = filter.category;
  }

  if (filter.q) {
    where.description = {
      contains: filter.q,
      mode: "insensitive",
    };
  }

  const rows = await prisma.transaction.findMany({
    where,
    orderBy: { date: filter.sort },
  });

  const totalIncome = rows
    .filter((r) => r.type === "INCOME")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = rows
    .filter((r) => r.type === "EXPENSE")
    .reduce((sum, r) => sum + r.amount, 0);

  const netCashflow = totalIncome - totalExpense;

  const expenseByCategory: Record<string, number> = {};
  for (const r of rows) {
    if (r.type === "EXPENSE") {
      expenseByCategory[r.category] = (expenseByCategory[r.category] || 0) + r.amount;
    }
  }

  let topCategory = "";
  let topCategoryAmount = 0;
  for (const [cat, amt] of Object.entries(expenseByCategory)) {
    if (amt > topCategoryAmount) {
      topCategory = cat;
      topCategoryAmount = amt;
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-7 space-y-6">
      {/* Header và Thống kê nâng cao */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight font-display">
            Sổ giao dịch
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Ghi nhận và phân tích chi tiết các khoản thu chi
          </p>
        </div>

        {/* Thống kê dòng tiền nâng cao trong kỳ lọc */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-white border border-[#e6e4dc] rounded-xl p-3 space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Thu nhập kỳ này
            </span>
            <p className="text-sm sm:text-base font-bold tabular-nums text-emerald-700 font-sans">
              +{formatVND(totalIncome)}
            </p>
          </div>

          <div className="bg-white border border-[#e6e4dc] rounded-xl p-3 space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#cf6b34]"></span>
              Chi tiêu kỳ này
            </span>
            <p className="text-sm sm:text-base font-bold tabular-nums text-rose-700 font-sans">
              -{formatVND(totalExpense)}
            </p>
          </div>

          <div className="bg-white border border-[#e6e4dc] rounded-xl p-3 space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${netCashflow >= 0 ? "bg-teal-600" : "bg-rose-500"}`}></span>
              Dòng tiền ròng
            </span>
            <p className={`text-sm sm:text-base font-bold tabular-nums font-sans ${netCashflow >= 0 ? "text-teal-700" : "text-rose-600"}`}>
              {netCashflow >= 0 ? "+" : ""}{formatVND(netCashflow)}
            </p>
          </div>

          <div className="bg-white border border-[#e6e4dc] rounded-xl p-3 space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="text-[11px] font-medium text-zinc-500">
              Chi lớn nhất ({rows.length} mục)
            </span>
            <p className="text-xs font-semibold text-zinc-800 truncate">
              {topCategory ? `${CATEGORY_NAMES[topCategory] || topCategory} (~${formatVND(topCategoryAmount)})` : "Chưa có chi tiêu"}
            </p>
          </div>
        </div>
      </div>

      {/* Thanh nhập nhanh: Vừa tiêu gì? */}
      <TransactionForm />

      {/* Thanh công cụ tìm kiếm và lọc ngang */}
      <TransactionFilters {...filter} />

      {/* Danh sách giao dịch trọng tâm */}
      <TransactionList
        transactions={rows}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
      />
    </main>
  );
}
