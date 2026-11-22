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

export default async function TransactionsPage({ searchParams }: PageProps) {
  // Next 16: searchParams là Promise → phải await
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
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sổ theo dõi giao dịch
            </h1>
            <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              FP2 (Tuần 9)
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Ghi chép thu chi, phân loại danh mục và lọc dữ liệu phía máy chủ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm transition"
          >
            ← Xem Dashboard
          </Link>
          <a
            href="/api/transactions?format=csv"
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition shadow-sm flex items-center gap-1.5"
            download="transactions.csv"
          >
            <span>📥</span> Xuất CSV
          </a>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Thêm Giao Dịch */}
        <section className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>✍️</span> Thêm giao dịch mới
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Validate máy chủ với Zod 4 và Server Actions
            </p>
          </div>
          <TransactionForm />
        </section>

        {/* Right Column: Filters & Transactions List */}
        <section className="lg:col-span-7 space-y-5">
          {/* Filters Bar */}
          <TransactionFilters {...filter} />

          {/* Quick Summary of Filtered Results */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-sm">
              <span className="text-[11px] font-medium text-slate-400 block">Số giao dịch</span>
              <span className="text-base font-bold text-slate-800">{rows.length}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-sm">
              <span className="text-[11px] font-medium text-emerald-600 block">Tổng thu (lọc)</span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                +{formatVND(totalIncome)}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-sm">
              <span className="text-[11px] font-medium text-rose-600 block">Tổng chi (lọc)</span>
              <span className="text-sm font-bold text-rose-700 font-mono">
                -{formatVND(totalExpense)}
              </span>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Danh sách chi tiết
              </h2>
              <span className="text-xs text-slate-500">
                Sắp xếp mới nhất trước
              </span>
            </div>

            {rows.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <span className="text-3xl block">📭</span>
                <p className="text-sm font-medium text-slate-700">
                  Không tìm thấy giao dịch nào
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Không có giao dịch nào khớp với bộ lọc hiện tại. Thử chọn &ldquo;Tất cả thời gian&rdquo; hoặc đặt lại bộ lọc.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rows.map((t) => {
                  const isIncome = t.type === "INCOME";
                  const catLabel = categoryLabels[t.category] || t.category;

                  return (
                    <li
                      key={t.id}
                      className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              isIncome
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-rose-50 text-rose-700 border border-rose-200/60"
                            }`}
                          >
                            {isIncome ? "Thu nhập" : "Chi tiêu"}
                          </span>
                          <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {catLabel}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(t.date).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {t.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-sm sm:text-base font-bold font-mono ${
                            isIncome ? "text-emerald-600" : "text-slate-900"
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
