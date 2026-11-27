"use client";

import { useState, useEffect } from "react";
import { formatVND, wishlistProgress, crossedMilestones, calculateWishlistPace } from "@/lib/finance";
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
      const res = await deleteWishlistItem(formData);
      showToast(
        res.ok ? "Đã xoá mục tiêu" : (res.error ?? "Không thể xoá mục tiêu"),
      );
    }
  };

  if (items.length === 0) {
    return (
      <div className="bg-white border border-[#e6e4dc] rounded-2xl p-10 text-center space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="w-10 h-10 rounded-xl bg-[#faf6ee] text-[#cf6b34] flex items-center justify-center mx-auto">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-zinc-800 text-sm">Chưa có món nào trong danh sách</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Nhập món đồ bạn dự định mua vào ô phía trên để bắt đầu theo dõi tiến độ tích lũy nhé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#183d2e] text-white px-4 py-2.5 rounded-xl text-xs font-medium shadow-xl border border-emerald-900 animate-in slide-in-from-bottom-2">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => {
          const percent = wishlistProgress(balance, item.price);
          const pri = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
          const isComplete = percent >= 100;
          const pace = calculateWishlistPace(
            item.price,
            balance,
            item.targetDate ? new Date(item.targetDate) : null,
          );

          return (
            <div
              key={item.id}
              onClick={() => setEditingItem(item)}
              className="bg-white border border-[#e6e4dc] rounded-2xl p-4 sm:p-5 hover:border-[#cfcbc0] transition cursor-pointer relative group flex flex-col justify-between space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
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
                    className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full border shrink-0 ${pri.badge}`}
                  >
                    {pri.label}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs tabular-nums font-sans">
                  <span className="text-zinc-500 font-sans text-[11px]">Mục tiêu:</span>
                  <span className="font-semibold text-zinc-900 font-sans">{formatVND(item.price)}</span>
                </div>
              </div>

              {/* Thanh tiến độ */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs tabular-nums font-sans">
                  <span className="text-[11px] text-zinc-400 font-sans">Tiến độ tích lũy:</span>
                  <span
                    className={`font-bold ${
                      isComplete ? "text-emerald-700" : "text-zinc-800"
                    }`}
                  >
                    {percent}% {isComplete ? "· Đủ tiền" : ""}
                  </span>
                </div>

                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isComplete ? "bg-emerald-600" : "bg-[#183d2e]"
                    }`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>

              {/* Thông tin hạn chót và tốc độ tích lũy */}
              {pace.hasTargetDate && (
                <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-500 border-t border-[#edebe4]">
                  <span>
                    Hạn: {new Date(item.targetDate!).toLocaleDateString("vi-VN")}
                  </span>
                  {pace.isOverdue ? (
                    <span className="text-rose-600 font-medium">
                      Đã quá hạn (thiếu {formatVND(pace.neededPerDay)})
                    </span>
                  ) : isComplete ? (
                    <span className="text-emerald-600 font-medium">Đã đạt trước hạn</span>
                  ) : (
                    <span className="text-zinc-600">
                      Còn {pace.daysRemaining} ngày · cần ~{formatVND(pace.neededPerDay)}/ngày
                    </span>
                  )}
                </div>
              )}

              {/* Footer thẻ */}
              <div className="flex items-center justify-between pt-2 border-t border-[#edebe4] text-[11px]">
                <span className="text-zinc-400 group-hover:text-zinc-600">
                  Bấm để sửa
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
