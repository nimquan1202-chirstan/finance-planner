"use client";

import { useActionState } from "react";
import { deleteTransaction } from "./actions";

type DeleteState = { ok?: boolean; error?: string };

export function DeleteButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: DeleteState, formData: FormData): Promise<DeleteState> =>
      deleteTransaction(formData),
    {},
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Bạn có chắc chắn muốn xoá giao dịch này?")) {
          e.preventDefault();
        }
      }}
      className="inline-flex items-center gap-1.5"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-rose-600 border border-zinc-200 hover:border-rose-200 rounded-md transition cursor-pointer disabled:opacity-50"
        aria-label="Xoá giao dịch"
      >
        {pending ? "Đang xoá..." : "Xoá"}
      </button>
      {state.error && (
        <span role="alert" className="text-[11px] text-rose-600">
          {state.error}
        </span>
      )}
    </form>
  );
}
