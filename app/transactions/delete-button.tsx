"use client";

import { deleteTransaction } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteTransaction}
      onSubmit={(e) => {
        if (!confirm("Bạn có chắc chắn muốn xoá giao dịch này?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-rose-600 border border-zinc-200 hover:border-rose-200 rounded-md transition cursor-pointer"
        aria-label="Xoá giao dịch"
      >
        Xoá
      </button>
    </form>
  );
}
