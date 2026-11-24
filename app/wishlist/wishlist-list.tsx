"use client";

import { useState, useEffect } from "react";
import { formatVND, wishlistProgress, crossedMilestones } from "@/lib/finance";
import { EditWishlistDialog, type WishlistItemType } from "./edit-wishlist-dialog";
import { deleteWishlistItem } from "./actions";

interface WishlistListProps {
  items: WishlistItemType[];
  balance: number;
}

const PRIORITY_CONFIG = {
  LOW: { label: "Thấp", badge: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  MEDIUM: { label: "Vừa", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  HIGH: { label: "Cao", badge: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function WishlistList({ items, balance }: WishlistListProps) {
  const [editingItem, setEditingItem] = useState<WishlistItemType | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Thông báo mốc tiết kiệm (50%, 75%, 100%) không lặp lại
  useEffect(() => {
    for (const item of items) {
      const percent = wishlistProgress(balance, item.price);
      const storageKey = `fp_milestone_${item.id}`;
      const savedMilestones: number[] = JSON.parse(
        localStorage.getItem(storageKey) || "[]",
      );

      const lastAchieved = savedMilestones.length > 0
        ? Math.max(...savedMilestones)
        : 0;

      const newCrossed = crossedMilestones(lastAchieved, percent);
      if (newCrossed.length > 0) {
        const topMilestone = Math.max(...newCrossed);
        const updated = Array.from(new Set([...savedMilestones, ...newCrossed]));
        localStorage.setItem(storageKey, JSON.stringify(updated));

        showToast(
          `Đã tiết kiệm được ${topMilestone}% cho "${item.name}"`,
        );
        break;
      }
    }
  }, [items, balance]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xoá mục tiêu này?")) {
      const formData = new FormData();
      formData.append("id", id);
      await deleteWishlistItem(formData);
      showToast("Đã xoá mục tiêu");
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white border border-zinc-200/80 rounded-lg p-10 text-center text-xs text-zinc-500 space-y-2">
        <p className="font-semibold text-zinc-800 text-sm">Chưa có món nào. Thêm món đầu tiên đi.</p>
        <p className="text-zinc-400">
          Nhập món đồ bạn muốn mua vào ô phía trên để theo dõi tiến độ tích lũy.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-2.5 rounded-lg text-xs font-medium shadow-xl border border-zinc-800 animate-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Modal sửa */}
      {editingItem && (
        <EditWishlistDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Grid thẻ mục tiêu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {items.map((item) => {
          const percent = wishlistProgress(balance, item.price);
          const pri = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
          const isComplete = percent >= 100;

          return (
            <div
              key={item.id}
              onClick={() => setEditingItem(item)}
              className="bg-white border border-zinc-200/80 rounded-lg p-4 sm:p-5 hover:border-zinc-300 transition cursor-pointer relative group flex flex-col justify-between space-y-4"
              title="Bấm vào để chỉnh sửa"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-zinc-900 truncate">
                      {item.name}
                    </h3>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-zinc-400 hover:text-zinc-700 underline truncate block mt-0.5"
                      >
                        Đường dẫn sản phẩm
                      </a>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-md border shrink-0 ${pri.badge}`}
                  >
                    {pri.label}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs font-mono tabular-nums">
                  <span className="text-zinc-500 font-sans text-[11px]">Mục tiêu:</span>
                  <span className="font-semibold text-zinc-900">{formatVND(item.price)}</span>
                </div>
              </div>

              {/* Thanh tiến độ */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-[11px] text-zinc-400 font-sans">Tiến độ tích lũy:</span>
                  <span
                    className={`font-bold ${
                      isComplete ? "text-emerald-700" : "text-zinc-800"
                    }`}
                  >
                    {percent}% {isComplete ? "· Đủ tiền" : ""}
                  </span>
                </div>

                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isComplete ? "bg-emerald-600" : "bg-zinc-800"
                    }`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>

              {/* Footer thẻ */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-50 text-[11px]">
                <span className="text-zinc-400 group-hover:text-zinc-600">
                  Bấm để sửa
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                >
                  Xoá
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
