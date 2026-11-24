"use client";

import { useActionState } from "react";
import { createWishlistItem } from "./actions";

export function WishlistForm() {
  const [state, formAction, pending] = useActionState(createWishlistItem, {});
  const { values: v = {}, errors: err = {} } = state;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
        <h2 className="text-sm font-bold text-zinc-900">Món đồ bạn đang mơ ước?</h2>
        <span className="text-[11px] text-zinc-400">Tự động tính % tích lũy theo số dư</span>
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
          {/* Tên món đồ */}
          <div className="sm:col-span-5">
            <input
              name="name"
              type="text"
              placeholder="Tên món đồ (VD: Laptop mới, Điện thoại...)"
              defaultValue={v.name}
              required
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            />
            {err.name && <p className="text-[11px] text-rose-600 mt-0.5">{err.name[0]}</p>}
          </div>

          {/* Giá tiền */}
          <div className="sm:col-span-4">
            <input
              name="price"
              type="number"
              min="1"
              step="1"
              placeholder="Giá tiền (VND)"
              defaultValue={v.price}
              required
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            />
            {err.price && <p className="text-[11px] text-rose-600 mt-0.5">{err.price[0]}</p>}
          </div>

          {/* Mức ưu tiên */}
          <div className="sm:col-span-3">
            <select
              name="priority"
              defaultValue={v.priority ?? "MEDIUM"}
              className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            >
              <option value="LOW">Ưu tiên: Thấp</option>
              <option value="MEDIUM">Ưu tiên: Vừa</option>
              <option value="HIGH">Ưu tiên: Cao</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <input
              name="link"
              type="text"
              placeholder="Đường dẫn tham khảo (tùy chọn: https://...)"
              defaultValue={v.link}
              className="w-full px-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-800 h-9"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-1.5 h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-medium text-xs transition shrink-0 cursor-pointer"
          >
            {pending ? "Đang lưu..." : "+ Thêm mục tiêu"}
          </button>
        </div>
      </form>
    </div>
  );
}
