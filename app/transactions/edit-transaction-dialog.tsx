"use client";

import { useActionState, useEffect } from "react";
import { Category, TransactionType } from "@/generated/prisma/enums";
import { updateTransaction } from "./actions";

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

interface TransactionItem {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category;
  description: string | null;
  date: Date | string;
}

interface EditDialogProps {
  transaction: TransactionItem;
  onClose: () => void;
}

export function EditTransactionDialog({ transaction, onClose }: EditDialogProps) {
  const [state, formAction, pending] = useActionState(updateTransaction, {});
  const { errors: err = {} } = state;

  useEffect(() => {
    if (state.ok) {
      const timer = setTimeout(() => {
        onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.ok, onClose]);

  const dateValue = new Date(transaction.date).toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h2 className="text-sm font-bold text-zinc-900">Chỉnh sửa giao dịch</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-sm p-1 rounded-md"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {state.ok && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
            ✓ {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-3.5">
          <input type="hidden" name="id" value={transaction.id} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 block">Loại</label>
              <select
                name="type"
                defaultValue={transaction.type}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800"
              >
                <option value="EXPENSE">Chi tiêu</option>
                <option value="INCOME">Thu nhập</option>
              </select>
              {err.type && <p className="text-[11px] text-rose-600">{err.type[0]}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 block">Danh mục</label>
              <select
                name="category"
                defaultValue={transaction.category}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800"
              >
                {Object.values(Category).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c] || c}
                  </option>
                ))}
              </select>
              {err.category && <p className="text-[11px] text-rose-600">{err.category[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 block">Số tiền (VND)</label>
              <input
                name="amount"
                type="number"
                min="1"
                step="1"
                defaultValue={Math.round(transaction.amount)}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-zinc-800"
              />
              {err.amount && <p className="text-[11px] text-rose-600">{err.amount[0]}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 block">Ngày</label>
              <input
                name="date"
                type="date"
                defaultValue={dateValue}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800"
              />
              {err.date && <p className="text-[11px] text-rose-600">{err.date[0]}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 block">Mô tả</label>
            <input
              name="description"
              type="text"
              defaultValue={transaction.description ?? ""}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800"
            />
            {err.description && (
              <p className="text-[11px] text-rose-600">{err.description[0]}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium disabled:bg-zinc-400"
            >
              {pending ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
