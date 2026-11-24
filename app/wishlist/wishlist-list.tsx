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

      // Xem có mốc nào mới đạt qua (so với 0 hoặc mốc cao nhất đã lưu)
      const lastAchieved = savedMilestones.length > 0
        ? Math.max(...savedMilestones)
        : 0;

      const newCrossed = crossedMilestones(lastAchieved, percent);
      if (newCrossed.length > 0) {
        const topMilestone = Math.max(...newCrossed);
        const updated = Array.from(new Set([...savedMilestones, ...newCrossed]));
        localStorage.setItem(storageKey, JSON.stringify(updated));

        showToast(
          `🎉 Chúc mừng! Bạn đã tiết kiệm được ${topMilestone}% cho "${item.name}"!`,
        );
        break; // Mỗi lần thông báo 1 món nổi bật
      }
    }
  }, [items, balance]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xoá mục tiêu này?")) {
      const formData = new FormData();
      formData.append("id", id);
      await deleteWishlistItem(formData);
      showToast("Đã xoá mục tiêu mua sắm");
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-xs text-zinc-500 space-y-1.5">
        <p className="font-semibold text-zinc-700 text-sm">Chưa có mục tiêu tiết kiệm nào</p>
        <p className="text-zinc-400">
          Hãy thêm các món đồ bạn mong muốn ở trên để hệ thống theo dõi tiến độ tích lũy!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast thông báo chúc mừng */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-xl text-xs font-medium shadow-xl border border-zinc-800 animate-in slide-in-from-bottom-2 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal sửa */}
      {editingItem && (
        <EditWishlistDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Grid thẻ mục tiêu Wishlist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const percent = wishlistProgress(balance, item.price);
          const pri = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
          const isComplete = percent >= 100;

          return (
            <div
              key={item.id}
              onClick={() => setEditingItem(item)}
              className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 hover:border-zinc-300 transition cursor-pointer relative group flex flex-col justify-between space-y-4"
              title="Bấm vào để chỉnh sửa"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-zinc-900 truncate">
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
                        🔗 Xem sản phẩm
                      </a>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-medium rounded-full border shrink-0 ${pri.badge}`}
                  >
                    Ưu tiên {pri.label}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs font-mono">
                  <span className="text-zinc-500 font-sans text-[11px]">Mục tiêu:</span>
                  <span className="font-semibold text-zinc-900">{formatVND(item.price)}</span>
                </div>
              </div>

              {/* Thanh tiến độ */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-zinc-400 font-sans">Tiến độ tích lũy:</span>
                  <span
                    className={`font-bold ${
                      isComplete ? "text-emerald-700" : "text-zinc-800"
                    }`}
                  >
                    {percent}% {isComplete ? "✓ Đã đủ tiền" : ""}
                  </span>
                </div>

                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isComplete ? "bg-emerald-600" : "bg-zinc-800"
                    }`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>

              {/* Footer thẻ: Nút xoá khi hover */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-50 text-[11px]">
                <span className="text-zinc-400 group-hover:text-zinc-600">
                  Bấm để sửa thông tin
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                >
                  Xoá món này
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
