"use client";

import { useActionState } from "react";
import { Category } from "@/generated/prisma/enums";
import { createTransaction } from "./actions";

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

export function TransactionForm() {
  const [state, formAction, pending] = useActionState(createTransaction, {});
  const { values: v = {}, errors: err = {} } = state;

  return (
    <form action={formAction} className="space-y-4">
      {state.ok && (
        <div
          role="status"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2"
        >
          <span>✓</span>
          <span>{state.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Loại giao dịch */}
        <div className="space-y-1">
          <label htmlFor="type" className="text-xs font-medium text-zinc-700 block">
            Loại giao dịch
          </label>
          <select
            id="type"
            name="type"
            aria-label="Loại giao dịch"
            defaultValue={v.type ?? "EXPENSE"}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 transition"
          >
            <option value="EXPENSE">Chi tiêu</option>
            <option value="INCOME">Thu nhập</option>
          </select>
          <Err msg={err.type} />
        </div>

        {/* Danh mục */}
        <div className="space-y-1">
          <label htmlFor="category" className="text-xs font-medium text-zinc-700 block">
            Danh mục
          </label>
          <select
            id="category"
            name="category"
            aria-label="Danh mục"
            defaultValue={v.category ?? "FOOD"}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 transition"
          >
            {Object.values(Category).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] || c}
              </option>
            ))}
          </select>
          <Err msg={err.category} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Số tiền */}
        <div className="space-y-1">
          <label htmlFor="amount" className="text-xs font-medium text-zinc-700 block">
            Số tiền (VND)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="1"
            placeholder="50000"
            defaultValue={v.amount}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 transition font-mono"
          />
          <Err msg={err.amount} />
        </div>

        {/* Ngày */}
        <div className="space-y-1">
          <label htmlFor="date" className="text-xs font-medium text-zinc-700 block">
            Ngày
          </label>
          <input
            id="date"
            name="date"
            type="date"
            aria-label="Ngày ghi nhận"
            defaultValue={v.date ?? new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 transition"
          />
          <Err msg={err.date} />
        </div>
      </div>

      {/* Mô tả */}
      <div className="space-y-1">
        <label htmlFor="description" className="text-xs font-medium text-zinc-700 block">
          Mô tả
        </label>
        <input
          id="description"
          name="description"
          type="text"
          placeholder="Ăn trưa, đổ xăng, tiền điện..."
          defaultValue={v.description}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 focus:border-zinc-800 transition"
        />
        <Err msg={err.description} />
      </div>

      <div className="pt-1 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-medium text-xs transition cursor-pointer"
        >
          {pending ? "Đang lưu..." : "Thêm giao dịch"}
        </button>
      </div>
    </form>
  );
}

function Err({ msg }: { msg?: string[] }) {
  if (!msg || msg.length === 0) return null;
  return <p role="alert" className="text-[11px] text-rose-600 font-medium mt-1">{msg[0]}</p>;
}
