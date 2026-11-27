"use client";

import { useActionState, useEffect } from "react";
import { updateWishlistItem } from "./actions";
import { Priority } from "@/generated/prisma/enums";

export interface WishlistItemType {
  id: string;
  name: string;
  price: number;
  priority: Priority;
  link: string | null;
  purchased: boolean;
  targetDate?: Date | string | null;
}

interface EditWishlistDialogProps {
  item: WishlistItemType;
  onClose: () => void;
}

export function EditWishlistDialog({ item, onClose }: EditWishlistDialogProps) {
  const [state, formAction, pending] = useActionState(updateWishlistItem, {});
  const { errors: err = {} } = state;

  useEffect(() => {
    if (state.ok) {
      onClose();
    }
  }, [state.ok, onClose]);

  const selectStyle =
    "w-full h-9 pl-3 pr-7 py-1.5 border border-[#e2dfd5] rounded-xl text-xs bg-white text-zinc-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg%20xmlns=\"http://www.w3.org/2000/svg\"%20width=\"16\"%20height=\"16\"%20fill=\"none\"%20stroke=\"%2371717a\"%20stroke-width=\"1.5\"%20viewBox=\"0 0 24 24\"><path%20stroke-linecap=\"round\"%20stroke-linejoin=\"round\"%20d=\"M6%209l6%206%206-6\"/></svg>')] bg-[length:13px] bg-[right_8px_center] bg-no-repeat focus:outline-none focus:border-[#183d2e] focus:ring-1 focus:ring-[#183d2e] transition cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        className="bg-white rounded-2xl border border-[#e6e4dc] shadow-xl w-full max-w-md p-5 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#edebe4] pb-3">
          <h3 className="text-sm font-bold text-zinc-900 font-display">Sửa mục tiêu mua sắm</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-sm p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {state.ok && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs">
            ✓ {state.message}
          </div>
        )}

        {state.error && (
          <div
            role="alert"
            className="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs"
          >
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-3 text-xs">
          <input type="hidden" name="id" value={item.id} />

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Tên món đồ</label>
            <input
              name="name"
              type="text"
              defaultValue={item.name}
              required
              className="w-full h-9 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
            />
            {err.name && <p className="text-[11px] text-rose-600">{err.name[0]}</p>}
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Giá tiền (đ)</label>
            <input
              name="price"
              type="number"
              min="1"
              step="1"
              defaultValue={item.price}
              required
              className="w-full h-9 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 placeholder:text-zinc-400 font-mono tabular-nums focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
            />
            {err.price && <p className="text-[11px] text-rose-600">{err.price[0]}</p>}
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Mức ưu tiên</label>
            <select
              name="priority"
              defaultValue={item.priority}
              className={selectStyle}
            >
              <option value="LOW">Ưu tiên: Thấp</option>
              <option value="MEDIUM">Ưu tiên: Vừa</option>
              <option value="HIGH">Ưu tiên: Cao</option>
            </select>
            {err.priority && (
              <p className="text-[11px] text-rose-600">{err.priority[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Đường dẫn tham khảo (URL)</label>
            <input
              name="link"
              type="text"
              defaultValue={item.link ?? ""}
              className="w-full h-9 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
            />
            {err.link && <p className="text-[11px] text-rose-600">{err.link[0]}</p>}
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Hạn chót dự kiến mua</label>
            <input
              name="targetDate"
              type="date"
              defaultValue={
                item.targetDate
                  ? new Date(item.targetDate).toISOString().slice(0, 10)
                  : ""
              }
              className="w-full h-9 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
            />
            {err.targetDate && (
              <p className="text-[11px] text-rose-600">{err.targetDate[0]}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#edebe4]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 h-8 rounded-xl border border-[#e2dfd5] hover:bg-zinc-50 text-zinc-700 font-medium transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-1.5 h-8 rounded-xl bg-[#183d2e] hover:bg-[#204e3b] disabled:bg-zinc-400 text-white font-medium transition shadow-2xs"
            >
              {pending ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
