"use server";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

const budgetRuleSchema = z.object({
  needs: z.coerce.number().int().min(0).max(100),
  wants: z.coerce.number().int().min(0).max(100),
  savings: z.coerce.number().int().min(0).max(100),
}).refine((data) => data.needs + data.wants + data.savings === 100, {
  message: "Tổng 3 tỷ lệ Thiết yếu, Mong muốn và Tích lũy phải bằng đúng 100%",
  path: ["savings"],
});

export type BudgetRuleState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export async function updateBudgetRuleAction(
  _prev: BudgetRuleState,
  formData: FormData,
): Promise<BudgetRuleState> {
  const user = await requireUser();
  const needs = formData.get("needs");
  const wants = formData.get("wants");
  const savings = formData.get("savings");

  const parsed = budgetRuleSchema.safeParse({ needs, wants, savings });
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const firstErr =
      flat.fieldErrors.savings?.[0] ||
      flat.fieldErrors.needs?.[0] ||
      flat.fieldErrors.wants?.[0] ||
      "Tỷ lệ ngân sách không hợp lệ";
    return { ok: false, error: firstErr };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ruleNeedsPct: parsed.data.needs,
      ruleWantsPct: parsed.data.wants,
      ruleSavingsPct: parsed.data.savings,
    },
  });

  revalidatePath("/dashboard");
  return { ok: true, message: "Đã lưu tỷ lệ ngân sách mới thành công!" };
}
