import { prisma } from "@/lib/prisma";
import { formatVND } from "@/lib/finance";
import { requireUser } from "@/lib/dal";
import { WishlistForm } from "./wishlist-form";
import { WishlistList } from "./wishlist-list";
import Link from "next/link";

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
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Mục tiêu tiết kiệm (Wishlist)
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Đặt mục tiêu và theo dõi mức độ tiết kiệm dựa trên số dư hiện tại của bạn
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-xs">
            <span className="text-zinc-500">Số dư khả dụng: </span>
            <strong className="font-mono text-zinc-900 font-bold">
              {formatVND(balance)}
            </strong>
          </div>

          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-medium text-xs transition"
          >
            ← Tổng quan
          </Link>
        </div>
      </div>

      {/* Form thêm mục tiêu mới */}
      <WishlistForm />

      {/* Danh sách mục tiêu & thanh tiến độ */}
      <WishlistList items={items} balance={balance} />
    </main>
  );
}
