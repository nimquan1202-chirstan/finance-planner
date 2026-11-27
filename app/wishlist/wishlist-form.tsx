"use client";

import { useActionState } from "react";
import { createWishlistItem } from "./actions";

export function WishlistForm() {
  const [state, formAction, pending] = useActionState(createWishlistItem, {});
  const { values: v = {}, errors: err = {} } = state;

  const selectStyle =
    "w-full h-9 pl-3 pr-7 py-1.5 border border-[#e2dfd5] rounded-xl text-xs bg-white text-zinc-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,<svg%20xmlns=\"http://www.w3.org/2000/svg\"%20width=\"16\"%20height=\"16\"%20fill=\"none\"%20stroke=\"%2371717a\"%20stroke-width=\"1.5\"%20viewBox=\"0 0 24 24\"><path%20stroke-linecap=\"round\"%20stroke-linejoin=\"round\"%20d=\"M6%209l6%206%206-6\"/></svg>')] bg-[length:13px] bg-[right_8px_center] bg-no-repeat focus:outline-none focus:border-[#183d2e] focus:ring-1 focus:ring-[#183d2e] transition cursor-pointer";

  return (
    <div className="bg-white border border-[#e6e4dc] rounded-2xl p-4 sm:p-5 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between border-b border-[#edebe4] pb-2.5">
        <h2 className="text-sm font-bold text-zinc-900 font-display">Muốn mua gì?</h2>
        <span className="text-[11px] text-zinc-400">Tự động tính % tiến độ theo số dư</span>
      </div>

      {state.ok && (
        <div
          role="status"
          className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between"
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
              placeholder="Tên món đồ (VD: Giày chạy bộ, Laptop...)"
              defaultValue={v.name}
              required
              className="w-full h-9 px-3 py-1.5 border border-[#e2dfd5] rounded-xl text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#183d2e] focus:ring-1 focus:ring-[#183d2e] transition"
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
              placeholder="Giá tiền (đ)"
              defaultValue={v.price}
              required
              className="w-full h-9 px-3 py-1.5 border border-[#e2dfd5] rounded-xl text-xs bg-white text-zinc-900 placeholder:text-zinc-400 tabular-nums font-sans focus:outline-none focus:border-[#183d2e] focus:ring-1 focus:ring-[#183d2e] transition"
            />
            {err.price && <p className="text-[11px] text-rose-600 mt-0.5">{err.price[0]}</p>}
          </div>

          {/* Mức ưu tiên */}
          <div className="sm:col-span-3">
            <select
              name="priority"
              defaultValue={v.priority ?? "MEDIUM"}
              className={selectStyle}
            >
              <option value="LOW">Ưu tiên: Thấp</option>
              <option value="MEDIUM">Ưu tiên: Vừa</option>
              <option value="HIGH">Ưu tiên: Cao</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-8">
            <input
              name="link"
              type="text"
              placeholder="Đường dẫn tham khảo (tuỳ chọn: https://...)"
              defaultValue={v.link}
              className="w-full h-9 px-3 py-1.5 border border-[#e2dfd5] rounded-xl text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#183d2e] focus:ring-1 focus:ring-[#183d2e] transition"
            />
          </div>
          <div className="sm:col-span-4 flex gap-2 items-center">
            <input
              name="targetDate"
              type="date"
              defaultValue={v.targetDate}
              title="Hạn chót dự kiến mua (tuỳ chọn)"
              className="w-full h-9 px-3 py-1.5 border border-[#e2dfd5] rounded-xl text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#183d2e] focus:ring-1 focus:ring-[#183d2e] transition"
            />
            <button
              type="submit"
              disabled={pending}
              className="px-4 h-9 rounded-xl bg-[#183d2e] hover:bg-[#204e3b] disabled:bg-zinc-400 text-white font-medium text-xs transition shrink-0 cursor-pointer shadow-2xs"
            >
              {pending ? "Đang lưu..." : "+ Thêm"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
