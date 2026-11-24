"use client";

import { useState } from "react";
import { formatVND } from "@/lib/finance";
import { Category, TransactionType } from "@/generated/prisma/enums";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { deleteTransaction } from "./actions";

const CATEGORY_MAP: Record<
  string,
  { label: string; hex: string }
> = {
  BILLS: { label: "Hoá đơn & Nhà ở", hex: "#047857" },
  FOOD: { label: "Ăn uống", hex: "#d97706" },
  TRANSPORT: { label: "Di chuyển", hex: "#0284c7" },
  SHOPPING: { label: "Mua sắm", hex: "#e11d48" },
  ENTERTAINMENT: { label: "Giải trí", hex: "#9333ea" },
  INVESTMENT: { label: "Đầu tư tích lũy", hex: "#4f46e5" },
  SALARY: { label: "Lương & Thu nhập", hex: "#0d9488" },
  OTHER: { label: "Chi tiêu khác", hex: "#71717a" },
};

export interface TransactionItem {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category;
  description: string | null;
  date: Date;
}

interface TransactionListProps {
  transactions: TransactionItem[];
  totalIncome: number;
  totalExpense: number;
}

export function TransactionList({
  transactions,
  totalIncome,
  totalExpense,
}: TransactionListProps) {
  const [editingItem, setEditingItem] = useState<TransactionItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xoá giao dịch này?")) {
      const formData = new FormData();
      formData.append("id", id);
      await deleteTransaction(formData);
      showToast("Đã xoá giao dịch");
    }
  };

  // Nhóm giao dịch theo ngày
  const grouped: Record<string, TransactionItem[]> = {};
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const formatDateGroup = (d: Date) => {
    const itemDate = new Date(d);
    if (
      itemDate.getDate() === today.getDate() &&
      itemDate.getMonth() === today.getMonth() &&
      itemDate.getFullYear() === today.getFullYear()
    ) {
      return "Hôm nay";
    }
    if (
      itemDate.getDate() === yesterday.getDate() &&
      itemDate.getMonth() === yesterday.getMonth() &&
      itemDate.getFullYear() === yesterday.getFullYear()
    ) {
      return "Hôm qua";
    }
    return itemDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  for (const t of transactions) {
    const key = formatDateGroup(t.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const groupKeys = Object.keys(grouped);

  return (
    <div className="bg-white border border-zinc-200/80 rounded-lg overflow-hidden relative">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-lg text-xs font-medium shadow-xl border border-zinc-800 animate-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Modal sửa giao dịch */}
      {editingItem && (
        <EditTransactionDialog
          transaction={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {transactions.length === 0 ? (
        <div className="py-12 px-4 text-center space-y-2 text-xs text-zinc-500">
          <p className="font-semibold text-zinc-800 text-sm">
            Chưa có giao dịch nào trong khoảng thời gian này
          </p>
          <p className="text-zinc-400">
            Thử đổi bộ lọc thời gian hoặc nhập một khoản mới ở thanh phía trên.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {groupKeys.map((dateLabel) => (
            <div key={dateLabel}>
              {/* Tiêu đề nhóm ngày */}
              <div className="bg-zinc-50/80 px-4 py-1.5 text-[11px] font-semibold text-zinc-500 tracking-wider">
                {dateLabel}
              </div>

              {/* Danh sách các giao dịch trong ngày */}
              <ul className="divide-y divide-zinc-100">
                {grouped[dateLabel].map((t) => {
                  const isIncome = t.type === "INCOME";
                  const catConfig = CATEGORY_MAP[t.category] || CATEGORY_MAP.OTHER;

                  return (
                    <li
                      key={t.id}
                      onClick={() => setEditingItem(t)}
                      className="px-4 py-3 hover:bg-zinc-50/80 transition flex items-center justify-between gap-4 cursor-pointer group text-xs"
                      title="Bấm vào để chỉnh sửa"
                    >
                      {/* Trái: Chấm màu danh mục + Mô tả + Tên danh mục nhỏ */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: catConfig.hex }}
                          title={catConfig.label}
                        ></span>

                        <div className="space-y-0.5 min-w-0">
                          <p className="font-medium text-zinc-900 truncate">
                            {t.description}
                          </p>
                          <span className="text-[11px] text-zinc-400 block">
                            {catConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Phải: Số tiền căn phải font mono tabular-nums + Nút xoá khi hover */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`font-semibold font-mono tabular-nums text-sm sm:text-base text-right ${
                            isIncome ? "text-emerald-700" : "text-zinc-900"
                          }`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatVND(t.amount)}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, t.id)}
                          title="Xoá giao dịch"
                          className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition"
                        >
                          Xoá
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Hàng tổng ở cuối danh sách */}
      {transactions.length > 0 && (
        <div className="bg-zinc-50/90 border-t border-zinc-200/80 px-4 py-3 text-xs text-zinc-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            Đang xem <strong className="font-mono tabular-nums text-zinc-900">{transactions.length}</strong> khoản
          </span>
          <div className="flex items-center gap-4 font-mono tabular-nums text-[11px] sm:text-xs">
            <span>
              Chi: <strong className="text-zinc-900">{formatVND(totalExpense)}</strong>
            </span>
            <span>·</span>
            <span>
              Thu: <strong className="text-emerald-700">+{formatVND(totalIncome)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
