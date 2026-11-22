"use client";

import { deleteTransaction } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteTransaction}
      onSubmit={(e) => {
        if (!confirm("Bạn có chắc chắn muốn xoá vĩnh viễn giao dịch này?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title="Xoá giao dịch"
        className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-md transition cursor-pointer"
        aria-label="Xoá giao dịch"
      >
        Xoá
      </button>
    </form>
  );
}
