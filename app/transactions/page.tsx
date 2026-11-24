import { prisma } from "@/lib/prisma";
import { getDateRange } from "@/lib/finance";
import { transactionFilterSchema } from "@/lib/validation";
import { requireUser } from "@/lib/dal";
import { TransactionForm } from "./transaction-form";
import { TransactionFilters } from "./transaction-filters";
import { TransactionList } from "./transaction-list";
import type { Prisma } from "@/generated/prisma/client";

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

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-7 space-y-6">
      {/* Header gọn gàng */}
      <div className="border-b border-zinc-200/80 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
          Sổ giao dịch
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Theo dõi chi tiết các khoản thu chi
        </p>
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
