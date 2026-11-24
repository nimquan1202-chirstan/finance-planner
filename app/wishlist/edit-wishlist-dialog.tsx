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
}

interface EditWishlistDialogProps {
  item: WishlistItemType;
  onClose: () => void;
}

export function EditWishlistDialog({ item, onClose }: EditWishlistDialogProps) {
  const [state, formAction, pending] = useActionState(updateWishlistItem, {});

  useEffect(() => {
    if (state.ok) {
      onClose();
    }
  }, [state.ok, onClose]);

  const selectStyle =
    "w-full h-9 pl-3 pr-7 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg%20xmlns=\"http://www.w3.org/2000/svg\"%20width=\"16\"%20height=\"16\"%20fill=\"none\"%20stroke=\"%2371717a\"%20stroke-width=\"1.5\"%20viewBox=\"0 0 24 24\"><path%20stroke-linecap=\"round\"%20stroke-linejoin=\"round\"%20d=\"M6%209l6%206%206-6\"/></svg>')] bg-[length:13px] bg-[right_8px_center] bg-no-repeat focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs p-4">
      <div
        className="bg-white rounded-lg border border-zinc-200 shadow-xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h3 className="text-sm font-bold text-zinc-900">Sửa mục tiêu mua sắm</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-sm p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {state.ok && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs">
            ✓ {state.message}
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
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Đường dẫn tham khảo (URL)</label>
            <input
              name="link"
              type="text"
              defaultValue={item.link ?? ""}
              className="w-full h-9 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 h-8 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-1.5 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-medium transition"
            >
              {pending ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
