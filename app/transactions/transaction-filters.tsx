"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Filters } from "@/lib/validation";
import { Category } from "@/generated/prisma/enums";

const CATEGORY_LABELS: Record<string, string> = {
  BILLS: "Hoá đơn & Nhà ở",
  FOOD: "Ăn uống",
  TRANSPORT: "Di chuyển",
  SHOPPING: "Mua sắm",
  ENTERTAINMENT: "Giải trí",
  INVESTMENT: "Đầu tư tích lũy",
  SALARY: "Lương & Thu nhập",
  OTHER: "Chi tiêu khác",
};

export function TransactionFilters(f: Filters) {
  const router = useRouter();
  const params = useSearchParams();

  function pick(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    router.replace(`/transactions?${next}`);
  }

  function toggleSort() {
    const next = new URLSearchParams(params);
    const newSort = f.sort === "asc" ? "desc" : "asc";
    next.set("sort", newSort);
    router.replace(`/transactions?${next}`);
  }

  function reset() {
    router.replace("/transactions");
  }

  const hasActiveFilters =
    f.range !== "this-month" || !!f.type || !!f.category || !!f.q || f.sort !== "desc";

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Tìm kiếm và các bộ lọc */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
        {/* Ô tìm kiếm theo mô tả */}
        <div className="relative min-w-[160px] flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Tìm theo mô tả..."
            defaultValue={f.q ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                pick("q", (e.target as HTMLInputElement).value.trim());
              }
            }}
            onBlur={(e) => {
              pick("q", e.target.value.trim());
            }}
            className="w-full pl-7 pr-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-zinc-50 hover:bg-white focus:bg-white focus:outline-none focus:border-zinc-400 transition"
          />
          <span className="absolute left-2.5 top-2 text-zinc-400 pointer-events-none text-xs">
            🔍
          </span>
        </div>

        {/* Thời gian */}
        <select
          aria-label="Thời gian"
          value={f.range}
          onChange={(e) => pick("range", e.target.value)}
          className="px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-zinc-50 hover:bg-white focus:bg-white focus:outline-none focus:border-zinc-400 transition"
        >
          <option value="this-month">Tháng này</option>
          <option value="last-month">Tháng trước</option>
          <option value="all">Tất cả thời gian</option>
        </select>

        {/* Loại */}
        <select
          aria-label="Loại"
          value={f.type ?? "ALL"}
          onChange={(e) => pick("type", e.target.value)}
          className="px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-zinc-50 hover:bg-white focus:bg-white focus:outline-none focus:border-zinc-400 transition"
        >
          <option value="ALL">Thu & Chi</option>
          <option value="INCOME">Chỉ thu nhập</option>
          <option value="EXPENSE">Chỉ chi tiêu</option>
        </select>

        {/* Danh mục */}
        <select
          aria-label="Danh mục"
          value={f.category ?? "ALL"}
          onChange={(e) => pick("category", e.target.value)}
          className="px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-zinc-50 hover:bg-white focus:bg-white focus:outline-none focus:border-zinc-400 transition max-w-[150px]"
        >
          <option value="ALL">Tất cả danh mục</option>
          {Object.values(Category).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] || c}
            </option>
          ))}
        </select>

        {/* Nút Xoá lọc */}
        {hasActiveFilters && (
          <button
            onClick={reset}
            className="px-2 py-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition font-medium cursor-pointer"
          >
            ✕ Xoá lọc
          </button>
        )}
      </div>

      {/* Đổi chiều sắp xếp & Xuất CSV */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleSort}
          title="Đổi chiều sắp xếp thời gian"
          className="px-2.5 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 flex items-center gap-1 font-medium transition cursor-pointer"
        >
          <span>{f.sort === "asc" ? "↑ Cũ nhất" : "↓ Mới nhất"}</span>
        </button>

        <a
          href="/api/transactions?format=csv"
          className="px-2.5 py-1.5 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 flex items-center gap-1 font-medium transition"
          download="transactions.csv"
          title="Tải về file CSV"
        >
          <span>📥</span>
          <span>Xuất CSV</span>
        </a>
      </div>
    </div>
  );
}
