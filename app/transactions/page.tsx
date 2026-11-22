import { prisma } from "@/lib/prisma";
import { formatVND, getDateRange } from "@/lib/finance";
import { transactionFilterSchema } from "@/lib/validation";
import { TransactionForm } from "./transaction-form";
import { TransactionFilters } from "./transaction-filters";
import { DeleteButton } from "./delete-button";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Ăn uống",
  TRANSPORT: "Di chuyển",
  ENTERTAINMENT: "Giải trí",
  SHOPPING: "Mua sắm",
  BILLS: "Hoá đơn",
  SALARY: "Lương",
  INVESTMENT: "Đầu tư",
  OTHER: "Khác",
};

export default async function TransactionsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filter = transactionFilterSchema
    .catch({ range: "this-month" })
    .parse(resolvedParams);

  const rows = await prisma.transaction.findMany({
    where: {
      date: getDateRange(filter.range),
      type: filter.type,
      category: filter.category,
    },
    orderBy: { date: "desc" },
  });

  const totalIncome = rows
    .filter((r) => r.type === "INCOME")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = rows
    .filter((r) => r.type === "EXPENSE")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Sổ giao dịch
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Ghi chép và tra cứu các khoản thu chi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-medium text-xs transition"
          >
            ← Tổng quan
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

      {/* Grid 2 cột */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái: Form Thêm */}
        <section className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
          <div className="border-b border-zinc-100 pb-3">
            <h2 className="text-sm font-bold text-zinc-900">
              Ghi giao dịch mới
            </h2>
          </div>
          <TransactionForm />
        </section>

        {/* Cột phải: Bộ lọc & Danh sách */}
        <section className="lg:col-span-7 space-y-4">
          <TransactionFilters {...filter} />

          {/* Tóm tắt nhanh số liệu bộ lọc */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-white border border-zinc-200 rounded-xl">
              <span className="text-[11px] font-medium text-zinc-400 block">Số bản ghi</span>
              <span className="text-sm font-bold text-zinc-800 font-mono">{rows.length}</span>
            </div>
            <div className="p-3 bg-white border border-zinc-200 rounded-xl">
              <span className="text-[11px] font-medium text-zinc-500 block">Thu trong kỳ</span>
              <span className="text-xs font-bold text-emerald-800 font-mono">
                +{formatVND(totalIncome)}
              </span>
            </div>
            <div className="p-3 bg-white border border-zinc-200 rounded-xl">
              <span className="text-[11px] font-medium text-zinc-500 block">Chi trong kỳ</span>
              <span className="text-xs font-bold text-zinc-900 font-mono">
                -{formatVND(totalExpense)}
              </span>
            </div>
          </div>

          {/* Danh sách giao dịch */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-800">
                Chi tiết các giao dịch
              </span>
              <span className="text-zinc-400">Mới nhất trước</span>
            </div>

            {rows.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-1.5 text-xs">
                <p className="font-medium text-zinc-700">
                  Không tìm thấy giao dịch nào phù hợp
                </p>
                <p className="text-zinc-400">
                  Thử đổi khoảng thời gian hoặc chọn tất cả danh mục.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {rows.map((t) => {
                  const isIncome = t.type === "INCOME";
                  const catLabel = CATEGORY_LABELS[t.category] || t.category;

                  return (
                    <li
                      key={t.id}
                      className="px-4 py-3 hover:bg-zinc-50/70 transition flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-[11px] ${
                              isIncome ? "text-emerald-800" : "text-zinc-700"
                            }`}
                          >
                            {isIncome ? "Thu nhập" : "Chi tiêu"}
                          </span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-600">{catLabel}</span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-400 text-[11px]">
                            {new Date(t.date).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <p className="font-medium text-zinc-900 truncate">
                          {t.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`font-semibold font-mono ${
                            isIncome ? "text-emerald-700" : "text-zinc-900"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatVND(t.amount)}
                        </span>
                        <DeleteButton id={t.id} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
