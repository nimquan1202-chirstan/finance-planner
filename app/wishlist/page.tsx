import { prisma } from "@/lib/prisma";
import { formatVND } from "@/lib/finance";
import { requireUser } from "@/lib/dal";
import { WishlistForm } from "./wishlist-form";
import { WishlistList } from "./wishlist-list";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireUser();

  const [incomeAgg, expenseAgg, items] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "INCOME" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: user.id, type: "EXPENSE" },
    }),
    prisma.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const balance = (incomeAgg._sum.amount ?? 0) - (expenseAgg._sum.amount ?? 0);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-7 space-y-6">
      {/* Header gọn gàng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Danh sách muốn mua
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tiết kiệm từng bước cho những món đồ dự định
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-100/80 border border-zinc-200/80 text-xs">
            <span className="text-zinc-500">Số dư khả dụng: </span>
            <strong className="font-mono tabular-nums text-zinc-900 font-bold">
              {formatVND(balance)}
            </strong>
          </div>
        </div>
      </div>

      {/* Form thêm mục tiêu mới: Muốn mua gì? */}
      <WishlistForm />

      {/* Danh sách mục tiêu & thanh tiến độ */}
      <WishlistList items={items} balance={balance} />
    </main>
  );
}
