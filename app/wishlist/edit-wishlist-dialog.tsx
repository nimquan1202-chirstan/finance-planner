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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        className="bg-white rounded-2xl border border-zinc-200 shadow-xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <h3 className="text-sm font-bold text-zinc-900">Chỉnh sửa mục tiêu mua sắm</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 text-sm p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {state.ok && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
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
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Giá tiền (VND)</label>
            <input
              name="price"
              type="number"
              min="1"
              step="1"
              defaultValue={item.price}
              required
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Mức ưu tiên</label>
            <select
              name="priority"
              defaultValue={item.priority}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
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
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-medium"
            >
              {pending ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
