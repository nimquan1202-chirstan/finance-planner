"use client";

import { useActionState, useState, useEffect } from "react";
import { Category } from "@/generated/prisma/enums";
import { createTransaction } from "./actions";

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "Ăn uống",
  TRANSPORT: "Di chuyển",
  SHOPPING: "Mua sắm",
  BILLS: "Hoá đơn & Nhà ở",
  ENTERTAINMENT: "Giải trí",
  INVESTMENT: "Đầu tư tích lũy",
  SALARY: "Lương & Thu nhập",
  OTHER: "Chi tiêu khác",
};

export function TransactionForm() {
  const [state, formAction, pending] = useActionState(createTransaction, {});
  const { values: v = {}, errors: err = {} } = state;

  const [lastCategory, setLastCategory] = useState("FOOD");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const saved = localStorage.getItem("fp_last_category");
    if (saved && Category[saved as keyof typeof Category]) {
      setLastCategory(saved);
    }
  }, []);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value;
    setLastCategory(cat);
    localStorage.setItem("fp_last_category", cat);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
        <h2 className="text-sm font-bold text-zinc-900">Vừa tiêu gì?</h2>
        <span className="text-[11px] text-zinc-400">Nhấn Enter để thêm nhanh</span>
      </div>

      {state.ok && (
        <div
          role="status"
          className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between"
        >
          <span>✓ {state.message}</span>
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Loại */}
          <div className="sm:col-span-2">
            <select
              name="type"
              aria-label="Loại"
              defaultValue={v.type ?? "EXPENSE"}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            >
              <option value="EXPENSE">Chi tiêu</option>
              <option value="INCOME">Thu nhập</option>
            </select>
            <Err msg={err.type} />
          </div>

          {/* Danh mục (nhớ danh mục gần nhất) */}
          <div className="sm:col-span-3">
            <select
              name="category"
              aria-label="Danh mục"
              value={lastCategory}
              onChange={handleCategoryChange}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            >
              {Object.values(Category).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] || c}
                </option>
              ))}
            </select>
            <Err msg={err.category} />
          </div>

          {/* Số tiền */}
          <div className="sm:col-span-3">
            <input
              name="amount"
              type="number"
              min="1"
              step="1"
              placeholder="Số tiền (đ)"
              defaultValue={v.amount}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            />
            <Err msg={err.amount} />
          </div>

          {/* Ngày */}
          <div className="sm:col-span-4">
            <input
              name="date"
              type="date"
              aria-label="Ngày"
              defaultValue={v.date ?? today}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            />
            <Err msg={err.date} />
          </div>
        </div>

        {/* Mô tả + nút thêm cùng hàng */}
        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <input
              name="description"
              type="text"
              placeholder="Nội dung khoản chi (VD: Cơm trưa, Cà phê...)"
              defaultValue={v.description}
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            />
            <Err msg={err.description} />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-1.5 h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-medium text-xs transition shrink-0 cursor-pointer"
          >
            {pending ? "Đang lưu..." : "Thêm"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Err({ msg }: { msg?: string[] }) {
  if (!msg || msg.length === 0) return null;
  return <p role="alert" className="text-[11px] text-rose-600 font-medium mt-0.5">{msg[0]}</p>;
}
