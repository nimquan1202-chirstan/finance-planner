"use client";

import { useActionState } from "react";
import { Category } from "@/generated/prisma/enums";
import { createTransaction } from "./actions";

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

export function TransactionForm() {
  const [state, formAction, pending] = useActionState(createTransaction, {});
  const { values: v = {}, errors: err = {} } = state;

  return (
    <form action={formAction} className="space-y-4">
      {state.ok && (
        <div
          role="status"
          className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-lg text-emerald-800 text-sm flex items-center gap-2"
        >
          <span>✓</span>
          <span>{state.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Loại giao dịch */}
        <div className="space-y-1.5">
          <label htmlFor="type" className="text-xs font-semibold text-slate-700 block">
            Loại giao dịch <span className="text-rose-500">*</span>
          </label>
          <select
            id="type"
            name="type"
            aria-label="Loại giao dịch"
            defaultValue={v.type ?? "EXPENSE"}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          >
            <option value="EXPENSE">Chi tiêu (Expense)</option>
            <option value="INCOME">Thu nhập (Income)</option>
          </select>
          <Err msg={err.type} />
        </div>

        {/* Danh mục */}
        <div className="space-y-1.5">
          <label htmlFor="category" className="text-xs font-semibold text-slate-700 block">
            Danh mục <span className="text-rose-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            aria-label="Danh mục"
            defaultValue={v.category ?? "FOOD"}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          >
            {Object.values(Category).map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c] || c} ({c})
              </option>
            ))}
          </select>
          <Err msg={err.category} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Số tiền */}
        <div className="space-y-1.5">
          <label htmlFor="amount" className="text-xs font-semibold text-slate-700 block">
            Số tiền (VND, số nguyên) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="1"
              placeholder="VD: 50000"
              defaultValue={v.amount}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition pr-12 font-mono"
            />
            <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold pointer-events-none">
              VND
            </span>
          </div>
          <Err msg={err.amount} />
        </div>

        {/* Ngày giao dịch */}
        <div className="space-y-1.5">
          <label htmlFor="date" className="text-xs font-semibold text-slate-700 block">
            Ngày giao dịch <span className="text-rose-500">*</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            aria-label="Ngày giao dịch"
            defaultValue={v.date ?? new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
          <Err msg={err.date} />
        </div>
      </div>

      {/* Mô tả */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-xs font-semibold text-slate-700 block">
          Mô tả nội dung (1–120 ký tự) <span className="text-rose-500">*</span>
        </label>
        <input
          id="description"
          name="description"
          type="text"
          placeholder="VD: Cơm trưa văn phòng, Mua sắm siêu thị..."
          defaultValue={v.description}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
        <Err msg={err.description} />
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
        >
          {pending ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <span>+</span>
              <span>Thêm giao dịch</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Err({ msg }: { msg?: string[] }) {
  if (!msg || msg.length === 0) return null;
  return (
    <p role="alert" className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
      <span>⚠</span>
      <span>{msg[0]}</span>
    </p>
  );
}
