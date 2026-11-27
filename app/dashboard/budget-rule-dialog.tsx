"use client";

import { useState, useActionState, useEffect } from "react";
import { updateBudgetRuleAction, type BudgetRuleState } from "./actions";

interface BudgetRuleDialogProps {
  currentNeeds: number;
  currentWants: number;
  currentSavings: number;
}

export function BudgetRuleDialog({
  currentNeeds,
  currentWants,
  currentSavings,
}: BudgetRuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [needs, setNeeds] = useState(currentNeeds);
  const [wants, setWants] = useState(currentWants);
  const [savings, setSavings] = useState(currentSavings);

  const [state, formAction, isPending] = useActionState<BudgetRuleState, FormData>(
    updateBudgetRuleAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
    }
  }, [state.ok]);

  const total = Number(needs) + Number(wants) + Number(savings);
  const isValid = total === 100;

  function applyPreset(n: number, w: number, s: number) {
    setNeeds(n);
    setWants(w);
    setSavings(s);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNeeds(currentNeeds);
          setWants(currentWants);
          setSavings(currentSavings);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100/80 hover:bg-zinc-200/70 rounded-[8px] transition cursor-pointer"
        title="Tùy chỉnh tỷ lệ ngân sách"
      >
        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Tùy chỉnh tỷ lệ</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md bg-white border border-[#e6e4dc] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 font-display">Tùy chỉnh tỷ lệ ngân sách</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Đặt tỷ lệ phù hợp với mục tiêu tài chính của bạn</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Gợi ý mẫu nhanh */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-zinc-400 mr-1">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => applyPreset(50, 30, 20)}
                className="px-2 py-0.5 rounded-md border border-[#e2dfd5] bg-zinc-50 hover:bg-[#edf4ef] hover:border-[#c8decb] text-zinc-700 hover:text-[#183d2e] transition"
              >
                50/30/20
              </button>
              <button
                type="button"
                onClick={() => applyPreset(60, 20, 20)}
                className="px-2 py-0.5 rounded-md border border-[#e2dfd5] bg-zinc-50 hover:bg-[#edf4ef] hover:border-[#c8decb] text-zinc-700 hover:text-[#183d2e] transition"
              >
                60/20/20 (Tiết kiệm)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(40, 30, 30)}
                className="px-2 py-0.5 rounded-md border border-[#e2dfd5] bg-zinc-50 hover:bg-[#edf4ef] hover:border-[#c8decb] text-zinc-700 hover:text-[#183d2e] transition"
              >
                40/30/30 (Đầu tư)
              </button>
            </div>

            <form action={formAction} className="space-y-4 text-xs">
              {state.error && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {state.error}
                </div>
              )}

              <div className="space-y-3">
                {/* Thiết yếu */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#1f4e3b]"></span>
                      Thiết yếu (Ăn uống, Nhà ở, Hóa đơn)
                    </label>
                    <span className="font-bold tabular-nums text-zinc-900">{needs}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={needs}
                    onChange={(e) => setNeeds(Number(e.target.value))}
                    className="w-full accent-[#1f4e3b]"
                  />
                  <input type="hidden" name="needs" value={needs} />
                </div>

                {/* Mong muốn */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#cf6b34]"></span>
                      Mong muốn (Mua sắm, Giải trí)
                    </label>
                    <span className="font-bold tabular-nums text-zinc-900">{wants}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={wants}
                    onChange={(e) => setWants(Number(e.target.value))}
                    className="w-full accent-[#cf6b34]"
                  />
                  <input type="hidden" name="wants" value={wants} />
                </div>

                {/* Tích lũy */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2b6cb0]"></span>
                      Tích lũy & Đầu tư
                    </label>
                    <span className="font-bold tabular-nums text-zinc-900">{savings}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    value={savings}
                    onChange={(e) => setSavings(Number(e.target.value))}
                    className="w-full accent-[#2b6cb0]"
                  />
                  <input type="hidden" name="savings" value={savings} />
                </div>
              </div>

              {/* Tổng cộng & Cảnh báo */}
              <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                isValid
                  ? "bg-[#eaf1ec] border-[#c8decb] text-[#183d2e]"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}>
                <span>Tổng 3 tỷ lệ:</span>
                <span className="font-bold tabular-nums">
                  {total}% {isValid ? "✓ Chuẩn" : "(Cần điều chỉnh về 100%)"}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3.5 py-1.5 rounded-[8px] border border-[#e2dfd5] hover:bg-zinc-100 text-zinc-700 font-medium text-xs transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!isValid || isPending}
                  className="px-4 py-1.5 rounded-[8px] bg-[#183d2e] hover:bg-[#204e3b] disabled:opacity-50 text-white font-semibold text-xs transition shadow-2xs"
                >
                  {isPending ? "Đang lưu..." : "Lưu tỷ lệ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
