"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Filters } from "@/lib/validation";
import { Category } from "@/generated/prisma/enums";

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

export function TransactionFilters(f: Filters) {
  const router = useRouter();
  const params = useSearchParams();

  function pick(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value === "ALL") next.delete(key);
    else next.set(key, value);
    router.replace(`/transactions?${next}`);
  }

  function reset() {
    router.replace("/transactions");
  }

  const hasActiveFilters =
    f.range !== "this-month" || !!f.type || !!f.category;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-800">
          Bộ lọc
        </span>
        {hasActiveFilters && (
          <button
            onClick={reset}
            className="text-xs text-zinc-500 hover:text-zinc-800 font-medium cursor-pointer"
          >
            Đặt lại
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Thời gian */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-zinc-500 block">Thời gian</label>
          <select
            aria-label="Lọc theo thời gian"
            value={f.range}
            onChange={(e) => pick("range", e.target.value)}
            className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-zinc-50 hover:bg-white focus:bg-white focus:outline-none focus:border-zinc-400 transition"
          >
            <option value="this-month">Tháng này</option>
            <option value="last-month">Tháng trước</option>
            <option value="all">Tất cả thời gian</option>
          </select>
        </div>

        {/* Loại */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-zinc-500 block">Loại</label>
          <select
            aria-label="Lọc theo loại"
            value={f.type ?? "ALL"}
            onChange={(e) => pick("type", e.target.value)}
            className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-zinc-50 hover:bg-white focus:bg-white focus:outline-none focus:border-zinc-400 transition"
          >
            <option value="ALL">Thu và Chi</option>
            <option value="INCOME">Chỉ thu nhập</option>
            <option value="EXPENSE">Chỉ chi tiêu</option>
          </select>
        </div>

        {/* Danh mục */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-zinc-500 block">Danh mục</label>
          <select
            aria-label="Lọc theo danh mục"
            value={f.category ?? "ALL"}
            onChange={(e) => pick("category", e.target.value)}
            className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-zinc-50 hover:bg-white focus:bg-white focus:outline-none focus:border-zinc-400 transition"
          >
            <option value="ALL">Tất cả danh mục</option>
            {Object.values(Category).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] || c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
