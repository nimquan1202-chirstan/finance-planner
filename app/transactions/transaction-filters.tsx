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

  const selectStyle =
    "h-9 pl-3 pr-7 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg%20xmlns=\"http://www.w3.org/2000/svg\"%20width=\"16\"%20height=\"16\"%20fill=\"none\"%20stroke=\"%2371717a\"%20stroke-width=\"1.5\"%20viewBox=\"0 0 24 24\"><path%20stroke-linecap=\"round\"%20stroke-linejoin=\"round\"%20d=\"M6%209l6%206%206-6\"/></svg>')] bg-[length:13px] bg-[right_8px_center] bg-no-repeat focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition cursor-pointer";

  return (
    <div className="bg-white border border-zinc-200/80 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Tìm kiếm và các bộ lọc */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
        {/* Ô tìm kiếm rộng hơn */}
        <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
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
            className="w-full h-9 pl-8 pr-3 py-1.5 border border-zinc-200 rounded-lg text-xs bg-zinc-50/70 hover:bg-white focus:bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
          />
          <span className="absolute left-2.5 top-2.5 text-zinc-400 pointer-events-none">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>

        {/* Thời gian */}
        <select
          aria-label="Thời gian"
          value={f.range}
          onChange={(e) => pick("range", e.target.value)}
          className={selectStyle}
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
          className={selectStyle}
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
          className={`${selectStyle} max-w-[155px]`}
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
            type="button"
            onClick={reset}
            className="h-9 px-2.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition font-medium cursor-pointer"
          >
            ✕ Xoá lọc
          </button>
        )}
      </div>

      {/* Đổi chiều sắp xếp & Xuất CSV */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={toggleSort}
          title="Đổi chiều sắp xếp thời gian"
          className="h-9 px-3 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 flex items-center gap-1.5 font-medium transition cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span>{f.sort === "asc" ? "Cũ nhất" : "Mới nhất"}</span>
        </button>

        <a
          href="/api/transactions?format=csv"
          className="h-9 px-3 border border-zinc-200 hover:bg-zinc-50 rounded-lg text-zinc-700 flex items-center gap-1.5 font-medium transition"
          download="transactions.csv"
          title="Tải về file CSV"
        >
          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Xuất CSV</span>
        </a>
      </div>
    </div>
  );
}
